import apiClient from './client';

export interface ApprovalStepRequest {
  minimumSalary: number;
  approverUserId: number;
}

export interface ApprovalConfigurationRequest {
  departmentId: number;
  steps: ApprovalStepRequest[];
}

export interface ApprovalStepResponse extends ApprovalStepRequest {
  stepOrder: number;
  approverName: string | null;
}

export interface ApprovalConfiguration {
  id: number;
  departmentId: number;
  departmentName: string | null;
  version: number;
  active: boolean;
  createdAt: string;
  deactivatedAt: string | null;
  steps: ApprovalStepResponse[];
}

export const approvalConfigurationApi = {
  list: async (departmentId?: number): Promise<ApprovalConfiguration[]> => {
    const params = departmentId ? { departmentId } : undefined;
    const response = await apiClient.get<ApprovalConfiguration[]>(
      '/api/requisition-approval-configurations',
      { params },
    );
    return response.data;
  },

  create: async (payload: ApprovalConfigurationRequest): Promise<ApprovalConfiguration> => {
    const response = await apiClient.post<ApprovalConfiguration>(
      '/api/requisition-approval-configurations',
      payload,
    );
    return response.data;
  },

  update: async (id: number, payload: ApprovalConfigurationRequest): Promise<ApprovalConfiguration> => {
    const response = await apiClient.put<ApprovalConfiguration>(
      `/api/requisition-approval-configurations/${id}`,
      payload,
    );
    return response.data;
  },

  deactivate: async (id: number): Promise<void> => {
    await apiClient.patch(`/api/requisition-approval-configurations/${id}/deactivate`);
  },
};