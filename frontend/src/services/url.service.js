import axios from 'axios';

const apiUrl =
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL)) ||
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) ||
  'https://whatsapp-backend-97f3.onrender.com/api';

const axiosInstance = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // If request data is FormData, remove Content-Type so Axios/browser computes multipart boundary
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
  }
  return config;
});

export default axiosInstance;