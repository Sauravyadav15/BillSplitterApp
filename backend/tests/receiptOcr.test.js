// backend/tests/receiptOcr.test.js
// Exercises the real OCR pipeline (utils/receiptOcr.js + utils/receiptParser.js)
// via the /parse-receipt endpoint - this is the app actually reading the image,
// not hand-typed test data.

const path = require('path');
const request = require('supertest');
const app = require('../app');
const pool = require('../config/db');

const BILL3_PATH = path.join(__dirname, 'fixtures', 'bill3.jpg');

describe('Receipt OCR', () => {
  let token;
  let groupId;

  beforeAll(async () => {
    await pool.query(
      'TRUNCATE TABLE item_contributors, bill_items, bills, settlements, group_members, groups, users CASCADE'
    );

    const signupRes = await request(app).post('/auth/signup').send({
      name: 'OCR Test User',
      email: 'ocr.test.user@example.com',
      password: 'password123',
    });
    token = signupRes.body.token;

    const groupRes = await request(app)
      .post('/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'OCR Test Group' });
    groupId = groupRes.body.group.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it('OCRs bill3.jpg and prints every candidate item the app itself extracted', async () => {
    const res = await request(app)
      .post(`/groups/${groupId}/bills/parse-receipt`)
      .set('Authorization', `Bearer ${token}`)
      .attach('image', BILL3_PATH);

    console.log('RAW OCR TEXT from bill3.jpg:\n', res.body.raw_text);
    console.log('CANDIDATE ITEMS extracted from bill3.jpg:', JSON.stringify(res.body.items, null, 2));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});
