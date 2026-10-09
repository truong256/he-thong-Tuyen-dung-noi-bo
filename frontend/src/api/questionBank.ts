import apiClient from './client';
import {
  InterviewQuestion,
  CompetencyCriterion,
  QuestionFilterState,
  CreateQuestionPayload,
  UpdateQuestionPayload,
} from '../types/questionBank';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  empty: boolean;
}

export const questionBankApi = {
  search: async (filters?: Partial<QuestionFilterState>): Promise<PageResponse<InterviewQuestion>> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.difficultyLevel && filters.difficultyLevel !== 'ALL') {
      params.append('difficultyLevel', filters.difficultyLevel);
    }
    if (filters?.jobTitleId && filters.jobTitleId !== 'ALL') {
      params.append('jobTitleId', String(filters.jobTitleId));
    }
    if (filters?.criterionId && filters.criterionId !== 'ALL') {
      params.append('criterionId', String(filters.criterionId));
    }
    if (filters?.active !== undefined && filters.active !== 'ALL') {
      params.append('active', String(filters.active));
    }
    params.append('page', String(filters?.page ?? 0));
    params.append('size', String(filters?.size ?? 20));

    const res = await apiClient.get<PageResponse<InterviewQuestion>>(`/api/questions?${params.toString()}`);
    return res.data;
  },

  getById: async (id: number): Promise<InterviewQuestion> => {
    const res = await apiClient.get<InterviewQuestion>(`/api/questions/${id}`);
    return res.data;
  },

  create: async (payload: CreateQuestionPayload): Promise<InterviewQuestion> => {
    const res = await apiClient.post<InterviewQuestion>('/api/questions', payload);
    return res.data;
  },

  update: async (id: number, payload: UpdateQuestionPayload): Promise<InterviewQuestion> => {
    const res = await apiClient.put<InterviewQuestion>(`/api/questions/${id}`, payload);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/questions/${id}`);
  },

  getCriteria: async (jobTitleId?: number | 'ALL'): Promise<CompetencyCriterion[]> => {
    const params = new URLSearchParams();
    if (jobTitleId && jobTitleId !== 'ALL') {
      params.append('jobTitleId', String(jobTitleId));
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<CompetencyCriterion[]>(`/api/questions/criteria${query}`);
    return res.data;
  },
};

export default questionBankApi;
