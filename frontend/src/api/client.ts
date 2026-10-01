import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
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

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthPublic = url.includes('/api/auth/login') || url.includes('/api/auth/register') || url.includes('/api/auth/forgot-password') || url.includes('/api/auth/reset-password');
      if (!isAuthPublic) {
        // Trigger session expired notification in app
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ats:session-expired'));
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
