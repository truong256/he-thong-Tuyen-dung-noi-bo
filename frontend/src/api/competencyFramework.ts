import apiClient from './client';
import {
  CompetencyFramework,
  CreateCompetencyFrameworkPayload,
  UpdateCompetencyFrameworkPayload,
} from '../types/competencyFramework';

export const competencyFrameworkApi = {
  getFrameworks: async (search?: string): Promise<CompetencyFramework[]> => {
    const params = new URLSearchParams();
    if (search && search.trim()) {
      params.append('search', search.trim());
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<CompetencyFramework[]>(`/api/competency-frameworks${query}`);
    return res.data;
  },

  getFrameworkById: async (id: number): Promise<CompetencyFramework> => {
    const res = await apiClient.get<CompetencyFramework>(`/api/competency-frameworks/${id}`);
    return res.data;
  },

  createFramework: async (payload: CreateCompetencyFrameworkPayload): Promise<CompetencyFramework> => {
    const res = await apiClient.post<CompetencyFramework>('/api/competency-frameworks', payload);
    return res.data;
  },

  updateFramework: async (
    id: number,
    payload: UpdateCompetencyFrameworkPayload
  ): Promise<CompetencyFramework> => {
    const res = await apiClient.put<CompetencyFramework>(`/api/competency-frameworks/${id}`, payload);
    return res.data;
  },

  deleteFramework: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/competency-frameworks/${id}`);
  },
};

export default competencyFrameworkApi;
