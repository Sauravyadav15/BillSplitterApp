// frontend/src/api/client.js

import axios from 'axios';

export const API_BASE_URL = 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('billsplit_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('billsplit_token');
      localStorage.removeItem('billsplit_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export function resolveImageUrl(path) {
  if (!path) return '';
  return `${API_BASE_URL}${path}`;
}

export default apiClient;
