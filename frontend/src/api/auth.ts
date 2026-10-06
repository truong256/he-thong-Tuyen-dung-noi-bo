import apiClient from './client';
import { LoginResponse, UserSummary } from '../types/auth';

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/api/auth/login', { email, password });
    return res.data;
  },

  register: async (payload: { email: string; password: string; fullName?: string; role?: string }): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/api/auth/register', payload);
    return res.data;
  },

  refreshToken: async (refreshToken: string): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/api/auth/refresh-token', { refreshToken });
    return res.data;
  },

  logout: async (payload?: { refreshToken?: string; email?: string } | string): Promise<{ message: string }> => {
    const body = typeof payload === 'string'
      ? { email: payload }
      : payload;
    const res = await apiClient.post<{ message: string }>('/api/auth/logout', body ?? {});
    return res.data;
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>('/api/auth/forgot-password', { email });
    return res.data;
  },

  resetPassword: async (payload: { token: string; newPassword: string; confirmPassword?: string }): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>('/api/auth/reset-password', payload);
    return res.data;
  },

  changePassword: async (payload: { currentPassword: string; newPassword: string; confirmPassword?: string }): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>('/api/auth/change-password', payload);
    return res.data;
  },

  getMe: async (): Promise<UserSummary> => {
    const res = await apiClient.get<UserSummary>('/api/auth/me');
    return res.data;
  },

  updateProfile: async (payload: { fullName: string; phone?: string; displayName?: string }): Promise<UserSummary> => {
    const res = await apiClient.put<UserSummary>('/api/auth/profile', payload);
    return res.data;
  },
};

export default authApi;
