export interface WithdrawalValidationResponse {
  valid: boolean;
  applicationId?: number;
  candidateName?: string;
  positionTitle?: string;
  requisitionCode?: string;
  departmentName?: string;
  alreadyWithdrawn?: boolean;
  currentStage?: string;
  message?: string;
}

export interface WithdrawApplicationRequest {
  token: string;
  reason?: string;
}

export interface WithdrawalResultResponse {
  success: boolean;
  message: string;
  applicationId?: number;
  stage: string;
  withdrawnAt?: string;
}

export interface CandidateApplicationPortalItem {
  id: number;
  requisitionId: number;
  positionTitle: string;
  requisitionCode: string;
  fullName: string;
  email: string;
  stage: string;
  withdrawn: boolean;
  withdrawnAt?: string;
  withdrawalReason?: string;
  withdrawToken?: string;
}

