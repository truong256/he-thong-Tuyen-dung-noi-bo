export interface ApprovalStep {
  stepOrder: number;
  stepName: string;
  approverId?: number;
  approverName?: string;
  approverEmail?: string;
  approverRole?: string;
  action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'WAITING' | 'PENDING' | 'NOT_STARTED' | 'REQUEST_CHANGES';
  status: 'COMPLETED' | 'PENDING' | 'UPCOMING' | 'REJECTED' | 'REQUEST_CHANGES';
  actionAt?: string;
  comments?: string;
  isCurrentStep: boolean;
  minimumSalary?: number;
}

export interface RequisitionApprovalTimeline {
  requisitionId: number;
  requisitionCode: string;
  title: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  currentStepOrder?: number;
  currentWaitingOn?: string;
  totalSteps: number;
  completedSteps: number;
  isCompleted: boolean;
  isRejected: boolean;
  rejectionReason?: string;
  submittedAt?: string;
  steps: ApprovalStep[];
}

export interface RequisitionApprovalLog {
  id: number;
  requisitionId: number;
  stepOrder?: number;
  action: string;
  comment?: string;
  approverUserId?: number;
  approverName?: string;
  approverEmail?: string;
  createdAt: string;
}
