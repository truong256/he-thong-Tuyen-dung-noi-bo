import apiClient from './client';
import {
  JobPosting,
  JobPostingRequest,
  JobPostingPublic,
  JobPostingAuditLog,
} from '../types/jobPosting';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const jobPostingApi = {
  getPublicDepartments: async (): Promise<Array<{ id: number; name: string }>> => {
    const response = await apiClient.get<Array<{ id: number; name: string }>>('/api/public/job-postings/departments');
    return response.data;
  },

  getPublicLocations: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/api/public/job-postings/locations');
    return response.data;
  },

  // 1. Quản lý nội bộ
  list: async (params?: {
    status?: string;
    departmentId?: number;
    keyword?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<JobPosting>> => {
    const response = await apiClient.get<PageResponse<JobPosting>>('/api/job-postings', { params });
    return response.data;
  },

  getDetail: async (id: number): Promise<JobPosting> => {
    const response = await apiClient.get<JobPosting>(`/api/job-postings/${id}`);
    return response.data;
  },

  create: async (payload: JobPostingRequest): Promise<JobPosting> => {
    const response = await apiClient.post<JobPosting>('/api/job-postings', payload);
    return response.data;
  },

  createFromRequisition: async (requisitionId: number): Promise<JobPosting> => {
    const response = await apiClient.post<JobPosting>(`/api/job-postings/from-requisition/${requisitionId}`);
    return response.data;
  },

  update: async (id: number, payload: JobPostingRequest): Promise<JobPosting> => {
    const response = await apiClient.put<JobPosting>(`/api/job-postings/${id}`, payload);
    return response.data;
  },

  submitApproval: async (id: number): Promise<JobPosting> => {
    const response = await apiClient.post<JobPosting>(`/api/job-postings/${id}/submit-approval`);
    return response.data;
  },

  // 2. SCRUM-149: Duyệt và xuất bản (HR Manager)
  approve: async (id: number, notes?: string): Promise<JobPosting> => {
    const response = await apiClient.post<JobPosting>(`/api/job-postings/${id}/approve`, { notes });
    return response.data;
  },

  publish: async (id: number, notes?: string): Promise<JobPosting> => {
    const response = await apiClient.post<JobPosting>(`/api/job-postings/${id}/publish`, { notes });
    return response.data;
  },

  approveAndPublish: async (id: number, notes?: string): Promise<JobPosting> => {
    const response = await apiClient.post<JobPosting>(`/api/job-postings/${id}/approve-and-publish`, { notes });
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<JobPosting> => {
    const response = await apiClient.post<JobPosting>(`/api/job-postings/${id}/reject`, { reason });
    return response.data;
  },

  // 3. SCRUM-150: Gỡ tin tuyển dụng
  unpublish: async (id: number, reason: string): Promise<JobPosting> => {
    const response = await apiClient.post<JobPosting>(`/api/job-postings/${id}/unpublish`, { reason });
    return response.data;
  },

  getAuditLogs: async (id: number): Promise<JobPostingAuditLog[]> => {
    const response = await apiClient.get<JobPostingAuditLog[]>(`/api/job-postings/${id}/audit-logs`);
    return response.data;
  },

  // 4. API Công khai (Public Careers)
  listPublic: async (params?: {
    departmentId?: number;
    workingModel?: string;
    workLocation?: string;
    keyword?: string;
    includeExpired?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<JobPostingPublic>> => {
    const response = await apiClient.get<PageResponse<JobPostingPublic>>('/api/public/job-postings', { params });
    return response.data;
  },

  getPublicDetail: async (id: number): Promise<JobPostingPublic> => {
    const response = await apiClient.get<JobPostingPublic>(`/api/public/job-postings/${id}`);
    return response.data;
  },

  applyPublic: async (
    id: number,
    payload: import('../types/jobPosting').PublicJobApplicationPayload | FormData
  ): Promise<import('../types/jobPosting').PublicJobApplicationResult> => {
    const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
    const response = await apiClient.post<import('../types/jobPosting').PublicJobApplicationResult>(
      `/api/public/job-postings/${id}/apply`,
      payload,
      isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined
    );
    return response.data;
  },
};

export default jobPostingApi;
