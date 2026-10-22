/**
 * 7 vai trò (gồm Admin) theo sheet "2. User Roles" của Product Backlog.
 */
export enum Role {
  CANDIDATE = 'CANDIDATE',
  RECRUITER = 'RECRUITER',
  HIRING_MANAGER = 'HIRING_MANAGER',
  INTERVIEWER = 'INTERVIEWER',
  HR_MANAGER = 'HR_MANAGER',
  APPROVER = 'APPROVER',
  ADMIN = 'ADMIN',
}

export const ROLE_LABELS_VI: Readonly<Record<Role, string>> = {
  [Role.CANDIDATE]: 'Ứng viên',
  [Role.RECRUITER]: 'Nhân viên tuyển dụng',
  [Role.HIRING_MANAGER]: 'Trưởng bộ phận',
  [Role.INTERVIEWER]: 'Người phỏng vấn',
  [Role.HR_MANAGER]: 'Trưởng phòng Nhân sự',
  [Role.APPROVER]: 'Người duyệt',
  [Role.ADMIN]: 'Quản trị hệ thống',
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (Object.values(Role) as string[]).includes(value);
}
