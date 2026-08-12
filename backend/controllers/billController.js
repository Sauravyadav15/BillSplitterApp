// backend/controllers/billController.js

const fs = require('fs');
const pool = require('../config/db');
const { splitItemPrice } = require('../utils/splitCalculator');
const { extractTextFromImage } = require('../utils/receiptOcr');
const { parseReceiptLines, extractSubtotal, extractTotal, extractTip } = require('../utils/receiptParser');

// POST /groups/:groupId/bills - create a bill with items + per-item contributors
const createBill = async (req, res) => {
  const client = await pool.connect();

  try {
    const groupId = req.params.groupId;
    const userId = req.user.userId;

    // 1. Require at least one receipt image (a long receipt may be split
    // across several - see AddBillPage's "Scan another part")
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'A receipt image is required' });
    }
    const unlinkAllFiles = () => {
      for (const file of req.files) fs.unlink(file.path, () => {});
    };

    // 2. Parse the items JSON string sent alongside the files
    let items;
    try {
      items = JSON.parse(req.body.items);
    } catch (parseErr) {
      unlinkAllFiles();
      return res.status(400).json({ error: 'items must be valid JSON' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      unlinkAllFiles();
      return res.status(400).json({ error: 'items must be a non-empty array' });
    }

    // purchase_date is required - AddBillPage prompts for it up front, since
    // the day a receipt is scanned/added is often not the day the purchase
    // actually happened. Validated as a real calendar date in billRoutes.js.
    const purchaseDate = req.body.purchase_date;

    // Additional charges (tax, venue fees, surcharges, ...) - bill-level,
    // not tied to any one item, so they're a separate named list rather
    // than items themselves (see receiptParser.js's CHARGE_LABEL_PATTERN,
    // which is what keeps these off the item list in the first place when
    // scanned). Always split equally among the bill's distinct contributors
    // (see bill_charges below) - unlike tip, there's no personal-payer
    // option for these. Defaults to none so a bill with no such line on the
    // receipt doesn't need special-casing.
    let extraCharges = [];
    if (req.body.extra_charges != null && req.body.extra_charges !== '') {
      try {
        extraCharges = JSON.parse(req.body.extra_charges);
      } catch (parseErr) {
        unlinkAllFiles();
        return res.status(400).json({ error: 'extra_charges must be valid JSON' });
      }
      if (!Array.isArray(extraCharges)) {
        unlinkAllFiles();
        return res.status(400).json({ error: 'extra_charges must be an array' });
      }
      for (const charge of extraCharges) {
        if (!charge.name || typeof charge.name !== 'string') {
          unlinkAllFiles();
          return res.status(400).json({ error: 'Each additional charge requires a name' });
        }
        const amount = Number(charge.amount);
        if (!Number.isFinite(amount) || amount === 0) {
          unlinkAllFiles();
          return res.status(400).json({ error: `Invalid amount for charge "${charge.name}"` });
        }
      }
    }

    // Tip is optional and, unlike tax, can be excluded from the shared
    // split entirely: tip_paid_by set means one specific member covered it
    // themselves (e.g. cash, separate from the group's card), so it's never
    // added to total_amount or bill_charges - nobody owes it back.
    const tipAmount = req.body.tip_amount != null && req.body.tip_amount !== '' ? Number(req.body.tip_amount) : 0;
    if (!Number.isFinite(tipAmount) || tipAmount < 0) {
      unlinkAllFiles();
      return res.status(400).json({ error: 'tip_amount must be a non-negative number' });
    }
    // Normalized so a stray tip_paid_by can't linger against a zero tip and
    // confuse the "X covered the tip" display later.
    const tipPaidBy = tipAmount > 0 ? req.body.tip_paid_by || null : null;

    // 3. Validate each item's shape
    for (const item of items) {
      if (!item.name || typeof item.name !== 'string') {
        unlinkAllFiles();
        return res.status(400).json({ error: 'Each item requires a name' });
      }
      // A scanned return/adjustment line is a legitimate negative price (see
      // PRICE_AT_END in receiptParser.js) - only reject non-numbers and
      // exactly zero, not negative amounts.
      const price = Number(item.price);
      if (!Number.isFinite(price) || price === 0) {
        unlinkAllFiles();
        return res.status(400).json({ error: `Invalid price for item "${item.name}"` });
      }
      if (!Array.isArray(item.contributor_ids) || item.contributor_ids.length === 0) {
        unlinkAllFiles();
        return res.status(400).json({ error: `Item "${item.name}" needs at least one contributor` });
      }
    }

    // 4. Confirm every contributor_id is actually a member of this group
    const membersResult = await pool.query(
      'SELECT user_id FROM group_members WHERE group_id = $1',
      [groupId]
    );
    const memberIds = new Set(membersResult.rows.map((row) => row.user_id));

    for (const item of items) {
      for (const contributorId of item.contributor_ids) {
        if (!memberIds.has(contributorId)) {
          unlinkAllFiles();
          return res.status(400).json({
            error: `Contributor ${contributorId} is not a member of this group`,
          });
        }
      }
    }

    if (tipPaidBy && !memberIds.has(tipPaidBy)) {
      unlinkAllFiles();
      return res.status(400).json({ error: 'tip_paid_by must be a member of this group' });
    }

    // 5. Compute shares + total in memory before touching the DB. The first
    // uploaded image is the bill's cover photo (list/gallery thumbnails);
    // every image gets its own bill_images row for the detail view.
    const imageUrls = req.files.map((file) => `/uploads/${file.filename}`);
    const imageUrl = imageUrls[0];
    let itemsSubtotalCents = 0;
    const itemsWithShares = items.map((item) => {
      const price = Number(item.price).toFixed(2);
      itemsSubtotalCents += Math.round(Number(price) * 100);
      return {
        name: item.name,
        price,
        unit_note: item.unit_note || null,
        shares: splitItemPrice(price, item.contributor_ids),
      };
    });

    // Every contributor across every item on this bill - additional charges
    // and a shared tip aren't tied to any one item, so they're split
    // equally across this whole set instead (see bill_charges).
    const distinctContributorIds = [...new Set(items.flatMap((item) => item.contributor_ids))];
    const extraChargesCents = extraCharges.reduce((sum, c) => sum + Math.round(Number(c.amount) * 100), 0);
    const sharedTipAmount = tipPaidBy ? 0 : tipAmount;
    const sharedExtraAmount = extraChargesCents / 100 + sharedTipAmount;
    const totalAmount = (itemsSubtotalCents / 100 + sharedExtraAmount).toFixed(2);

    // 6. Insert bill, items, and contributor shares in one transaction
    await client.query('BEGIN');

    const billResult = await client.query(
      `INSERT INTO bills (group_id, added_by, image_url, total_amount, tip_amount, tip_paid_by, purchase_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [groupId, userId, imageUrl, totalAmount, tipAmount.toFixed(2), tipPaidBy, purchaseDate]
    );
    const bill = billResult.rows[0];

    const responseExtraCharges = [];
    for (const charge of extraCharges) {
      const chargeResult = await client.query(
        'INSERT INTO bill_extra_charges (bill_id, name, amount) VALUES ($1, $2, $3) RETURNING *',
        [bill.id, charge.name, Number(charge.amount).toFixed(2)]
      );
      responseExtraCharges.push(chargeResult.rows[0]);
    }

    for (let position = 0; position < imageUrls.length; position += 1) {
      await client.query(
        'INSERT INTO bill_images (bill_id, image_url, position) VALUES ($1, $2, $3)',
        [bill.id, imageUrls[position], position]
      );
    }

    const responseItems = [];
    for (const item of itemsWithShares) {
      const itemResult = await client.query(
        'INSERT INTO bill_items (bill_id, name, price, unit_note) VALUES ($1, $2, $3, $4) RETURNING *',
        [bill.id, item.name, item.price, item.unit_note]
      );
      const billItem = itemResult.rows[0];

      for (const share of item.shares) {
        await client.query(
          'INSERT INTO item_contributors (item_id, user_id, share_amount) VALUES ($1, $2, $3)',
          [billItem.id, share.user_id, share.share_amount]
        );
      }

      responseItems.push({
        id: billItem.id,
        name: billItem.name,
        price: billItem.price,
        unit_note: billItem.unit_note,
        contributors: item.shares,
      });
    }

    // Additional charges + any shared tip, split equally across every
    // contributor on the bill (not per-item, so it lives in its own table -
    // see schema.sql). splitItemPrice takes a plain amount, so the mix of
    // named charges + tip is combined into one pool before splitting - the
    // per-charge breakdown for display comes from bill_extra_charges/tip
    // above, not from this table.
    const responseCharges = [];
    if (sharedExtraAmount !== 0) {
      const charges = splitItemPrice(sharedExtraAmount, distinctContributorIds);
      for (const charge of charges) {
        await client.query(
          'INSERT INTO bill_charges (bill_id, user_id, amount) VALUES ($1, $2, $3)',
          [bill.id, charge.user_id, charge.share_amount]
        );
        responseCharges.push(charge);
      }
    }

    await client.query('COMMIT');

    // 7. Respond
    res.status(201).json({
      message: 'Bill created successfully',
      bill,
      items: responseItems,
      extra_charges: responseExtraCharges,
      charges: responseCharges,
    });

  } catch (err) {
    await client.query('ROLLBACK');
    if (req.files) {
      for (const file of req.files) fs.unlink(file.path, () => {});
    }
    console.error('Create bill error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

// GET /groups/:groupId/bills - list bill summaries for a group
const getBillsForGroup = async (req, res) => {
  try {
    const groupId = req.params.groupId;

    const result = await pool.query(
      `SELECT b.id, b.group_id, b.added_by, b.image_url, b.total_amount, b.purchase_date, b.created_at,
              u.name AS added_by_name,
              COALESCE(item_counts.item_count, 0)::int AS item_count,
              COALESCE(contributor_counts.contributor_count, 0)::int AS contributor_count
       FROM bills b
       JOIN users u ON u.id = b.added_by
       LEFT JOIN (
         SELECT bill_id, COUNT(*) AS item_count
         FROM bill_items
         GROUP BY bill_id
       ) item_counts ON item_counts.bill_id = b.id
       LEFT JOIN (
         SELECT bi.bill_id, COUNT(DISTINCT ic.user_id) AS contributor_count
         FROM bill_items bi
         JOIN item_contributors ic ON ic.item_id = bi.id
         GROUP BY bi.bill_id
       ) contributor_counts ON contributor_counts.bill_id = b.id
       WHERE b.group_id = $1
       ORDER BY b.created_at DESC`,
      [groupId]
    );

    res.status(200).json({
      bills: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error('Get bills error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /groups/:groupId/bills/:billId - full bill detail with items + contributors
const getBillById = async (req, res) => {
  try {
    const { groupId, billId } = req.params;

    // 1. Fetch the bill, scoped to this group
    const billResult = await pool.query(
      'SELECT * FROM bills WHERE id = $1 AND group_id = $2',
      [billId, groupId]
    );

    if (billResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const bill = billResult.rows[0];

    // 1b. Who covered the tip themselves, if anyone (bill.tip_paid_by is
    // null when there's no tip or it's split - see schema.sql).
    if (bill.tip_paid_by) {
      const tipPayerResult = await pool.query('SELECT name FROM users WHERE id = $1', [bill.tip_paid_by]);
      bill.tip_paid_by_name = tipPayerResult.rows[0]?.name || null;
    } else {
      bill.tip_paid_by_name = null;
    }

    // 2. Fetch every photo scanned into this bill (a long receipt is often
    // split across several - see AddBillPage's "Scan another part")
    const imagesResult = await pool.query(
      'SELECT id, image_url, position FROM bill_images WHERE bill_id = $1 ORDER BY position ASC',
      [billId]
    );

    // 3. Fetch items for this bill
    const itemsResult = await pool.query(
      'SELECT * FROM bill_items WHERE bill_id = $1 ORDER BY created_at ASC',
      [billId]
    );

    // 4. Fetch contributors for all items on this bill in one query
    const itemIds = itemsResult.rows.map((row) => row.id);
    let contributorsByItem = new Map();

    if (itemIds.length > 0) {
      const contributorsResult = await pool.query(
        `SELECT ic.item_id, ic.user_id, ic.share_amount, u.name, u.email
         FROM item_contributors ic
         JOIN users u ON u.id = ic.user_id
         WHERE ic.item_id = ANY($1::uuid[])`,
        [itemIds]
      );

      contributorsByItem = contributorsResult.rows.reduce((map, row) => {
        const list = map.get(row.item_id) || [];
        list.push({
          user_id: row.user_id,
          name: row.name,
          email: row.email,
          share_amount: row.share_amount,
        });
        map.set(row.item_id, list);
        return map;
      }, new Map());
    }

    // 5. Assemble nested response
    const items = itemsResult.rows.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      unit_note: item.unit_note,
      contributors: contributorsByItem.get(item.id) || [],
    }));

    // 6. Named additional charges (tax, fees, ...) - empty when the receipt
    // had none.
    const extraChargesResult = await pool.query(
      'SELECT id, name, amount FROM bill_extra_charges WHERE bill_id = $1 ORDER BY created_at ASC',
      [billId]
    );

    // 7. Each contributor's equal share of sum(bill_extra_charges) + any
    // shared tip (see bill_charges in schema.sql) - empty when the bill had
    // neither.
    const chargesResult = await pool.query(
      `SELECT bc.user_id, bc.amount, u.name, u.email
       FROM bill_charges bc
       JOIN users u ON u.id = bc.user_id
       WHERE bc.bill_id = $1`,
      [billId]
    );

    res.status(200).json({
      bill,
      images: imagesResult.rows,
      items,
      extra_charges: extraChargesResult.rows,
      charges: chargesResult.rows,
    });
  } catch (err) {
    console.error('Get bill by id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /groups/:groupId/bills/parse-receipt - OCR a receipt image into candidate items.
// Preview-only: does not create a bill. The frontend is expected to let the user
// review/edit these suggestions, then call createBill with the final item list.
const parseReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'A receipt image is required' });
    }

    // PaddleOCR's native inference engine can fail with a bare "Unknown
    // exception" (or crash the worker outright) under memory pressure - a
    // transient, machine-load-dependent failure, not a bug in this image or
    // this code. One retry after a short pause (which also gives a crashed
    // worker time to respawn, see receiptOcr.js) recovers most of the time;
    // if it still fails, say so plainly instead of a bare "Server error" so
    // the user knows to retry later or just add items manually.
    let rawText;
    try {
      rawText = await extractTextFromImage(req.file.path);
    } catch (firstErr) {
      console.error('Parse receipt error (attempt 1, retrying):', firstErr);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      rawText = await extractTextFromImage(req.file.path);
    }

    const { items, charges } = parseReceiptLines(rawText);
    const receiptSubtotal = extractSubtotal(rawText);
    const receiptTotal = extractTotal(rawText);
    const receiptTip = extractTip(rawText);

    res.status(200).json({
      items,
      extra_charges: charges,
      raw_text: rawText,
      receipt_subtotal: receiptSubtotal,
      receipt_total: receiptTotal,
      receipt_tip: receiptTip,
    });
  } catch (err) {
    console.error('Parse receipt error:', err);
    res.status(503).json({
      error: 'Receipt scanning is temporarily unavailable (the scanner is under heavy load). Please try again in a moment, or add items manually below.',
    });
  } finally {
    // This upload is just a scratch file for OCR preview, not a saved bill image.
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
  }
};

module.exports = { createBill, getBillsForGroup, getBillById, parseReceipt };
