import apiClient from './client';
import {
  CandidateSummary,
  CandidateDetail,
  CvParseResult,
  ConfirmCandidateInfoRequest,
  CandidateSearchParams,
} from '../types/candidate';
import { PageResponse } from './jobPosting';

export const candidateApi = {
  list: async (params?: CandidateSearchParams): Promise<PageResponse<CandidateSummary>> => {
    // Uses search endpoint if keyword or stage is provided, else fallback to standard /api/candidates
    const endpoint = (params?.keyword || params?.stage) ? '/api/candidates/search' : '/api/candidates';
    const response = await apiClient.get<PageResponse<CandidateSummary>>(endpoint, { params });
    return response.data;
  },

  getDetail: async (id: number): Promise<CandidateDetail> => {
    const response = await apiClient.get<CandidateDetail>(`/api/candidates/${id}/detail`);
    return response.data;
  },

  parseCv: async (file: File): Promise<CvParseResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<CvParseResult>('/api/candidates/parse-cv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  reparseCv: async (id: number, file?: File): Promise<CandidateDetail> => {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    const response = await apiClient.post<CandidateDetail>(`/api/candidates/${id}/reparse-cv`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  confirmParsedInfo: async (id: number, payload: ConfirmCandidateInfoRequest): Promise<CandidateDetail> => {
    const response = await apiClient.put<CandidateDetail>(`/api/candidates/${id}/confirm-parsed`, payload);
    return response.data;
  },

  create: async (formData: FormData): Promise<CandidateDetail> => {
    const response = await apiClient.post<CandidateDetail>('/api/candidates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  applyPublic: async (formData: FormData): Promise<CandidateDetail> => {
    const response = await apiClient.post<CandidateDetail>('/api/public/candidates/apply', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getCvUrl: (id: number): string => {
    return `/api/candidates/${id}/cv`;
  },
};

export default candidateApi;
