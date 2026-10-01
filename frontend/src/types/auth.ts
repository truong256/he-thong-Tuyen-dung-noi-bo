export type RoleName =
  | 'CANDIDATE'
  | 'RECRUITER'
  | 'HIRING_MANAGER'
  | 'INTERVIEWER'
  | 'HR_MANAGER'
  | 'APPROVER'
  | 'ADMIN';

export interface UserSummary {
  id: number;
  email: string;
  fullName: string;
  department?: string;
  role: string;
  roles: string[];
  status: string;
  lockReason?: string;
  lockNote?: string;
  lockedAt?: string;
  lockedBy?: string;
  handoverWarnings?: string[];
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: UserSummary;
}

export interface ApiError {
  timestamp?: string;
  status: number;
  code: string;
  message: string;
  path?: string;
  validationErrors?: Record<string, string>;
  lockedUntil?: string | null;
}
