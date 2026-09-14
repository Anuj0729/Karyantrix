import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

let accessToken = typeof window !== 'undefined' ? localStorage.getItem('karyantrix_token') : null;
let refreshToken = typeof window !== 'undefined' ? localStorage.getItem('karyantrix_refresh_token') : null;
let isRefreshing = false;
let refreshPromise = null;
let subscribers = [];

export const setAccessToken = (token, persist = false) => {
  accessToken = token;
  if (persist && typeof window !== 'undefined') {
    localStorage.setItem('karyantrix_token', token);
  }
};

export const clearAccessToken = () => {
  accessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('karyantrix_token');
  }
};

export const setRefreshToken = (token) => {
  refreshToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('karyantrix_refresh_token', token);
    } else {
      localStorage.removeItem('karyantrix_refresh_token');
    }
  }
};

export const clearRefreshToken = () => setRefreshToken(null);

const onRefreshed = (newToken) => {
  subscribers.forEach((cb) => cb(newToken));
  subscribers = [];
};

const addSubscriber = (cb) => subscribers.push(cb);

const AUTH_ENDPOINTS_SKIP_REFRESH = [
  '/auth/refresh',
  '/auth/login',
  '/auth/login/otp/verify',
  '/auth/register/verify',
  '/auth/google',
];

api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  if (accessToken) config.headers['Authorization'] = 'Bearer ' + accessToken;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);
    if (originalRequest._retry) return Promise.reject(error);

    const requestUrl = originalRequest.url || '';
    const isAuthEndpoint = AUTH_ENDPOINTS_SKIP_REFRESH.some((u) => requestUrl.includes(u));

    if (error.response && error.response.status === 401 && isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = api.post('/auth/refresh', { refreshToken }).then((res) => {
          const { accessToken: newAccessToken } = res.data || {};
          if (!newAccessToken) throw new Error('No accessToken returned from refresh');
          setAccessToken(newAccessToken, true);
          onRefreshed(newAccessToken);
          return newAccessToken;
        }).catch((err) => {
          subscribers = [];
          throw err;
        }).finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
      }

      try {
        const newToken = await refreshPromise;
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
        return api(originalRequest);
      } catch (refreshErr) {
        clearAccessToken();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
