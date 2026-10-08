import apiClient from './client';
import {
  Requisition,
  RequisitionPayload,
  RequisitionFilterParams,
  RequisitionPageResponse,
} from '../types/requisition';

export const requisitionApi = {
  list: async (params?: RequisitionFilterParams): Promise<RequisitionPageResponse> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.departmentId) query.append('departmentId', String(params.departmentId));
    if (params?.page !== undefined) query.append('page', String(params.page));
    if (params?.size !== undefined) query.append('size', String(params.size));

    const qs = query.toString();
    const res = await apiClient.get<RequisitionPageResponse>(`/api/requisitions${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  getById: async (id: number): Promise<Requisition> => {
    const res = await apiClient.get<Requisition>(`/api/requisitions/${id}`);
    return res.data;
  },

  create: async (payload: RequisitionPayload): Promise<Requisition> => {
    const res = await apiClient.post<Requisition>('/api/requisitions', payload);
    return res.data;
  },

  update: async (id: number, payload: RequisitionPayload): Promise<Requisition> => {
    const res = await apiClient.put<Requisition>(`/api/requisitions/${id}`, payload);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/requisitions/${id}`);
  },
};

export default requisitionApi;
