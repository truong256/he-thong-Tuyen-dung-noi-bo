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
  phone?: string;
  displayName?: string;
  department?: string;
  role: string;
  roles: string[];
  status: string;
  lockReason?: string;
  lockNote?: string;
  lockedAt?: string;
  lockedBy?: string;
  handoverWarnings?: string[];
  mustChangePassword?: boolean;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: UserSummary;
  mustChangePassword?: boolean;
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
