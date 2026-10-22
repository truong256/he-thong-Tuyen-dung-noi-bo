import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Permission } from '../common/permissions';
import { AuthenticatedRequest, AuthUser } from './auth.types';
import { unauthenticated } from '../common/errors';

export const IS_PUBLIC_KEY = 'auth:isPublic';
export const PERMISSIONS_KEY = 'auth:permissions';

/** Endpoint không cần đăng nhập (health check, dev-login). */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);

/** Người dùng phải có TẤT CẢ quyền được liệt kê. Endpoint không khai báo sẽ bị từ chối mặc định. */
export const RequirePermissions = (...permissions: Permission[]): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const user = ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
  if (!user) throw unauthenticated();
  return user;
});
