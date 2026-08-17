import axios from 'axios';
import { clientLogger } from '../utils/logger';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Interceptor to inject JWT access token & start timing
api.interceptors.request.use((config) => {
  (config as any)._startTime = performance.now();
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to log responses and auto-refresh token on 401 error
api.interceptors.response.use(
  (response) => {
    const duration = performance.now() - ((response.config as any)._startTime || performance.now());
    const method = response.config.method || 'GET';
    const url = response.config.url || '';
    clientLogger.api(method, url, response.status, duration, response.data);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const duration = originalRequest?._startTime ? performance.now() - originalRequest._startTime : 0;
    const method = originalRequest?.method || 'UNKNOWN';
    const url = originalRequest?.url || '';
    const status = error.response?.status || 0;

    clientLogger.api(method, url, status, duration, error.response?.data);

    if (error.response?.data?.code === 'MULTIPLE_LOGIN_DETECTED') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      sessionStorage.setItem('logout_reason', error.response.data.error || '⚠️ Anti-Cheat: Sesi Anda dihentikan karena akun aktif di perangkat lain.');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't intercept auth routes
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register')) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          clientLogger.auth('Token Expired. Attempting silent token refresh...');
          const res = await axios.post(`${API_BASE}/auth/refresh-token`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = res.data;
          localStorage.setItem('access_token', accessToken);
          if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken);
          }
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          clientLogger.auth('Token Refresh Successful.');
          return axios(originalRequest);
        } catch (refreshError: any) {
          // Only force logout if server explicitly rejected the refresh token with 401
          if (refreshError?.response?.status === 401) {
            clientLogger.error('Auth', 'Refresh Token Invalid/Expired. Redirecting to login.');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          } else {
            // Temporary server restart / 502 / network timeout - preserve credentials
            clientLogger.warn('Auth', 'Server temporarily unavailable during token refresh. Preserving credentials.');
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
