import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../common/permissions';
import { Role } from '../common/roles';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from './auth.decorators';
import { AuthenticatedRequest } from './auth.types';
import { PermissionsGuard } from './permissions.guard';

function contextFor(user: AuthenticatedRequest['user'], meta: { permissions?: Permission[]; isPublic?: boolean }): ExecutionContext {
  const handler = () => undefined;
  if (meta.permissions) Reflect.defineMetadata(PERMISSIONS_KEY, meta.permissions, handler);
  if (meta.isPublic) Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
  class Controller {}
  return {
    getHandler: () => handler,
    getClass: () => Controller,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const user = (role: Role) => ({ id: 'u', email: 'u@x.com', role });
const guard = new PermissionsGuard(new Reflector());

describe('PermissionsGuard', () => {
  it('endpoint @Public được qua', () => {
    expect(guard.canActivate(contextFor(undefined, { isPublic: true }))).toBe(true);
  });

  it('MẶC ĐỊNH TỪ CHỐI: endpoint không khai báo quyền bị 403 kể cả với HR Manager', () => {
    expect(() => guard.canActivate(contextFor(user(Role.HR_MANAGER), {}))).toThrow(
      expect.objectContaining({ status: 403, response: expect.objectContaining({ code: 'ENDPOINT_NOT_DECLARED' }) }),
    );
    expect(() => guard.canActivate(contextFor(user(Role.HR_MANAGER), { permissions: [] }))).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });

  it('chưa xác thực => 401', () => {
    expect(() => guard.canActivate(contextFor(undefined, { permissions: [Permission.JOB_TITLE_READ] }))).toThrow(
      expect.objectContaining({ status: 401 }),
    );
  });

  it('đủ quyền thì qua', () => {
    expect(guard.canActivate(contextFor(user(Role.HR_MANAGER), { permissions: [Permission.SALARY_BAND_READ] }))).toBe(true);
  });

  it('thiếu quyền xem lương => 403 với mã SALARY_BAND_FORBIDDEN và thông báo tiếng Việt', () => {
    expect(() => guard.canActivate(contextFor(user(Role.INTERVIEWER), { permissions: [Permission.SALARY_BAND_READ] }))).toThrow(
      expect.objectContaining({
        status: 403,
        response: expect.objectContaining({
          code: 'SALARY_BAND_FORBIDDEN',
          message: 'Bạn không có quyền xem dải lương. Chỉ Trưởng phòng Nhân sự được xem.',
        }),
      }),
    );
  });

  it('thiếu quyền khác => 403 PERMISSION_DENIED', () => {
    expect(() => guard.canActivate(contextFor(user(Role.RECRUITER), { permissions: [Permission.JOB_TITLE_WRITE] }))).toThrow(
      expect.objectContaining({ status: 403, response: expect.objectContaining({ code: 'PERMISSION_DENIED' }) }),
    );
  });

  it('yêu cầu nhiều quyền thì phải có đủ tất cả', () => {
    const perms = [Permission.JOB_TITLE_READ, Permission.JOB_TITLE_WRITE];
    expect(() => guard.canActivate(contextFor(user(Role.APPROVER), { permissions: perms }))).toThrow();
    expect(guard.canActivate(contextFor(user(Role.HR_MANAGER), { permissions: perms }))).toBe(true);
  });
});
