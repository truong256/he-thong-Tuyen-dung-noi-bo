import { hasPermission, Permission, ROLE_PERMISSIONS } from './permissions';
import { isRole, Role } from './roles';

describe('ma trận quyền', () => {
  it('chỉ Trưởng phòng Nhân sự có quyền xem dải lương', () => {
    const allowed = Object.values(Role).filter((r) => hasPermission(r, Permission.SALARY_BAND_READ));
    expect(allowed).toEqual([Role.HR_MANAGER]);
  });

  it('chỉ Trưởng phòng Nhân sự được ghi danh mục chức danh', () => {
    const writers = Object.values(Role).filter((r) => hasPermission(r, Permission.JOB_TITLE_WRITE));
    expect(writers).toEqual([Role.HR_MANAGER]);
  });

  it.each([Role.INTERVIEWER, Role.HIRING_MANAGER, Role.RECRUITER, Role.APPROVER, Role.ADMIN])(
    '%s đọc được danh mục nhưng không thấy lương',
    (role) => {
      expect(hasPermission(role, Permission.JOB_TITLE_READ)).toBe(true);
      expect(hasPermission(role, Permission.SALARY_BAND_READ)).toBe(false);
    },
  );

  it('ứng viên không có quyền nào', () => {
    expect(ROLE_PERMISSIONS[Role.CANDIDATE]).toHaveLength(0);
  });

  it('vai trò lạ không có quyền (mặc định từ chối)', () => {
    expect(hasPermission('HACKER' as Role, Permission.JOB_TITLE_READ)).toBe(false);
  });

  it('isRole nhận diện đúng', () => {
    expect(isRole('HR_MANAGER')).toBe(true);
    expect(isRole('hr_manager')).toBe(false);
    expect(isRole(42)).toBe(false);
  });
});
