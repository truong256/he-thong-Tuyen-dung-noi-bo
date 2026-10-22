import apiClient from './client';
import { LoginResponse, UserSummary, AvatarUploadResponse } from '../types/auth';

let inFlightMe: Promise<UserSummary> | null = null;
let inFlightPermissions: Promise<string[]> | null = null;

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    inFlightMe = null;
    inFlightPermissions = null;
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
    inFlightMe = null;
    inFlightPermissions = null;
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
    if (inFlightMe) {
      return inFlightMe;
    }
    inFlightMe = apiClient
      .get<UserSummary>('/api/auth/me')
      .then((res) => res.data)
      .finally(() => {
        inFlightMe = null;
      });
    return inFlightMe;
  },

  updateProfile: async (payload: { fullName: string; department?: string; phone?: string; displayName?: string; recoveryEmail?: string }): Promise<UserSummary> => {
    inFlightMe = null;
    const res = await apiClient.put<UserSummary>('/api/auth/profile', payload);
    return res.data;
  },

  uploadAvatar: async (file: File): Promise<AvatarUploadResponse> => {
    inFlightMe = null;
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<AvatarUploadResponse>(
      '/api/auth/avatar',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data;
  },

  deleteAvatar: async (): Promise<{ message: string }> => {
    inFlightMe = null;
    const res = await apiClient.delete<{ message: string }>('/api/auth/avatar');
    return res.data;
  },

  /** S1-05: Fetch server-authoritative permission list for current user with in-flight deduplication */
  getPermissions: async (): Promise<string[]> => {
    if (inFlightPermissions) {
      return inFlightPermissions;
    }
    inFlightPermissions = apiClient
      .get<string[]>('/api/auth/permissions')
      .then((res) => res.data)
      .finally(() => {
        inFlightPermissions = null;
      });
    return inFlightPermissions;
  },
};

export default authApi;
