import apiClient from './client';
import {
  Referral,
  ReferralCreatePayload,
  ReferralStatusUpdatePayload,
  ReferralActivePosition,
} from '../types/referral';
import { PageResponse } from './jobPosting';

export const referralApi = {
  /**
   * Nhân sự nội bộ nộp hồ sơ giới thiệu ứng viên cho một vị trí đang tuyển
   */
  submit: async (payload: ReferralCreatePayload): Promise<Referral> => {
    const response = await apiClient.post<Referral>('/api/referrals', payload);
    return response.data;
  },

  /**
   * Tra cứu danh sách hồ sơ do chính người dùng đăng nhập giới thiệu
   */
  getMyReferrals: async (params?: {
    keyword?: string;
    status?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<Referral>> => {
    const response = await apiClient.get<PageResponse<Referral>>('/api/referrals/my-referrals', { params });
    return response.data;
  },

  /**
   * Xem chi tiết một hồ sơ đã giới thiệu
   */
  getDetail: async (id: number): Promise<Referral> => {
    const response = await apiClient.get<Referral>(`/api/referrals/${id}`);
    return response.data;
  },

  /**
   * Quản lý toàn bộ hồ sơ giới thiệu (Dành cho HR Manager, Admin, Recruiter)
   */
  getAllReferrals: async (params?: {
    keyword?: string;
    status?: string;
    referrerId?: number;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<Referral>> => {
    const response = await apiClient.get<PageResponse<Referral>>('/api/referrals', { params });
    return response.data;
  },

  /**
   * Cập nhật trạng thái ở mức tổng quát (HR Manager, Admin, Recruiter)
   */
  updateGeneralStatus: async (id: number, payload: ReferralStatusUpdatePayload): Promise<Referral> => {
    const response = await apiClient.patch<Referral>(`/api/referrals/${id}/status`, payload);
    return response.data;
  },

  /**
   * Danh sách vị trí đang tuyển dụng để chọn trong form giới thiệu
   */
  getActivePositions: async (): Promise<ReferralActivePosition[]> => {
    const response = await apiClient.get<ReferralActivePosition[]>('/api/referrals/active-positions');
    return response.data;
  },
};

export default referralApi;
