import axios from 'axios';

const API_BASE = '/api';
const ACCESS_TOKEN_KEY = 'karyantrix_token';
const LEGACY_REFRESH_TOKEN_KEY = 'karyantrix_refresh_token';

export const SESSION_EXPIRED_EVENT = 'karyantrix:session-expired';

const EXPIRY_LEEWAY_MS = 10 * 1000;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

let accessToken =
  typeof window !== 'undefined'
    ? localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY)
    : null;

if (typeof window !== 'undefined') {
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
}

export const setAccessToken = (token, persist = false) => {
  accessToken = token;
  if (typeof window === 'undefined') return;

  if (persist) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  } else {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
};

export const clearAccessToken = () => {
  accessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  }
};

const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 <= Date.now() + EXPIRY_LEEWAY_MS;
  } catch (err) {
    return false;
  }
};

const AUTH_ENDPOINTS_SKIP_REFRESH = [
  '/auth/refresh',
  '/auth/login',
  '/auth/login/otp/verify',
  '/auth/register/verify',
  '/auth/google',
];

const isAuthEndpoint = (url = '') => AUTH_ENDPOINTS_SKIP_REFRESH.some((u) => url.includes(u));

const handleSessionExpired = () => {
  clearAccessToken();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
};

let refreshPromise = null;

const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE}/auth/refresh`, null, { withCredentials: true })
      .then((res) => {
        const newAccessToken = res.data && res.data.accessToken;
        if (!newAccessToken) throw new Error('No accessToken returned from refresh');
        setAccessToken(newAccessToken, true);
        return newAccessToken;
      })
      .catch((err) => {
        const status = err && err.response && err.response.status;
        if (status === 401 || status === 403) handleSessionExpired();
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.request.use(async (config) => {
  config.headers = config.headers || {};

  if (accessToken && !isAuthEndpoint(config.url) && isTokenExpired(accessToken)) {
    try {
      await refreshAccessToken();
    } catch (err) {
      config._retry = true;
    }
  }

  if (accessToken) config.headers['Authorization'] = 'Bearer ' + accessToken;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest || !error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }
    if (originalRequest._retry || isAuthEndpoint(originalRequest.url)) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newAccessToken = await refreshAccessToken();
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
      return api(originalRequest);
    } catch (refreshErr) {
      return Promise.reject(refreshErr);
    }
  }
);

export default api;