// backend/controllers/billController.js

const fs = require('fs');
const pool = require('../config/db');
const { splitItemPrice } = require('../utils/splitCalculator');
const { extractTextFromImage } = require('../utils/receiptOcr');
const { parseReceiptItems } = require('../utils/receiptParser');

// POST /groups/:groupId/bills - create a bill with items + per-item contributors
const createBill = async (req, res) => {
  const client = await pool.connect();

  try {
    const groupId = req.params.groupId;
    const userId = req.user.userId;

    // 1. Require a receipt image
    if (!req.file) {
      return res.status(400).json({ error: 'A receipt image is required' });
    }

    // 2. Parse the items JSON string sent alongside the file
    let items;
    try {
      items = JSON.parse(req.body.items);
    } catch (parseErr) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'items must be valid JSON' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'items must be a non-empty array' });
    }

    // 3. Validate each item's shape
    for (const item of items) {
      if (!item.name || typeof item.name !== 'string') {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'Each item requires a name' });
      }
      const price = Number(item.price);
      if (!Number.isFinite(price) || price <= 0) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: `Invalid price for item "${item.name}"` });
      }
      if (!Array.isArray(item.contributor_ids) || item.contributor_ids.length === 0) {
        fs.unlink(req.file.path, () => {});
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
          fs.unlink(req.file.path, () => {});
          return res.status(400).json({
            error: `Contributor ${contributorId} is not a member of this group`,
          });
        }
      }
    }

    // 5. Compute shares + total in memory before touching the DB
    const imageUrl = `/uploads/${req.file.filename}`;
    let totalCents = 0;
    const itemsWithShares = items.map((item) => {
      const price = Number(item.price).toFixed(2);
      totalCents += Math.round(Number(price) * 100);
      return {
        name: item.name,
        price,
        shares: splitItemPrice(price, item.contributor_ids),
      };
    });
    const totalAmount = (totalCents / 100).toFixed(2);

    // 6. Insert bill, items, and contributor shares in one transaction
    await client.query('BEGIN');

    const billResult = await client.query(
      'INSERT INTO bills (group_id, added_by, image_url, total_amount) VALUES ($1, $2, $3, $4) RETURNING *',
      [groupId, userId, imageUrl, totalAmount]
    );
    const bill = billResult.rows[0];

    const responseItems = [];
    for (const item of itemsWithShares) {
      const itemResult = await client.query(
        'INSERT INTO bill_items (bill_id, name, price) VALUES ($1, $2, $3) RETURNING *',
        [bill.id, item.name, item.price]
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
        contributors: item.shares,
      });
    }

    await client.query('COMMIT');

    // 7. Respond
    res.status(201).json({
      message: 'Bill created successfully',
      bill,
      items: responseItems,
    });

  } catch (err) {
    await client.query('ROLLBACK');
    if (req.file) {
      fs.unlink(req.file.path, () => {});
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
      `SELECT id, group_id, added_by, image_url, total_amount, created_at
       FROM bills
       WHERE group_id = $1
       ORDER BY created_at DESC`,
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

    // 2. Fetch items for this bill
    const itemsResult = await pool.query(
      'SELECT * FROM bill_items WHERE bill_id = $1 ORDER BY created_at ASC',
      [billId]
    );

    // 3. Fetch contributors for all items on this bill in one query
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

    // 4. Assemble nested response
    const items = itemsResult.rows.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      contributors: contributorsByItem.get(item.id) || [],
    }));

    res.status(200).json({ bill, items });
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

    const rawText = await extractTextFromImage(req.file.path);
    const items = parseReceiptItems(rawText);

    res.status(200).json({ items, raw_text: rawText });
  } catch (err) {
    console.error('Parse receipt error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    // This upload is just a scratch file for OCR preview, not a saved bill image.
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
  }
};

module.exports = { createBill, getBillsForGroup, getBillById, parseReceipt };
