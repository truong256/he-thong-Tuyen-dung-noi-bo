import { Role } from './roles';

/**
 * Quyền chi tiết (permission). Controller khai báo quyền cần có bằng
 * @RequirePermissions(...), guard kiểm ở TẦNG SERVER; service kiểm thêm một lần
 * nữa (defense in depth) trước khi trả dải lương.
 */
export enum Permission {
  /** Xem danh mục chức danh (KHÔNG gồm dải lương). */
  JOB_TITLE_READ = 'job-title:read',
  /** Tạo / sửa / ngừng áp dụng chức danh. */
  JOB_TITLE_WRITE = 'job-title:write',
  /** Xem mức lương tối thiểu / tối đa. Chỉ Trưởng phòng Nhân sự (S2-05). */
  SALARY_BAND_READ = 'salary-band:read',
}

/**
 * Ma trận quyền theo module "Danh mục tổ chức & vị trí":
 *   Candidate "–"; Interviewer / Hiring Mgr / Recruiter / Approver "R"; HR Manager "F".
 *
 * Riêng DẢI LƯƠNG: theo Acceptance Criteria S2-05 chỉ HR_MANAGER được xem,
 * kể cả ADMIN cũng không (xem README, mục "Giả định cần PO xác nhận").
 */
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  [Role.CANDIDATE]: [],
  [Role.INTERVIEWER]: [Permission.JOB_TITLE_READ],
  [Role.HIRING_MANAGER]: [Permission.JOB_TITLE_READ],
  [Role.RECRUITER]: [Permission.JOB_TITLE_READ],
  [Role.APPROVER]: [Permission.JOB_TITLE_READ],
  [Role.ADMIN]: [Permission.JOB_TITLE_READ],
  [Role.HR_MANAGER]: [
    Permission.JOB_TITLE_READ,
    Permission.JOB_TITLE_WRITE,
    Permission.SALARY_BAND_READ,
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
