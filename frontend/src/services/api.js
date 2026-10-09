import axios from 'axios';
import { getAuthSession } from './authSession.js';

const api = axios.create({
  baseURL: import.meta.env?.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Use this tab's session, not a login overwritten by another browser tab.
api.interceptors.request.use((config) => {
  const session = getAuthSession();
  config.authSnapshot = session.snapshot();
  const token = config.authSnapshot.token;
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // If uploading FormData, delete Content-Type so browser sets the correct multipart boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// If we get a 401, the token is expired/invalid — redirect to login
api.interceptors.response.use(
  (response) => {
    if (!getAuthSession().isCurrent(response.config.authSnapshot)) {
      throw new axios.CanceledError('The login session changed before this response completed.');
    }
    return response;
  },
  (error) => {
    const captured = error.config?.authSnapshot;
    if (captured && !getAuthSession().isCurrent(captured)) {
      return Promise.reject(new axios.CanceledError('The login session changed before this request completed.'));
    }
    if (error.response?.status === 401 && captured?.token) {
      getAuthSession().clear(captured);
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

export default api;
