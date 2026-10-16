import apiClient, { apiClient as namedApiClient } from './client';
import { RequisitionApprovalTimeline } from '../types/approval';

const client = namedApiClient || apiClient;

export const approvalApi = {
  getTimeline: async (requisitionId: number): Promise<RequisitionApprovalTimeline> => {
    const res = await client.get<RequisitionApprovalTimeline>(`/api/requisitions/${requisitionId}/approval-history`);
    return res.data;
  },

  approve: async (requisitionId: number, comments?: string): Promise<RequisitionApprovalTimeline> => {
    const res = await client.put<RequisitionApprovalTimeline>(`/api/requisitions/${requisitionId}/approve`, {
      comments,
    });
    return res.data;
  },

  reject: async (
    requisitionId: number,
    rejectionReason: string,
    comments?: string
  ): Promise<RequisitionApprovalTimeline> => {
    const res = await client.put<RequisitionApprovalTimeline>(`/api/requisitions/${requisitionId}/reject`, {
      rejectionReason,
      comments,
    });
    return res.data;
  },

  requestChanges: async (
    requisitionId: number,
    comments: string
  ): Promise<RequisitionApprovalTimeline> => {
    const res = await client.post<RequisitionApprovalTimeline>(`/api/requisitions/${requisitionId}/request-changes`, {
      action: 'REQUEST_CHANGES',
      comment: comments,
      comments: comments,
    });
    return res.data;
  },
};

export default approvalApi;
