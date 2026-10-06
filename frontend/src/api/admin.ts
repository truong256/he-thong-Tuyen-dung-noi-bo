import apiClient from './client';
import {
  CreateUserPayload,
  PageResponse,
  UpdateRolesPayload,
  UpdateStatusPayload,
  UpdateUserPayload,
  UserSummary,
} from '../types/user';
import {
  ExcelImportPreviewResponse,
  ExcelImportResultResponse,
} from '../types/excel';

export const adminApi = {
  listUsers: async (
    search?: string,
    status?: string,
    role?: string,
    page = 0,
    size = 20
  ): Promise<PageResponse<UserSummary>> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'ALL') params.append('status', status);
    if (role && role !== 'ALL') params.append('role', role);
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

  resetUserPassword: async (id: number): Promise<UserSummary> => {
    const res = await apiClient.post<UserSummary>(`/api/admin/users/${id}/reset-password`);
    return res.data;
  },

  downloadImportTemplate: async (): Promise<Blob> => {
    const res = await apiClient.get('/api/admin/users/import/template', {
      responseType: 'blob',
    });
    return res.data;
  },

  previewImportExcel: async (file: File): Promise<ExcelImportPreviewResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<ExcelImportPreviewResponse>(
      '/api/admin/users/import/preview',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data;
  },

  executeImportExcel: async (file: File): Promise<ExcelImportResultResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<ExcelImportResultResponse>(
      '/api/admin/users/import',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data;
  },
};

export default adminApi;
