export interface Requisition {
  id: number;
  requisitionCode: string;
  title: string;
  departmentId: number;
  departmentName?: string;
  jobTitleId: number;
  jobTitleName?: string;
  quantity: number;
  targetDate?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason: 'REPLACEMENT' | 'NEW_HEADCOUNT';
  proposedMinSalary?: number;
  proposedMaxSalary?: number;
  salaryExplanation?: string;
  jobDescription?: string;
  requirements?: string;
  createdByUserId?: number;
  createdByName?: string;
  createdAt?: string;
}

export interface RequisitionPayload {
  title: string;
  departmentId: number;
  jobTitleId: number;
  quantity: number;
  reason: 'REPLACEMENT' | 'NEW_HEADCOUNT';
  proposedMinSalary?: number;
  proposedMaxSalary?: number;
  salaryExplanation?: string;
  targetDate?: string;
  jobDescription?: string;
  requirements?: string;
  isDraft?: boolean;
}

export interface RequisitionFilterParams {
  search?: string;
  status?: string;
  departmentId?: number;
  page?: number;
  size?: number;
}

export interface RequisitionPageResponse {
  content: Requisition[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
