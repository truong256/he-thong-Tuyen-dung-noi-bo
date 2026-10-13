import { apiClient } from './client';
import {
  JobPosting,
  JobPostingPayload,
  JobPostingTemplate,
  JobPostingFilterParams,
  JobPostingPageResponse,
} from '../types/jobPosting';

export const jobPostingApi = {
  /**
   * Lấy dữ liệu khởi tạo tin tuyển dụng kế thừa từ yêu cầu đã duyệt
   */
  getTemplate: async (requisitionId: number): Promise<JobPostingTemplate> => {
    const response = await apiClient.get<JobPostingTemplate>(
      `/api/job-postings/template?requisitionId=${requisitionId}`
    );
    return response.data;
  },

  /**
   * Tạo mới tin tuyển dụng (nháp hoặc nộp duyệt)
   */
  create: async (payload: JobPostingPayload): Promise<JobPosting> => {
    const response = await apiClient.post<JobPosting>('/api/job-postings', payload);
    return response.data;
  },

  /**
   * Cập nhật tin tuyển dụng
   */
  update: async (id: number, payload: JobPostingPayload): Promise<JobPosting> => {
    const response = await apiClient.put<JobPosting>(`/api/job-postings/${id}`, payload);
    return response.data;
  },

  /**
   * Lấy chi tiết tin tuyển dụng theo ID
   */
  getById: async (id: number): Promise<JobPosting> => {
    const response = await apiClient.get<JobPosting>(`/api/job-postings/${id}`);
    return response.data;
  },

  /**
   * Lấy tin tuyển dụng gắn với yêu cầu tuyển dụng nguồn (nếu có)
   */
  getByRequisitionId: async (requisitionId: number): Promise<JobPosting | null> => {
    try {
      const response = await apiClient.get<JobPosting>(
        `/api/job-postings/by-requisition/${requisitionId}`
      );
      return response.status === 204 ? null : response.data;
    } catch (err: any) {
      if (err.response?.status === 204 || err.response?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  /**
   * Danh sách tin tuyển dụng có phân trang, tìm kiếm và lọc
   */
  list: async (params?: JobPostingFilterParams): Promise<JobPostingPageResponse> => {
    const response = await apiClient.get<JobPostingPageResponse>('/api/job-postings', {
      params,
    });
    return response.data;
  },
};

export default jobPostingApi;
