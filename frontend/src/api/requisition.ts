import { apiClient } from './client';

export interface RequisitionDraftRequest {
  title?: string;
  departmentId?: number;
  jobTitleId?: number;
  quantity?: number;
  recruitmentType?: string;
  reason?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  salaryExplanation?: string;
  neededDate?: string;
  jobDescription?: string;
  candidateRequirements?: string;
  benefits?: string;
  workLocation?: string;
  workingModel?: string;
}

export interface CreateRequisitionRequest {
  title: string;
  departmentId: number;
  jobTitleId: number;
  quantity: number;
  recruitmentType: string;
  reason: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  salaryExplanation?: string;
  neededDate: string;
  jobDescription: string;
  candidateRequirements: string;
  benefits?: string;
  workLocation?: string;
  workingModel?: string;
}

export interface RequisitionResponse {
  id: number;
  requisitionCode: string;
  title: string;
  departmentId?: number;
  departmentName?: string;
  departmentCode?: string;
  jobTitleId?: number;
  jobTitleName?: string;
  quantity: number;
  recruitmentType?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  salaryExplanation?: string;
  neededDate?: string;
  targetDate?: string;
  jobDescription?: string;
  candidateRequirements?: string;
  benefits?: string;
  workLocation?: string;
  workingModel?: string;
  status: string;
  reason?: string;
  rejectionReason?: string;
  createdByUserId?: number;
  createdByName?: string;
  submittedAt?: string;
  approvedByUserId?: number;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const requisitionApi = {
  saveDraft: async (data: RequisitionDraftRequest): Promise<RequisitionResponse> => {
    const res = await apiClient.post<RequisitionResponse>('/api/requisitions/draft', data);
    return res.data;
  },

  updateDraft: async (id: number, data: RequisitionDraftRequest): Promise<RequisitionResponse> => {
    const res = await apiClient.put<RequisitionResponse>(`/api/requisitions/${id}/draft`, data);
    return res.data;
  },

  createAndSubmit: async (data: CreateRequisitionRequest): Promise<RequisitionResponse> => {
    const res = await apiClient.post<RequisitionResponse>('/api/requisitions', data);
    return res.data;
  },

  submitDraft: async (id: number): Promise<RequisitionResponse> => {
    const res = await apiClient.post<RequisitionResponse>(`/api/requisitions/${id}/submit`);
    return res.data;
  },

  getById: async (id: number): Promise<RequisitionResponse> => {
    const res = await apiClient.get<RequisitionResponse>(`/api/requisitions/${id}`);
    return res.data;
  },

  list: async (params?: { status?: string; departmentId?: number; keyword?: string; page?: number; size?: number }) => {
    const res = await apiClient.get('/api/requisitions', { params });
    return res.data;
  },

  deleteDraft: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/requisitions/${id}`);
  },
};
