// backend/tests/bills.test.js

const path = require('path');
const request = require('supertest');
const app = require('../app');
const pool = require('../config/db');

const BILL1_PATH = path.join(__dirname, 'fixtures', 'bill1.jpeg');
const BILL2_PATH = path.join(__dirname, 'fixtures', 'bill3.jpg');

describe('Bill upload and item retrieval', () => {
  let token;
  let groupId;

  beforeAll(async () => {
    // Start from a clean slate every run
    await pool.query(
      'TRUNCATE TABLE item_contributors, bill_items, bills, settlements, group_members, groups, users CASCADE'
    );

    const signupRes = await request(app).post('/auth/signup').send({
      name: 'Test User',
      email: 'test.user@example.com',
      password: 'password123',
    });
    token = signupRes.body.token;

    const groupRes = await request(app)
      .post('/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Group' });
    groupId = groupRes.body.group.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it('uploads bill1 (Food Basics - Kiwi Basket) and returns all its items in the create response', async () => {
    const userId = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    ).userId;

    const items = [{ name: 'Kiwi Basket', price: 4.99, contributor_ids: [userId] }];

    const res = await request(app)
      .post(`/groups/${groupId}/bills`)
      .set('Authorization', `Bearer ${token}`)
      .attach('images', BILL1_PATH)
      .field('items', JSON.stringify(items))
      .field('purchase_date', '2026-08-01');

    console.log('bill1 items returned by API:', JSON.stringify(res.body.items, null, 2));

    expect(res.status).toBe(201);
    expect(res.body.bill.total_amount).toBe('4.99');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].name).toBe('Kiwi Basket');
    expect(res.body.items[0].price).toBe('4.99');
    expect(res.body.items[0].contributors).toEqual([
      { user_id: userId, share_amount: '4.99' },
    ]);
  });

  it('uploads bill3 (Food Basics - Ginger & Garlic) and retrieves the same items list by bill id', async () => {
    const userId = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    ).userId;

    const items = [
      { name: 'Ginger', price: 0.49, contributor_ids: [userId] },
      { name: 'Garlic', price: 1.88, contributor_ids: [userId] },
    ];

    const createRes = await request(app)
      .post(`/groups/${groupId}/bills`)
      .set('Authorization', `Bearer ${token}`)
      .attach('images', BILL2_PATH)
      .field('items', JSON.stringify(items))
      .field('purchase_date', '2026-08-05');

    expect(createRes.status).toBe(201);
    const billId = createRes.body.bill.id;

    const getRes = await request(app)
      .get(`/groups/${groupId}/bills/${billId}`)
      .set('Authorization', `Bearer ${token}`);

    console.log('bill3 items returned by API:', JSON.stringify(getRes.body.items, null, 2));

    expect(getRes.status).toBe(200);
    expect(getRes.body.items).toHaveLength(2);

    const names = getRes.body.items.map((item) => item.name).sort();
    expect(names).toEqual(['Garlic', 'Ginger']);

    const ginger = getRes.body.items.find((item) => item.name === 'Ginger');
    expect(ginger.price).toBe('0.49');
    expect(ginger.contributors).toEqual([
      expect.objectContaining({ user_id: userId, share_amount: '0.49' }),
    ]);
  });

  it('prints every item across every bill uploaded so far in this group', async () => {
    // 1. List every bill in the group
    const billsRes = await request(app)
      .get(`/groups/${groupId}/bills`)
      .set('Authorization', `Bearer ${token}`);

    expect(billsRes.status).toBe(200);

    // 2. Fetch full item detail for each bill
    const allItems = [];
    for (const bill of billsRes.body.bills) {
      const detailRes = await request(app)
        .get(`/groups/${groupId}/bills/${bill.id}`)
        .set('Authorization', `Bearer ${token}`);

      for (const item of detailRes.body.items) {
        allItems.push({ bill_id: bill.id, ...item });
      }
    }

    // 3. Print the full combined list
    console.log(`ALL ITEMS across ${billsRes.body.bills.length} bill(s):`, JSON.stringify(allItems, null, 2));

    expect(allItems.length).toBeGreaterThan(0);
  });
});
