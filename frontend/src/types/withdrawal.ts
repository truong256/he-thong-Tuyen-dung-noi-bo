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
