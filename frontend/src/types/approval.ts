export interface ApprovalStep {
  stepOrder: number;
  stepName: string;
  approverId?: number;
  approverName?: string;
  approverEmail?: string;
  approverRole?: string;
  action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'WAITING' | 'PENDING' | 'NOT_STARTED';
  status: 'COMPLETED' | 'PENDING' | 'UPCOMING' | 'REJECTED';
  actionAt?: string;
  comments?: string;
  isCurrentStep: boolean;
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
