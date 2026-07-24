// frontend/src/api/settlements.js

import apiClient from './client';

export async function createSettlement(groupId, { paid_to, amount }) {
  const res = await apiClient.post(`/groups/${groupId}/settlements`, { paid_to, amount });
  return res.data;
}

export async function listSettlements(groupId) {
  const res = await apiClient.get(`/groups/${groupId}/settlements`);
  return res.data;
}
