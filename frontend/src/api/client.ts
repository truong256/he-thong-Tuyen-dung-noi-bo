import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

import { isIdleExpired, clearActivity } from '../utils/idleTracker';

// Request interceptor to attach JWT access token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const url = config.url || '';
    const isPublicAuthRoute =
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/register') ||
      url.includes('/api/auth/forgot-password') ||
      url.includes('/api/auth/reset-password') ||
      url.includes('/api/auth/logout');

    if (!isPublicAuthRoute && isIdleExpired()) {
      triggerIdleSessionExpired();
      return Promise.reject(new axios.Cancel('Phiên đăng nhập đã hết hạn do không hoạt động. Vui lòng đăng nhập lại.'));
    }

    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// State for managing concurrent refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Throttle session-expired events to prevent duplicate modals and loops
let isSessionExpiredDispatched = false;
export const resetSessionExpiredThrottle = () => {
  isSessionExpiredDispatched = false;
};

export const triggerSessionExpired = (message?: string, reason?: string) => {
  if (isSessionExpiredDispatched) return;
  isSessionExpiredDispatched = true;

  const noticeMessage = message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';

  clearActivity();
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');

  if (typeof window !== 'undefined') {
    sessionStorage.setItem('ats:session_expired', '1');
    sessionStorage.setItem('ats:auth_notice', noticeMessage);
    if (reason) {
      sessionStorage.setItem('ats:session_expired_reason', reason);
    }
    window.dispatchEvent(
      new CustomEvent('ats:session-expired', {
        detail: { reason, message: noticeMessage },
      })
    );
  }
  setTimeout(() => {
    isSessionExpiredDispatched = false;
  }, 3000);
};

export const triggerIdleSessionExpired = () => {
  triggerSessionExpired(
    'Phiên đăng nhập đã hết hạn do không hoạt động. Vui lòng đăng nhập lại.',
    'idle'
  );
};

// Response interceptor to handle token refresh and session expiration
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const url = originalRequest?.url || '';

    // Ignore public auth routes and logout from refresh or session-expired logic
    const isPublicAuthRoute =
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/register') ||
      url.includes('/api/auth/forgot-password') ||
      url.includes('/api/auth/reset-password') ||
      url.includes('/api/auth/logout');

    if (isPublicAuthRoute) {
      return Promise.reject(error);
    }

    // Only process 401 Unauthorized errors on protected requests
    if (status === 401 && originalRequest) {
      // If idle expired, do not attempt to refresh - expire session immediately
      if (isIdleExpired()) {
        processQueue(error, null);
        isRefreshing = false;
        triggerIdleSessionExpired();
        return Promise.reject(error);
      }

      // If the failing request was the refresh-token endpoint itself, expire session immediately
      if (url.includes('/api/auth/refresh-token')) {
        processQueue(error, null);
        isRefreshing = false;
        triggerSessionExpired();
        return Promise.reject(error);
      }

      // If already retried once, do not loop
      if (originalRequest._retry) {
        triggerSessionExpired();
        return Promise.reject(error);
      }

      const storedRefreshToken = localStorage.getItem('refreshToken');
      if (!storedRefreshToken) {
        triggerSessionExpired();
        return Promise.reject(error);
      }

      // If another request is currently refreshing the token, enqueue this request
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // Begin refresh process
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Use raw axios to prevent recursive interceptor loops
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, {
          refreshToken: storedRefreshToken,
        });

        const newAccessToken = response.data?.accessToken;
        const newRefreshToken = response.data?.refreshToken || storedRefreshToken;

        if (!newAccessToken) {
          throw new Error('No access token returned from refresh endpoint');
        }

        localStorage.setItem('accessToken', newAccessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        if (response.data?.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }

        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        triggerSessionExpired();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    if (status === 403 && (error.response?.data as any)?.mustChangePassword) {
      const currentUser = localStorage.getItem('user');
      if (currentUser) {
        try {
          const u = JSON.parse(currentUser);
          u.mustChangePassword = true;
          localStorage.setItem('user', JSON.stringify(u));
        } catch {
          // Ignore invalid user storage JSON
        }
      }
      if (typeof window !== 'undefined' && window.location.pathname !== '/first-login/change-password') {
        window.location.href = '/first-login/change-password';
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
