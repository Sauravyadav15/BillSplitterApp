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

export async function createBill(groupId, { imageFiles, items, purchaseDate, extraCharges, tipAmount, tipPaidBy }) {
  const formData = new FormData();
  for (const file of imageFiles) {
    formData.append('images', file);
  }
  formData.append('items', JSON.stringify(items));
  formData.append('purchase_date', purchaseDate);
  formData.append('extra_charges', JSON.stringify(extraCharges || []));
  formData.append('tip_amount', tipAmount || 0);
  if (tipPaidBy) {
    formData.append('tip_paid_by', tipPaidBy);
  }
  const res = await apiClient.post(`/groups/${groupId}/bills`, formData);
  return res.data;
}
