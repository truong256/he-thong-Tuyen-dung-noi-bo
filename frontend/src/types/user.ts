import { UserSummary } from './auth';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface CreateUserPayload {
  email: string;
  recoveryEmail?: string;
  fullName: string;
  department?: string;
  roles: string[];
  status?: string;
  password?: string;
}

export interface UpdateUserPayload {
  fullName: string;
  email: string;
  recoveryEmail?: string;
  department?: string;
}

export interface UpdateRolesPayload {
  roles: string[];
}

export interface UpdateStatusPayload {
  status: string;
  reason?: string;
  note?: string;
}

export type { UserSummary };
