// frontend/src/api/bills.js

import apiClient from './client';

export async function listBills(groupId) {
  const res = await apiClient.get(`/groups/${groupId}/bills`);
  return res.data;
}

export async function getBill(groupId, billId) {
  const res = await apiClient.get(`/groups/${groupId}/bills/${billId}`);
  return res.data;
}

export async function parseReceipt(groupId, imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);
  const res = await apiClient.post(`/groups/${groupId}/bills/parse-receipt`, formData);
  return res.data;
}

export async function createBill(groupId, { imageFile, items }) {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('items', JSON.stringify(items));
  const res = await apiClient.post(`/groups/${groupId}/bills`, formData);
  return res.data;
}
