/**
 * Các định nghĩa kiểu dữ liệu cho Tin tuyển dụng (Job Posting - S3-09)
 */

export type JobPostingStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'CLOSED';
export type WorkingModel = 'ONSITE' | 'HYBRID' | 'REMOTE';
export type SalaryType = 'RANGE' | 'EXACT' | 'NEGOTIABLE';

export interface JobPosting {
  id: number;
  postingCode: string;
  requisitionId: number;
  requisitionCode?: string;
  requisitionTitle?: string;
  departmentId?: number;
  departmentName?: string;
  jobTitleId?: number;
  jobTitleName?: string;
  title: string;
  jobDescription: string;
  candidateRequirements: string;
  benefits?: string;
  workLocation: string;
  workLocationId?: number;
  workingModel: WorkingModel;
  applicationDeadline: string; // YYYY-MM-DD
  showSalary: boolean;
  salaryType: SalaryType;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency: string;
  status: JobPostingStatus;
  createdByUserId: number;
  createdByName?: string;
  createdByEmail?: string;
  updatedByUserId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface JobPostingPayload {
  requisitionId: number;
  title: string;
  jobDescription: string;
  candidateRequirements: string;
  benefits?: string;
  workLocation: string;
  workLocationId?: number;
  workingModel: WorkingModel;
  applicationDeadline: string; // YYYY-MM-DD
  showSalary?: boolean;
  salaryType?: SalaryType;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  status?: 'DRAFT' | 'PENDING_APPROVAL';
}

export interface JobPostingTemplate {
  requisitionId: number;
  requisitionCode: string;
  requisitionTitle: string;
  departmentId?: number;
  departmentName?: string;
  jobTitleId?: number;
  jobTitleName?: string;
  quantity?: number;
  recruitmentType?: string;
  title: string;
  jobDescription: string;
  candidateRequirements: string;
  benefits?: string;
  workLocation: string;
  workLocationId?: number;
  workingModel: WorkingModel;
  applicationDeadline: string;
  showSalary: boolean;
  salaryType: SalaryType;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency: string;
  requisitionStatus: string;
}

export interface JobPostingFilterParams {
  status?: string;
  keyword?: string;
  requisitionId?: number;
  page?: number;
  size?: number;
}

export interface JobPostingPageResponse {
  content: JobPosting[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
