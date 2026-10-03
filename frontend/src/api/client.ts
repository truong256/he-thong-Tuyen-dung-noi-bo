import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT access token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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
export const triggerSessionExpired = () => {
  if (isSessionExpiredDispatched) return;
  isSessionExpiredDispatched = true;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('ats:session_expired', '1');
    window.dispatchEvent(new CustomEvent('ats:session-expired'));
  }
  setTimeout(() => {
    isSessionExpiredDispatched = false;
  }, 3000);
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

    return Promise.reject(error);
  }
);

export default apiClient;
