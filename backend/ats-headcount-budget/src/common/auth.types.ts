import { Role } from './roles.enum';

export interface AuthUser {
  id: number;
  email: string;
  roles: Role[];
  departmentId: number | null;
}
