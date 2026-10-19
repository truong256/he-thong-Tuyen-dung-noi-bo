/**
 * Referral Types for Sprint 4 / S4-07 (SCRUM-185)
 * Giới thiệu ứng viên nội bộ
 */

export type GeneralStatus =
  | 'SUBMITTED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED';

export interface Referral {
  id: number;
  candidateApplicationId?: number;
  jobPostingId?: number;
  jobPostingCode?: string;
  jobTitle?: string;
  departmentId?: number;
  departmentName?: string;
  requisitionId?: number;
  requisitionCode?: string;

  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  cvUrl?: string;
  relationship?: string;
  referralNotes: string;

  referrerUserId: number;
  referrerName: string;
  referrerEmail?: string;
  source: string;

  generalStatus: GeneralStatus;
  generalStatusLabel: string;

  createdAt: string;
  updatedAt: string;
}

export interface ReferralCreatePayload {
  jobPostingId?: number | null;
  requisitionId?: number | null;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  cvUrl?: string;
  relationship?: string;
  referralNotes: string;
}

export interface ReferralStatusUpdatePayload {
  generalStatus: string;
  notes?: string;
}

export interface ReferralActivePosition {
  jobPostingId?: number;
  requisitionId?: number;
  jobCode?: string;
  requisitionCode?: string;
  title: string;
  departmentId?: number;
  departmentName?: string;
  workLocation?: string;
  workingModel?: string;
  applicationDeadline?: string;
  quantity?: number;
}

export interface ReferralStats {
  total: number;
  submitted: number;
  screening: number;
  interview: number;
  offer: number;
  hired: number;
  rejected: number;
}
