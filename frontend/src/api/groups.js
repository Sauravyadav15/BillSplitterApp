// frontend/src/api/groups.js

import apiClient from './client';

export async function createGroup({ name }) {
  const res = await apiClient.post('/groups', { name });
  return res.data;
}

export async function listGroups() {
  const res = await apiClient.get('/groups');
  return res.data;
}

export async function getGroup(groupId) {
  const res = await apiClient.get(`/groups/${groupId}`);
  return res.data;
}

export async function addMember(groupId, { email }) {
  const res = await apiClient.post(`/groups/${groupId}/members`, { email });
  return res.data;
}
