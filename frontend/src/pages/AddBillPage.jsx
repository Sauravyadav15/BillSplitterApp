// frontend/src/pages/AddBillPage.jsx

import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactCrop, { centerCrop, convertToPixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { getGroup } from '../api/groups';
import { parseReceipt, createBill } from '../api/bills';
import { getCroppedImageFile } from '../utils/cropImage';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import ReceiptItemsTable from '../components/ReceiptItemsTable';

let localIdCounter = 0;
function nextLocalId() {
  localIdCounter += 1;
  return `local-${localIdCounter}`;
}

// A crop that trims 5% off each edge by default (freeform, no fixed aspect) -
// a sensible starting point, the user drags the handles from there to trim
// out background.
function defaultCrop(displayWidth, displayHeight) {
  return centerCrop({ unit: '%', width: 90, height: 90 }, displayWidth, displayHeight);
}

export default function AddBillPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const imgRef = useRef(null);

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // The originally-selected file, shown inside the cropper.
  const [rawPreviewUrl, setRawPreviewUrl] = useState(null);
  const [crop, setCrop] = useState();
  const [showCropper, setShowCropper] = useState(false);
  const [cropping, setCropping] = useState(false);

  // The final (cropped) file - what actually gets scanned/submitted.
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(null);

  const [items, setItems] = useState([]);

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
    setRawPreviewUrl(URL.createObjectURL(file));
    setCrop(undefined);
    setShowCropper(true);
    setImageFile(null);
    setImagePreviewUrl(null);
    setItems([]);
  };

  const onCropImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    setCrop(defaultCrop(width, height));
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
      // crop may still be in '%' units (e.g. if the user never dragged the
      // default box) - cropToCanvas needs pixel units against the displayed
      // image size specifically.
      const pixelCrop =
        crop.unit === '%'
          ? convertToPixelCrop(crop, imgRef.current.width, imgRef.current.height)
          : crop;
      const croppedFile = await getCroppedImageFile(imgRef.current, pixelCrop);
      setImageFile(croppedFile);
      setImagePreviewUrl(URL.createObjectURL(croppedFile));
      setShowCropper(false);
      await runScan(croppedFile);
    } finally {
      setCropping(false);
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { localId: nextLocalId(), name: '', price: '', unit_note: null, contributor_ids: [...allMemberIds] },
    ]);
  };

  const runningTotal = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!imageFile) {
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
      if (!(Number(it.price) > 0)) {
        setSubmitError(`Invalid price for "${it.name}"`);
        return;
      }
      if (it.contributor_ids.length === 0) {
        setSubmitError(`"${it.name}" needs at least one contributor`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = items.map(({ name, price, unit_note, contributor_ids }) => ({
        name,
        price: Number(price),
        unit_note: unit_note || null,
        contributor_ids,
      }));
      const data = await createBill(groupId, { imageFile, items: payload });
      navigate(`/groups/${groupId}/bills/${data.bill.id}`);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to create bill');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMembers) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
      <Link to={`/groups/${groupId}`} className="btn btn-secondary mb-4 !px-4 !py-2 text-sm">
        &larr; Back to group
      </Link>
      <h1 className="mb-6">Add Bill</h1>
      <ErrorBanner message={loadError} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="card mx-auto w-full max-w-xl p-6">
          <label className="field-label" htmlFor="receipt-image">
            Receipt image
          </label>
          <input id="receipt-image" className="input" type="file" accept="image/*" onChange={handleFileChange} />

          {showCropper && rawPreviewUrl && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-text">
                Drag the corners to trim out the background, then confirm - a tighter crop scans more accurately.
              </p>
              <ReactCrop crop={crop} onChange={(c) => setCrop(c)}>
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

          {imagePreviewUrl && (
            <div className="mt-4">
              <img
                className="block max-w-[260px] rounded-xl border border-border shadow-[var(--shadow-md)]"
                src={imagePreviewUrl}
                alt="Cropped receipt preview"
              />
              <button type="button" onClick={() => runScan(imageFile)} disabled={scanning} className="btn btn-secondary mt-3">
                {scanning ? 'Scanning...' : 'Re-scan Receipt'}
              </button>
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

          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <p className="text-text">Running total</p>
            <p className="text-gradient font-heading text-2xl font-semibold">${runningTotal.toFixed(2)}</p>
          </div>

          <ErrorBanner message={submitError} />
          <button type="submit" disabled={submitting} className="btn btn-primary mt-4 w-full">
            {submitting ? 'Submitting...' : 'Submit Bill'}
          </button>
        </div>
      </form>
    </div>
  );
}
