import apiClient from './client';
import {
  WithdrawalValidationResponse,
  WithdrawApplicationRequest,
  WithdrawalResultResponse,
} from '../types/withdrawal';

export const withdrawalApi = {
  /**
   * Validate withdrawal token without mutating any state (safe GET)
   */
  validateToken: async (token: string): Promise<WithdrawalValidationResponse> => {
    const response = await apiClient.get<WithdrawalValidationResponse>('/api/public/applications/withdraw', {
      params: { token },
    });
    return response.data;
  },

  /**
   * Confirm application withdrawal (POST)
   */
  confirmWithdrawal: async (payload: WithdrawApplicationRequest): Promise<WithdrawalResultResponse> => {
    const response = await apiClient.post<WithdrawalResultResponse>('/api/public/applications/withdraw', payload);
    return response.data;
  },

  /**
   * Candidate withdrawal when authenticated (POST)
   */
  withdrawByCandidate: async (applicationId: number, reason?: string): Promise<WithdrawalResultResponse> => {
    const response = await apiClient.post<WithdrawalResultResponse>(`/api/candidate/applications/${applicationId}/withdraw`, {
      reason,
    });
    return response.data;
  },
};

export default withdrawalApi;
