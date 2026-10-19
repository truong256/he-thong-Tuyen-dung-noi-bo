export interface CandidateSummary {
  id: number;
  requisitionId: number;
  fullName: string;
  email: string;
  phone?: string | null;
  stage: string;
  parsedStatus?: string;
  isParsedConfirmed?: boolean;
  cvFileName?: string | null;
  cvUrl?: string | null;
}

export interface CandidateDetail {
  id: number;
  requisitionId: number;
  candidateUserId?: number | null;
  interviewerUserId?: number | null;
  fullName: string;
  email: string;
  phone?: string | null;
  stage: string;
  candidateSourceId?: number | null;
  rejectionReasonId?: number | null;
  cvUrl?: string | null;
  cvFileName?: string | null;
  parsedFullName?: string | null;
  parsedEmail?: string | null;
  parsedPhone?: string | null;
  parsedStatus?: string;
  parsedMessage?: string | null;
  isParsedConfirmed: boolean;
  confirmedByUserId?: number | null;
  confirmedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CvParseResult {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  status: 'SUCCESS' | 'PARTIAL' | 'UNREADABLE_OR_EMPTY' | 'FAILED';
  message: string;
  pageCount: number;
  hasText: boolean;
}

export interface ConfirmCandidateInfoRequest {
  fullName: string;
  email: string;
  phone?: string;
  stage?: string;
}

export interface CandidateSearchParams {
  requisitionId?: number;
  stage?: string;
  keyword?: string;
  page?: number;
  size?: number;
}
