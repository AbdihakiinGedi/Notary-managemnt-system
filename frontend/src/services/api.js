import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (['post', 'put', 'patch'].includes(config.method)) {
    config.headers['X-Idempotency-Key'] = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        const errorMsg = error.response?.data?.error || 'Session expired. Please login again.';
        window.location.href = `/login?message=${encodeURIComponent(errorMsg)}`;
      }
    }
    if (error.response?.status === 503) {
      window.dispatchEvent(new Event('CIRCUIT_BREAKER_TRIPPED'));
    }
    return Promise.reject(error);
  }
);

export default api;
