import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './guards';
import { Role } from './roles.enum';

/** Mặc định TỪ CHỐI: endpoint không khai báo @Roles thì không ai (kể cả Admin) vào được. */
describe('RolesGuard — default deny', () => {
  const ctxFor = (user: unknown): ExecutionContext =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  const guardWith = (meta: { isPublic?: boolean; roles?: Role[] }) => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: unknown) =>
      key === 'isPublic' ? meta.isPublic : meta.roles,
    );
    return new RolesGuard(reflector);
  };
  const admin = { id: 1, email: 'a', roles: [Role.ADMIN], departmentId: null };

  it('không khai báo @Roles => 403 kể cả Admin', () => {
    expect(() => guardWith({}).canActivate(ctxFor(admin))).toThrow(ForbiddenException);
  });
  it('@Roles rỗng => 403', () => {
    expect(() => guardWith({ roles: [] }).canActivate(ctxFor(admin))).toThrow(ForbiddenException);
  });
  it('đúng vai trò => cho qua; sai vai trò => 403', () => {
    expect(guardWith({ roles: [Role.ADMIN] }).canActivate(ctxFor(admin))).toBe(true);
    expect(() => guardWith({ roles: [Role.HR_MANAGER] }).canActivate(ctxFor(admin))).toThrow(ForbiddenException);
  });
  it('@Public => cho qua; chưa có user => 403', () => {
    expect(guardWith({ isPublic: true }).canActivate(ctxFor(undefined))).toBe(true);
    expect(() => guardWith({ roles: [Role.ADMIN] }).canActivate(ctxFor(undefined))).toThrow(ForbiddenException);
  });
});
