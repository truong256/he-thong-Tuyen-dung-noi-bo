import apiClient from './client';
import {
  CreateUserPayload,
  PageResponse,
  UpdateRolesPayload,
  UpdateStatusPayload,
  UpdateUserPayload,
  UserSummary,
} from '../types/user';

export const adminApi = {
  listUsers: async (
    search?: string,
    status?: string,
    page = 0,
    size = 10
  ): Promise<PageResponse<UserSummary>> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'ALL') params.append('status', status);
    params.append('page', String(page));
    params.append('size', String(size));

    const res = await apiClient.get<PageResponse<UserSummary>>(`/api/admin/users?${params.toString()}`);
    return res.data;
  },

  getUserById: async (id: number): Promise<UserSummary> => {
    const res = await apiClient.get<UserSummary>(`/api/admin/users/${id}`);
    return res.data;
  },

  createUser: async (payload: CreateUserPayload): Promise<UserSummary> => {
    const res = await apiClient.post<UserSummary>('/api/admin/users', payload);
    return res.data;
  },

  updateUser: async (id: number, payload: UpdateUserPayload): Promise<UserSummary> => {
    const res = await apiClient.put<UserSummary>(`/api/admin/users/${id}`, payload);
    return res.data;
  },

  updateStatus: async (id: number, payload: UpdateStatusPayload): Promise<UserSummary> => {
    const res = await apiClient.patch<UserSummary>(`/api/admin/users/${id}/status`, payload);
    return res.data;
  },

  updateRoles: async (id: number, payload: UpdateRolesPayload): Promise<UserSummary> => {
    const res = await apiClient.put<UserSummary>(`/api/admin/users/${id}/roles`, payload);
    return res.data;
  },

  deleteUser: async (id: number): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/api/admin/users/${id}`);
    return res.data;
  },
};

export default adminApi;
