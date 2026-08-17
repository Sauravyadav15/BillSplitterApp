// frontend/src/pages/AddBillPage.jsx

import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactCrop, { centerCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { getGroup } from '../api/groups';
import { parseReceipt, createBill } from '../api/bills';
import { getCroppedImageFile } from '../utils/cropImage';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import ReceiptItemsTable from '../components/ReceiptItemsTable';
import PurchaseDateModal from '../components/PurchaseDateModal';
import ImageLightbox from '../components/ImageLightbox';

let localIdCounter = 0;
function nextLocalId() {
  localIdCounter += 1;
  return `local-${localIdCounter}`;
}

// A crop can't be made taller than this multiple of its own width. Past
// that, the backend has to shrink the image hard to fit under PaddleOCR's
// max input size, which is exactly what caused long receipts to lose items
// (see ocr_receipt.py's MAX_DIMENSION downscale). Rather than asking users to
// judge "is this receipt too long for one photo?", the crop box itself just
// won't grow past a height that stays legible - a longer receipt means
// cropping a shorter first section here and using "Scan another part" for
// the rest.
const MAX_CROP_HEIGHT_RATIO = 2.2;

function clampCropHeight(pixelCrop) {
  if (!pixelCrop) return pixelCrop;
  const maxHeight = pixelCrop.width * MAX_CROP_HEIGHT_RATIO;
  if (pixelCrop.height <= maxHeight) return pixelCrop;
  return { ...pixelCrop, height: maxHeight };
}

// Defaults to the full image (freeform width, height capped per
// clampCropHeight) rather than a pre-shrunk box - a photo of a real receipt
// is rarely photographed perfectly straight, and even a small tilt means a
// crop that starts a few percent in from every edge can already be slicing
// into the leftmost characters of item names or the last digit of a price
// (verified: this silently broke OCR on a real receipt photo, dropping
// items whose price no longer matched a full "X.XX" pattern). Starting at
// the full image guarantees nothing is clipped before the user even sees
// it; they can still drag inward from there to trim background.
function defaultCrop(displayWidth, displayHeight) {
  const height = Math.min(displayHeight, displayWidth * MAX_CROP_HEIGHT_RATIO);
  return centerCrop({ unit: 'px', width: displayWidth, height }, displayWidth, displayHeight);
}

export default function AddBillPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const imgRef = useRef(null);
  const additionalFileInputRef = useRef(null);

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Gates the entire rest of the page - null means "not answered yet". The
  // receipt is often scanned days after the purchase, so this can't just be
  // assumed from today's date the way created_at is.
  const [purchaseDate, setPurchaseDate] = useState(null);
  const [showDateModal, setShowDateModal] = useState(true);

  // The originally-selected file, shown inside the cropper.
  const [rawPreviewUrl, setRawPreviewUrl] = useState(null);
  const [crop, setCrop] = useState();
  const [showCropper, setShowCropper] = useState(false);
  const [cropping, setCropping] = useState(false);
  // True while cropping/scanning an extra photo of the same (long) receipt -
  // it gets appended as another part instead of starting the bill over.
  const [isAdditionalScan, setIsAdditionalScan] = useState(false);

  // Every cropped photo that makes up this bill, in order - most bills have
  // just one, but a long receipt split across "Scan another part" photos
  // ends up with several. All of them get uploaded and saved with the bill.
  const [imageParts, setImageParts] = useState([]);

  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(null);

  const [items, setItems] = useState([]);
  const [receiptSubtotal, setReceiptSubtotal] = useState(null);
  const [receiptTotal, setReceiptTotal] = useState(null);
  const [receiptTip, setReceiptTip] = useState(null);

  // Which cropped photo (by previewUrl) is open in the full-screen preview -
  // null when closed. Lets the user zoom into the receipt to check it
  // against the scan when the mismatch banners below fire.
  const [previewUrl, setPreviewUrl] = useState(null);

  // Bill-level charges that aren't purchasable items - tax, a venue fee, a
  // surcharge (see receiptParser.js's CHARGE_LABEL_PATTERN, which is what
  // keeps these off the item list in the first place when scanned). Always
  // split equally across every contributor on the bill; the user can also
  // add/edit/remove rows by hand for anything OCR didn't catch or mislabeled.
  const [extraCharges, setExtraCharges] = useState([]);
  // Only ever populated when a scan actually finds a tip line - grocery
  // receipts never have one, so there's nothing to ask about by default.
  const [tipAmount, setTipAmount] = useState('');
  const [tipSplitMode, setTipSplitMode] = useState(null); // 'equal' | 'individual'
  const [tipPaidBy, setTipPaidBy] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoadingMembers(true);
      setLoadError(null);
      try {
        const data = await getGroup(groupId);
        setMembers(data.members);
      } catch (err) {
        setLoadError(err.response?.data?.error || 'Failed to load group members');
      } finally {
        setLoadingMembers(false);
      }
    })();
  }, [groupId]);

  const allMemberIds = members.map((m) => m.id);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsAdditionalScan(false);
    setRawPreviewUrl(URL.createObjectURL(file));
    setCrop(undefined);
    setShowCropper(true);
    setImageParts([]);
    setItems([]);
    setReceiptSubtotal(null);
    setReceiptTotal(null);
    setReceiptTip(null);
    setExtraCharges([]);
    setTipAmount('');
    setTipSplitMode(null);
    setTipPaidBy('');
  };

  // For a long receipt split across multiple photos: crops and scans another
  // photo the same way, but leaves the bill's main image and already-scanned
  // items alone - this photo's items just get appended to that list.
  const handleAdditionalFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsAdditionalScan(true);
    setRawPreviewUrl(URL.createObjectURL(file));
    setCrop(undefined);
    setShowCropper(true);
    e.target.value = '';
  };

  const onCropImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    setCrop(defaultCrop(width, height));
  };

  const rescanAllParts = async () => {
    setItems([]);
    setExtraCharges([]);
    setReceiptSubtotal(null);
    setReceiptTotal(null);
    setReceiptTip(null);
    for (const part of imageParts) {
      // Sequential, not parallel - keeps items in the same order across runs.
      await runScan(part.file);
    }
  };

  const runScan = async (fileToScan) => {
    setScanError(null);
    setScanning(true);
    try {
      const data = await parseReceipt(groupId, fileToScan);
      const scannedItems = data.items.map((it) => ({
        localId: nextLocalId(),
        name: it.name,
        price: it.price,
        unit_note: it.unit_note || null,
        contributor_ids: [...allMemberIds],
      }));
      setItems((prev) => [...prev, ...scannedItems]);
      if (data.extra_charges?.length > 0) {
        const scannedCharges = data.extra_charges.map((c) => ({
          localId: nextLocalId(),
          name: c.name,
          amount: String(c.price),
        }));
        setExtraCharges((prev) => [...prev, ...scannedCharges]);
      }
      // Only overwrite when this scan actually found a subtotal/total/tip
      // line - with a long receipt split across photos, these only appear
      // on whichever photo shows the bottom of the receipt, so a later
      // photo without one shouldn't blank out what an earlier photo found.
      if (data.receipt_subtotal != null) {
        setReceiptSubtotal(data.receipt_subtotal);
      }
      if (data.receipt_total != null) {
        setReceiptTotal(data.receipt_total);
      }
      if (data.receipt_tip != null) {
        setReceiptTip(data.receipt_tip);
        setTipAmount((prev) => (prev === '' ? String(data.receipt_tip) : prev));
      }
    } catch (err) {
      setScanError(err.response?.data?.error || 'Failed to scan receipt');
    } finally {
      setScanning(false);
    }
  };

  const handleConfirmCrop = async () => {
    if (!imgRef.current || !crop) return;
    setCropping(true);
    try {
      const croppedFile = await getCroppedImageFile(imgRef.current, crop);
      setShowCropper(false);
      setImageParts((prev) => [
        ...prev,
        { localId: nextLocalId(), file: croppedFile, previewUrl: URL.createObjectURL(croppedFile) },
      ]);
      await runScan(croppedFile);
      setIsAdditionalScan(false);
    } finally {
      setCropping(false);
    }
  };

  const handleConfirmDate = (date) => {
    setPurchaseDate(date);
    setShowDateModal(false);
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { localId: nextLocalId(), name: '', price: '', unit_note: null, contributor_ids: [...allMemberIds] },
    ]);
  };

  const handleAddCharge = () => {
    setExtraCharges((prev) => [...prev, { localId: nextLocalId(), name: '', amount: '' }]);
  };

  const handleChargeChange = (localId, patch) => {
    setExtraCharges((prev) => prev.map((c) => (c.localId === localId ? { ...c, ...patch } : c)));
  };

  const handleDeleteCharge = (localId) => {
    setExtraCharges((prev) => prev.filter((c) => c.localId !== localId));
  };

  const runningTotal = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
  // The receipt's own printed subtotal (pre-tax, since bill_items never
  // include a tax line) - when OCR misses items, this catches it even
  // though the parser itself has no way to know it dropped anything.
  const subtotalMismatch =
    receiptSubtotal != null && Math.abs(runningTotal - receiptSubtotal) > 0.05;

  // Only asked about at all when a scan actually found a tip line.
  const tipDetected = receiptTip != null && Number(tipAmount) > 0;
  const extraChargesTotal = extraCharges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const tipNum = Number(tipAmount) || 0;
  // What was actually paid in total - subtotal + additional charges + tip,
  // regardless of who's covering the tip. This is compared against the
  // receipt's own printed total, same spirit as subtotalMismatch above; the
  // tip-split choice below only affects who owes what, not this comparison.
  const computedTotal = runningTotal + extraChargesTotal + tipNum;
  const totalMismatch = receiptTotal != null && Math.abs(computedTotal - receiptTotal) > 0.05;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (imageParts.length === 0) {
      setSubmitError('Please select and crop a receipt image');
      return;
    }
    if (items.length === 0) {
      setSubmitError('Add at least one item');
      return;
    }
    for (const it of items) {
      if (!it.name.trim()) {
        setSubmitError('Every item needs a name');
        return;
      }
      // A scanned return/adjustment line is a legitimate negative price
      // (see PRICE_AT_END in receiptParser.js) - only reject non-numbers
      // and exactly zero, not negative amounts.
      if (!Number.isFinite(Number(it.price)) || Number(it.price) === 0) {
        setSubmitError(`Invalid price for "${it.name}"`);
        return;
      }
      if (it.contributor_ids.length === 0) {
        setSubmitError(`"${it.name}" needs at least one contributor`);
        return;
      }
    }
    for (const charge of extraCharges) {
      if (!charge.name.trim()) {
        setSubmitError('Every additional charge needs a name');
        return;
      }
      if (!Number.isFinite(Number(charge.amount)) || Number(charge.amount) === 0) {
        setSubmitError(`Invalid amount for "${charge.name}"`);
        return;
      }
    }
    if (tipDetected && !tipSplitMode) {
      setSubmitError('Choose how to split the tip before submitting');
      return;
    }
    if (tipSplitMode === 'individual' && !tipPaidBy) {
      setSubmitError('Choose who covered the tip');
      return;
    }

    setSubmitting(true);
    try {
      const payload = items.map(({ name, price, unit_note, contributor_ids }) => ({
        name,
        price: Number(price),
        unit_note: unit_note || null,
        contributor_ids,
      }));
      const chargesPayload = extraCharges.map(({ name, amount }) => ({
        name,
        amount: Number(amount),
      }));
      const data = await createBill(groupId, {
        imageFiles: imageParts.map((part) => part.file),
        items: payload,
        purchaseDate,
        extraCharges: chargesPayload,
        tipAmount: tipDetected ? tipNum : 0,
        tipPaidBy: tipDetected && tipSplitMode === 'individual' ? tipPaidBy : null,
      });
      navigate(`/groups/${groupId}/bills/${data.bill.id}`);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to create bill');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMembers) return <LoadingSpinner />;

  if (showDateModal) {
    return <PurchaseDateModal onConfirm={handleConfirmDate} />;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
      <Link to={`/groups/${groupId}`} className="btn btn-secondary mb-4 !px-4 !py-2 text-sm">
        &larr; Back to group
      </Link>
      <h1 className="mb-6">Add Bill</h1>
      <ErrorBanner message={loadError} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="card mx-auto w-full max-w-xl p-6">
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3.5 py-2.5 text-sm">
            <span className="text-text">
              Purchased on{' '}
              <span className="font-semibold text-ink">
                {new Date(`${purchaseDate}T00:00:00`).toLocaleDateString(undefined, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </span>
            <button type="button" className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => setShowDateModal(true)}>
              Change
            </button>
          </div>

          <label className="field-label" htmlFor="receipt-image">
            Receipt image
          </label>
          <input id="receipt-image" className="input" type="file" accept="image/*" onChange={handleFileChange} />

          {showCropper && rawPreviewUrl && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-text">
                {isAdditionalScan
                  ? "Crop this next part of the receipt, then confirm - its items will be added to the list below."
                  : 'Drag the corners to trim out the background, then confirm - a tighter crop scans more accurately.'}
              </p>
              <ReactCrop crop={crop} onChange={(pixelCrop) => setCrop(clampCropHeight(pixelCrop))}>
                <img
                  ref={imgRef}
                  src={rawPreviewUrl}
                  alt="Receipt to crop"
                  onLoad={onCropImageLoad}
                  className="max-h-[500px] max-w-full rounded-lg"
                />
              </ReactCrop>
              <button type="button" onClick={handleConfirmCrop} disabled={cropping || !crop} className="btn btn-primary mt-4">
                {cropping ? 'Cropping...' : 'Confirm Crop & Scan'}
              </button>
            </div>
          )}

          {imageParts.length > 0 && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-3">
                {imageParts.map((part, index) => (
                  <div key={part.localId} className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewUrl(part.previewUrl)}
                      className="block cursor-zoom-in"
                      aria-label={`Preview receipt part ${index + 1}`}
                    >
                      <img
                        className="block h-[130px] w-[130px] rounded-xl border border-border object-cover shadow-[var(--shadow-md)]"
                        src={part.previewUrl}
                        alt={`Receipt part ${index + 1}`}
                      />
                    </button>
                    <span className="text-xs font-semibold text-muted">Part {index + 1}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" onClick={rescanAllParts} disabled={scanning} className="btn btn-secondary">
                  {scanning ? 'Scanning...' : 'Re-scan All Photos'}
                </button>
                <button
                  type="button"
                  onClick={() => additionalFileInputRef.current?.click()}
                  disabled={scanning}
                  className="btn btn-secondary"
                >
                  + Scan another part
                </button>
              </div>
              <p className="mt-2 text-xs text-muted">
                Long receipt that didn't fit in one photo? Scan the rest in parts - each photo's items get added to the
                list below.
              </p>
              <input
                ref={additionalFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAdditionalFileChange}
              />
              {scanning && <LoadingSpinner message="Scanning receipt for items - this can take up to 15 seconds..." />}
              <ErrorBanner message={scanError} />
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="mb-4">Items</h2>
          <ReceiptItemsTable items={items} members={members} onChange={setItems} />
          <button type="button" className="btn btn-secondary mt-4" onClick={handleAddItem}>
            + Add Item
          </button>

          {subtotalMismatch && (
            <div className="my-2.5 flex items-center gap-2 rounded-lg border border-gold-soft-border bg-gold-soft px-3.5 py-2.5 text-sm font-medium text-gold [animation:fade-in_0.25s_ease]">
              <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-gold text-[11px] font-bold text-gold-contrast">
                !
              </span>
              Items add up to ${runningTotal.toFixed(2)}, but the receipt's subtotal is ${receiptSubtotal.toFixed(2)}.
              The scan may have missed some items - check against the photo before submitting.
            </div>
          )}

          {/* Totals - separate from the item list above: additional charges
              and tip aren't tied to any one item, so they're entered here
              and compared against the receipt's own printed total. */}
          <div className="mt-6 border-t border-border pt-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">Totals</h3>

            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-text">Subtotal (items)</span>
              <span className="font-medium text-ink">${runningTotal.toFixed(2)}</span>
            </div>

            {/* Grey box: everything that isn't a purchasable item - tax,
                fees, surcharges (auto-detected from the scan, or added by
                hand), plus tip. Kept visually distinct from the item list
                above so it reads as "charges on the bill", not "things
                someone ordered". */}
            <div className="my-2 flex flex-col gap-2 rounded-lg bg-surface-2 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Additional charges</p>

              {extraCharges.length === 0 && (
                <p className="text-xs text-muted">
                  None found on the scan - tax, fees, or surcharges can be added below if the receipt has any.
                </p>
              )}

              {extraCharges.map((charge) => (
                <div key={charge.localId} className="flex items-center gap-2">
                  <input
                    type="text"
                    className="input !py-1.5 text-sm"
                    placeholder="Name (e.g. Tax)"
                    value={charge.name}
                    onChange={(e) => handleChargeChange(charge.localId, { name: e.target.value })}
                  />
                  <input
                    type="number"
                    step="0.01"
                    className="input !w-24 !py-1.5 text-right text-sm"
                    placeholder="0.00"
                    value={charge.amount}
                    onChange={(e) => handleChargeChange(charge.localId, { amount: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost !p-1.5 shrink-0 text-muted"
                    aria-label="Remove charge"
                    onClick={() => handleDeleteCharge(charge.localId)}
                  >
                    ✕
                  </button>
                </div>
              ))}

              <button type="button" className="btn btn-secondary self-start !px-3 !py-1.5 text-xs" onClick={handleAddCharge}>
                + Add Charge
              </button>

              {receiptTip != null && (
                <div className="mt-1 border-t border-border pt-2">
                  <label className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text">
                      Tip <span className="text-xs text-muted">(found on receipt)</span>
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input !w-24 !py-1.5 text-right text-sm"
                      value={tipAmount}
                      onChange={(e) => setTipAmount(e.target.value)}
                    />
                  </label>

                  {tipDetected && (
                    <div className="mt-2 flex flex-col gap-2 rounded-lg bg-surface p-3">
                      <p className="text-xs text-text">How should the ${tipNum.toFixed(2)} tip be handled?</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setTipSplitMode('equal');
                            setTipPaidBy('');
                          }}
                          className={`btn !px-3 !py-1.5 text-xs ${tipSplitMode === 'equal' ? 'btn-primary' : 'btn-secondary'}`}
                        >
                          Split equally
                        </button>
                        <button
                          type="button"
                          onClick={() => setTipSplitMode('individual')}
                          className={`btn !px-3 !py-1.5 text-xs ${tipSplitMode === 'individual' ? 'btn-primary' : 'btn-secondary'}`}
                        >
                          One person covered it
                        </button>
                      </div>
                      {tipSplitMode === 'individual' && (
                        <select
                          className="input !py-1.5 text-sm"
                          value={tipPaidBy}
                          onChange={(e) => setTipPaidBy(e.target.value)}
                        >
                          <option value="">Who paid the tip?</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {totalMismatch && (
              <div className="my-2.5 flex items-center gap-2 rounded-lg border border-gold-soft-border bg-gold-soft px-3.5 py-2.5 text-sm font-medium text-gold [animation:fade-in_0.25s_ease]">
                <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-gold text-[11px] font-bold text-gold-contrast">
                  !
                </span>
                Subtotal + additional charges + tip comes to ${computedTotal.toFixed(2)}, but the receipt's total is $
                {receiptTotal.toFixed(2)}. Double check the charges/tip against the photo before submitting.
              </div>
            )}

            <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
              <p className="text-text">Total</p>
              <p className="text-gradient font-heading text-2xl font-semibold">${computedTotal.toFixed(2)}</p>
            </div>
          </div>

          <ErrorBanner message={submitError} />
          <button type="submit" disabled={submitting} className="btn btn-primary mt-4 w-full">
            {submitting ? 'Submitting...' : 'Submit Bill'}
          </button>
        </div>
      </form>

      {previewUrl && <ImageLightbox src={previewUrl} alt="Receipt" onClose={() => setPreviewUrl(null)} />}
    </div>
  );
}
