import axios from 'axios';

const isDevHost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '' ||
    window.location.port === '3000' ||
    window.location.port === '5173');

const defaultLocalUrl = 'http://localhost:5001/api';
const defaultProdUrl = 'https://whatsapp-backend-97f3.onrender.com/api';

const envUrl =
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL)) ||
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL);

// When running locally in browser (localhost), use local backend on 5001 so API calls don't hang on Render free-tier cold-boot/blocked SMTP
const apiUrl = isDevHost
  ? (envUrl && !envUrl.includes('onrender.com')
      ? envUrl
      : (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
          ? `http://${window.location.hostname}:5001/api`
          : defaultLocalUrl))
  : (envUrl || defaultProdUrl);

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