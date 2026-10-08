import apiClient from './client';
import { PageResponse } from '../types/user';
import { InterviewQuestion } from '../types/interviewQuestion';

export interface InterviewQuestionFilters {
  search?: string;
  difficultyLevel?: string;
  jobTitleId?: number;
  criterionId?: number;
  active?: boolean;
  page?: number;
  size?: number;
}

export const interviewQuestionApi = {
  list: async (
    filters: InterviewQuestionFilters = {}
  ): Promise<PageResponse<InterviewQuestion>> => {
    const params = new URLSearchParams();

    if (filters.search) {
      params.append('search', filters.search);
    }

    if (filters.difficultyLevel) {
      params.append('difficultyLevel', filters.difficultyLevel);
    }

    if (filters.jobTitleId !== undefined) {
      params.append('jobTitleId', String(filters.jobTitleId));
    }

    if (filters.criterionId !== undefined) {
      params.append('criterionId', String(filters.criterionId));
    }

    if (filters.active !== undefined) {
      params.append('active', String(filters.active));
    }

    params.append('page', String(filters.page ?? 0));
    params.append('size', String(filters.size ?? 20));

    const res = await apiClient.get<PageResponse<InterviewQuestion>>(
      `/api/interview-questions?${params.toString()}`
    );

    return res.data;
  },

  getById: async (id: number): Promise<InterviewQuestion> => {
    const res = await apiClient.get<InterviewQuestion>(
      `/api/interview-questions/${id}`
    );

    return res.data;
  },
};

export default interviewQuestionApi;