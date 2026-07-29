// frontend/src/api/balances.js

import apiClient from './client';

export async function getBalances(groupId) {
  const res = await apiClient.get(`/groups/${groupId}/balances`);
  return res.data;
}

export async function getMyBalanceSummary() {
  const res = await apiClient.get('/me/balance-summary');
  return res.data;
}
