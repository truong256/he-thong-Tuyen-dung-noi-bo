export interface Requisition {
  id: number;
  requisitionCode: string;
  title: string;
  departmentId: number;
  departmentName?: string;
  departmentCode?: string;
  jobTitleId: number;
  jobTitleName?: string;
  jobTitleCode?: string;
  quantity: number;
  targetDate?: string;
  neededDate?: string;
 feature/scrum-128-129-clone-recruitment-request
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason: 'REPLACEMENT' | 'NEW_HEADCOUNT';

  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'ON_HOLD' | 'CLOSED' | 'OPEN' | string;
  rejectionReason?: string;
  reason?: string;
  recruitmentType?: 'REPLACEMENT' | 'NEW_HEADCOUNT' | string;
 dev
  proposedMinSalary?: number;
  proposedMaxSalary?: number;
  salaryMin?: number;
  salaryMax?: number;
 feature/scrum-128-129-clone-recruitment-request
  minSalary?: number;
  maxSalary?: number;

 dev
  salaryExplanation?: string;
  jobDescription?: string;
  requirements?: string;
  candidateRequirements?: string;
  createdByUserId?: number;
  createdByName?: string;
  approvedByUserId?: number;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RequisitionPayload {
  title: string;
  departmentId: number;
  jobTitleId: number;
  quantity: number;
  reason?: string;
  recruitmentType?: 'REPLACEMENT' | 'NEW_HEADCOUNT' | string;
  proposedMinSalary?: number;
  proposedMaxSalary?: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryExplanation?: string;
  targetDate?: string;
  neededDate?: string;
  jobDescription?: string;
  requirements?: string;
  candidateRequirements?: string;
  isDraft?: boolean;
}

export interface RequisitionFilterParams {
  search?: string;
  keyword?: string;
  status?: string;
  departmentId?: number;
  fromDate?: string;
  toDate?: string;
  recruiterId?: number;
  sla?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface RequisitionPageResponse {
  content: Requisition[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface AssignmentMember {
  userId: number;
  fullName: string;
  email: string;
  department?: string;
  role: string;
  isPrimary: boolean;
  assignedAt?: string;
  handoverRequired?: boolean;
}

export interface RequisitionAssignments {
  requisitionId: number;
  requisitionCode: string;
  requisitionTitle: string;
  primaryRecruiter?: AssignmentMember | null;
  supportRecruiters: AssignmentMember[];
  hiringManagers: AssignmentMember[];
}

export interface AssignmentHistoryItem {
  id: number;
  requisitionId: number;
  userId: number;
  userFullName: string;
  userEmail?: string;
  role: string;
  assignmentType: 'PRIMARY' | 'SUPPORT';
  action: 'ASSIGNED' | 'HANDOVER' | 'UNASSIGNED' | 'ROLE_CHANGED';
  previousUserId?: number;
  previousUserFullName?: string;
  performedByUserId?: number;
  performedByFullName?: string;
  reason?: string;
  notes?: string;
  createdAt: string;
}

export interface AssignableRecruiter {
  id: number;
  fullName: string;
  email: string;
  department?: string;
  username: string;
}

export interface AssignRecruiterPayload {
  primaryRecruiterId: number;
  supportRecruiterIds?: number[];
  reason?: string;
  notes?: string;
}

