import apiClient, { apiClient as namedApiClient } from './client';
import {
  Requisition,
  RequisitionPayload,
  RequisitionFilterParams,
  RequisitionPageResponse,
} from '../types/requisition';

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

const client = namedApiClient || apiClient;

function mapToBackendPayload(payload: any) {
  const minSal = payload.salaryMin !== undefined ? payload.salaryMin : (payload.proposedMinSalary !== undefined ? payload.proposedMinSalary : undefined);
  const maxSal = payload.salaryMax !== undefined ? payload.salaryMax : (payload.proposedMaxSalary !== undefined ? payload.proposedMaxSalary : undefined);
  const nDate = payload.neededDate || payload.targetDate || undefined;
  const reqs = payload.candidateRequirements || payload.requirements || undefined;
  const rType = payload.recruitmentType || (payload.reason === 'REPLACEMENT' ? 'REPLACEMENT' : 'NEW_HEADCOUNT');
  const rReason = payload.reason || (rType === 'REPLACEMENT' ? 'Thay thế nhân sự' : 'Tăng mới theo kế hoạch định biên');

  return {
    ...payload,
    salaryMin: minSal,
    salaryMax: maxSal,
    neededDate: nDate,
    targetDate: nDate,
    candidateRequirements: reqs,
    recruitmentType: rType,
    reason: rReason,
  };
}

function mapFromBackendResponse(item: any): Requisition {
  return {
    ...item,
    proposedMinSalary: item.salaryMin !== undefined ? item.salaryMin : item.proposedMinSalary,
    proposedMaxSalary: item.salaryMax !== undefined ? item.salaryMax : item.proposedMaxSalary,
    targetDate: item.neededDate || item.targetDate,
    requirements: item.candidateRequirements || item.requirements,
  };
}

export const requisitionApi = {
  list: async (params?: RequisitionFilterParams | { status?: string; departmentId?: number; search?: string; keyword?: string; page?: number; size?: number }): Promise<RequisitionPageResponse> => {
    const query = new URLSearchParams();
    if ((params as any)?.search) query.append('search', (params as any).search);
    if ((params as any)?.keyword) query.append('search', (params as any).keyword);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.departmentId) query.append('departmentId', String(params.departmentId));
    if (params?.page !== undefined) query.append('page', String(params.page));
    if (params?.size !== undefined) query.append('size', String(params.size));

    const qs = query.toString();
    const res = await client.get<any>(`/api/requisitions${qs ? `?${qs}` : ''}`);
    const data = res.data;

    if (Array.isArray(data)) {
      const items = data.map(mapFromBackendResponse);
      return {
        content: items,
        totalElements: items.length,
        totalPages: 1,
        size: items.length,
        number: 0,
      };
    }

    if (data && Array.isArray(data.content)) {
      return {
        ...data,
        content: data.content.map(mapFromBackendResponse),
      };
    }

    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 10,
      number: 0,
    };
  },

  getById: async (id: number): Promise<Requisition> => {
    const res = await client.get<any>(`/api/requisitions/${id}`);
    return mapFromBackendResponse(res.data);
  },

  create: async (payload: RequisitionPayload | CreateRequisitionRequest): Promise<Requisition> => {
    const body = mapToBackendPayload(payload);
    const endpoint = (payload as any).isDraft ? '/api/requisitions/draft' : '/api/requisitions';
    const res = await client.post<any>(endpoint, body);
    return mapFromBackendResponse(res.data);
  },

  update: async (id: number, payload: RequisitionPayload | RequisitionDraftRequest): Promise<Requisition> => {
    const body = mapToBackendPayload(payload);
    const endpoint = (payload as any).isDraft ? `/api/requisitions/${id}/draft` : `/api/requisitions/${id}`;
    const res = await client.put<any>(endpoint, body);
    return mapFromBackendResponse(res.data);
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/api/requisitions/${id}`);
  },

  saveDraft: async (data: RequisitionDraftRequest): Promise<RequisitionResponse> => {
    const body = mapToBackendPayload(data);
    const res = await client.post<any>('/api/requisitions/draft', body);
    return res.data;
  },

  updateDraft: async (id: number, data: RequisitionDraftRequest): Promise<RequisitionResponse> => {
    const body = mapToBackendPayload(data);
    const res = await client.put<any>(`/api/requisitions/${id}/draft`, body);
    return res.data;
  },

  createAndSubmit: async (data: CreateRequisitionRequest): Promise<RequisitionResponse> => {
    const body = mapToBackendPayload(data);
    const res = await client.post<any>('/api/requisitions', body);
    return res.data;
  },

  submitDraft: async (id: number): Promise<RequisitionResponse> => {
    const res = await client.post<any>(`/api/requisitions/${id}/submit`);
    return res.data;
  },

  deleteDraft: async (id: number): Promise<void> => {
    await client.delete(`/api/requisitions/${id}`);
  },
};

export default requisitionApi;
