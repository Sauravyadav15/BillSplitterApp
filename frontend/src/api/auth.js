// frontend/src/api/auth.js

import apiClient from './client';

export async function signup({ name, email, password, avatar }) {
  const res = await apiClient.post('/auth/signup', { name, email, password, avatar });
  return res.data;
}

export async function login({ email, password }) {
  const res = await apiClient.post('/auth/login', { email, password });
  return res.data;
}
