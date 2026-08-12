// frontend/src/api/me.js

import apiClient from './client';

export async function getMe() {
  const res = await apiClient.get('/me');
  return res.data;
}

export async function updateAvatar(avatar) {
  const res = await apiClient.patch('/me/avatar', { avatar });
  return res.data;
}
