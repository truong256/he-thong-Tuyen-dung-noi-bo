import apiClient from './client';
import {
  BudgetSummary,
  BudgetDashboardStats,
  CreateBudgetPayload,
  UpdateBudgetPayload,
  EvaluateBudgetPayload,
  BudgetEvaluation,
  OverrideApprovalPayload,
  BudgetOverrideResponse,
  BudgetAuditLog,
  PagedResponse,
  BudgetStatus,
} from '../types/budget';

export interface BudgetFilterParams {
  year?: number;
  departmentId?: number;
  status?: BudgetStatus | 'ALL';
  page?: number;
  size?: number;
}

export interface BudgetAuditLogFilterParams {
  departmentId?: number;
  year?: number;
  page?: number;
  size?: number;
}

export const budgetApi = {
  /**
   * GET /api/headcount-budgets
   * Phân trang danh sách ngân sách phòng ban theo năm, phòng ban, trạng thái
   */
  searchBudgets: async (filters?: BudgetFilterParams): Promise<PagedResponse<BudgetSummary>> => {
    const params = new URLSearchParams();
    if (filters?.year) params.append('year', String(filters.year));
    if (filters?.departmentId) params.append('departmentId', String(filters.departmentId));
    if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
    params.append('page', String(filters?.page ?? 0));
    params.append('size', String(filters?.size ?? 10));

    const res = await apiClient.get<PagedResponse<BudgetSummary>>(`/api/headcount-budgets?${params.toString()}`);
    return res.data;
  },

  /**
   * GET /api/headcount-budgets/stats
   * 4 Thẻ thống kê KPI tổng quan ngân sách
   */
  getBudgetStats: async (year?: number): Promise<BudgetDashboardStats> => {
    const params = new URLSearchParams();
    if (year) params.append('year', String(year));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<BudgetDashboardStats>(`/api/headcount-budgets/stats${queryString}`);
    return res.data;
  },

  /**
   * GET /api/headcount-budgets/{id}
   */
  getBudgetById: async (id: number): Promise<BudgetSummary> => {
    const res = await apiClient.get<BudgetSummary>(`/api/headcount-budgets/${id}`);
    return res.data;
  },

  /**
   * POST /api/headcount-budgets
   * Khai báo định mức ngân sách mới cho phòng ban & năm
   */
  createBudget: async (payload: CreateBudgetPayload): Promise<BudgetSummary> => {
    const res = await apiClient.post<BudgetSummary>('/api/headcount-budgets', payload);
    return res.data;
  },

  /**
   * PUT /api/headcount-budgets/{id}
   * Điều chỉnh định mức ngân sách phòng ban
   */
  updateBudget: async (id: number, payload: UpdateBudgetPayload): Promise<BudgetSummary> => {
    const res = await apiClient.put<BudgetSummary>(`/api/headcount-budgets/${id}`, payload);
    return res.data;
  },

  /**
   * DELETE /api/headcount-budgets/{id}
   * Xóa định mức ngân sách (chỉ khi chưa có yêu cầu tuyển dụng nào sử dụng)
   */
  deleteBudget: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/headcount-budgets/${id}`);
  },

  /**
   * POST /api/headcount-budgets/evaluate
   * Đánh giá tác động ngân sách realtime theo phòng ban và mức lương dự kiến
   */
  evaluateBudget: async (payload: EvaluateBudgetPayload): Promise<BudgetEvaluation> => {
    const res = await apiClient.post<BudgetEvaluation>('/api/headcount-budgets/evaluate', payload);
    return res.data;
  },

  /**
   * GET /api/headcount-budgets/logs
   * Lấy lịch sử biến động ngân sách và nhật ký phê duyệt vượt hạn mức
   */
  getBudgetAuditLogs: async (filters?: BudgetAuditLogFilterParams): Promise<PagedResponse<BudgetAuditLog>> => {
    const params = new URLSearchParams();
    if (filters?.departmentId) params.append('departmentId', String(filters.departmentId));
    if (filters?.year) params.append('year', String(filters.year));
    params.append('page', String(filters?.page ?? 0));
    params.append('size', String(filters?.size ?? 20));

    const res = await apiClient.get<PagedResponse<BudgetAuditLog>>(`/api/headcount-budgets/logs?${params.toString()}`);
    return res.data;
  },

  /**
   * POST /api/headcount-budgets/requisitions/{id}/override
   * HR Manager ghi đè ngoại lệ ngân sách/định biên cho yêu cầu tuyển dụng (S3-04 / SCRUM-101)
   */
  overrideBudget: async (requisitionId: number, payload: OverrideApprovalPayload): Promise<BudgetOverrideResponse> => {
    const res = await apiClient.post<BudgetOverrideResponse>(`/api/headcount-budgets/requisitions/${requisitionId}/override`, payload);
    return res.data;
  },

  /**
   * POST /api/headcount-budgets/requisitions/{id}/override-approve
   * HR Manager phê duyệt ghi đè yêu cầu tuyển dụng vượt ngân sách
   */
  overrideApproveRequisition: async (requisitionId: number, payload: OverrideApprovalPayload): Promise<any> => {
    const res = await apiClient.post(`/api/headcount-budgets/requisitions/${requisitionId}/override`, payload);
    return res.data;
  },
};

export default budgetApi;
