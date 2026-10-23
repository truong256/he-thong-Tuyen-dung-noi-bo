export type JobPostingStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'UNPUBLISHED'
  | 'REJECTED'
  | 'CLOSED'
  | 'EXPIRED';

export interface JobPostingAuditLog {
  id: number;
  jobPostingId: number;
  userId: number;
  userName: string;
  userEmail: string;
  action: 'CREATE' | 'SUBMIT_APPROVAL' | 'APPROVE' | 'PUBLISH' | 'APPROVE_AND_PUBLISH' | 'UNPUBLISH' | 'REJECT' | 'UPDATE' | 'AUTO_EXPIRE';
  fromStatus?: string;
  toStatus?: string;
  note?: string;
  createdAt: string;
}

export interface AutoExpireResult {
  expiredCount: number;
  expiredPostingIds: number[];
  expiredJobCodes: string[];
  checkedDate: string;
  message: string;
}

export interface JobPosting {
  id: number;
  requisitionId?: number;
  requisitionCode?: string;
  jobCode: string;
  title: string;
  departmentId?: number;
  departmentName?: string;
  jobTitleId?: number;
  jobTitleName?: string;
  workLocation?: string;
  workLocationId?: number;
  employmentTypeId?: number;
  workingModel: 'ONSITE' | 'HYBRID' | 'REMOTE' | string;
  quantity: number;
  jobDescription?: string;
  requirements?: string;
  benefits?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  salaryVisible: boolean;
  applicationDeadline?: string;
  status: JobPostingStatus;

  approvedByUserId?: number;
  approvedByUserName?: string;
  approvedAt?: string;
  approvalNotes?: string;

  publishedByUserId?: number;
  publishedByUserName?: string;
  publishedAt?: string;

  unpublishedByUserId?: number;
  unpublishedByUserName?: string;
  unpublishedAt?: string;
  unpublishReason?: string;

  createdByUserId?: number;
  createdByUserName?: string;
  createdAt: string;
  updatedAt: string;

  auditLogs?: JobPostingAuditLog[];
}

export interface JobPostingRequest {
  title: string;
  requisitionId?: number;
  departmentId?: number;
  jobTitleId?: number;
  workLocation?: string;
  workLocationId?: number;
  employmentTypeId?: number;
  workingModel?: string;
  quantity?: number;
  jobDescription?: string;
  requirements?: string;
  benefits?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  salaryVisible?: boolean;
  applicationDeadline?: string;
}

export interface JobPostingPublic {
  id: number;
  jobCode: string;
  title: string;
  departmentId?: number;
  departmentName?: string;
  jobTitleId?: number;
  jobTitleName?: string;
  workLocation?: string;
  workingModel: string;
  quantity: number;
  jobDescription?: string;
  requirements?: string;
  benefits?: string;
  salaryVisible: boolean;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  salaryDisplay: string;
  applicationDeadline?: string;
  publishedAt?: string;
  expired?: boolean;
  canApply?: boolean;
  status?: string;
  expiredMessage?: string;
}

export interface PublicJobApplicationPayload {
  fullName: string;
  email: string;
  phone?: string;
  coverLetter?: string;
  cvFileUrl?: string;
}

export interface PublicJobApplicationResult {
  applicationId: number;
  jobPostingId: number;
  jobCode: string;
  title: string;
  fullName: string;
  email: string;
  status: string;
  message: string;
  appliedAt?: string;
}

export interface JobPostingFilterState {
  status?: string;
  departmentId?: number | '';
  keyword?: string;
  page: number;
  size: number;
}
