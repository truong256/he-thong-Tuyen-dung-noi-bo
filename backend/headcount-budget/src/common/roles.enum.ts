export enum Role {
  ADMIN = 'ADMIN',
  HR_MANAGER = 'HR_MANAGER',
  RECRUITER = 'RECRUITER',
  HIRING_MANAGER = 'HIRING_MANAGER',
  INTERVIEWER = 'INTERVIEWER',
  APPROVER = 'APPROVER',
}

/** Quyền ghi ngân sách: HR Manager + Admin (Admin có toàn quyền theo ma trận phân quyền) */
export const BUDGET_WRITERS = [Role.HR_MANAGER, Role.ADMIN];
/** Quyền xem đầy đủ ngân sách (gồm ngân sách lương) */
export const BUDGET_FULL_READERS = [Role.HR_MANAGER, Role.ADMIN, Role.APPROVER];
/** Quyền xem số headcount còn lại (không có số liệu lương) */
export const BUDGET_REMAINING_READERS = [...BUDGET_FULL_READERS, Role.HIRING_MANAGER, Role.RECRUITER];
