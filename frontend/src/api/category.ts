import apiClient from './client';
import {
  CommonCategory,
  CategoryTypeInfo,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  CategoryFilterParams,
} from '../types/category';

export const categoryApi = {
  list: async (params?: CategoryFilterParams): Promise<CommonCategory[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.type && params.type !== 'ALL') query.append('type', params.type);
    if (params?.active !== undefined) query.append('active', String(params.active));

    const qs = query.toString();
    const res = await apiClient.get<CommonCategory[]>(`/api/categories${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  getTypes: async (): Promise<CategoryTypeInfo[]> => {
    const res = await apiClient.get<CategoryTypeInfo[]>('/api/categories/types');
    return res.data;
  },

  getById: async (id: number): Promise<CommonCategory> => {
    const res = await apiClient.get<CommonCategory>(`/api/categories/${id}`);
    return res.data;
  },

  create: async (payload: CreateCategoryPayload): Promise<CommonCategory> => {
    const res = await apiClient.post<CommonCategory>('/api/categories', payload);
    return res.data;
  },

  update: async (id: number, payload: UpdateCategoryPayload): Promise<CommonCategory> => {
    const res = await apiClient.put<CommonCategory>(`/api/categories/${id}`, payload);
    return res.data;
  },

  setStatus: async (id: number, active: boolean): Promise<CommonCategory> => {
    const res = await apiClient.patch<CommonCategory>(`/api/categories/${id}/status`, { active });
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/categories/${id}`);
  },
};

export default categoryApi;
