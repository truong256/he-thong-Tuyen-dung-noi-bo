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
  password: string;
  fullName: string;
  roles: string[];
  status?: string;
}

export interface UpdateUserPayload {
  fullName: string;
  email: string;
}

export interface UpdateRolesPayload {
  roles: string[];
}

export interface UpdateStatusPayload {
  status: string;
}

export type { UserSummary };
