import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCode, forbidden, SALARY_FORBIDDEN_MESSAGE, unauthenticated } from '../common/errors';
import { hasPermission, Permission } from '../common/permissions';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from './auth.decorators';
import { AuthenticatedRequest } from './auth.types';

/**
 * Guard phân quyền toàn cục, chạy sau JwtAuthGuard.
 * Nguyên tắc MẶC ĐỊNH TỪ CHỐI (S1-05): endpoint không khai báo @Public() hay
 * @RequirePermissions() sẽ bị chặn, tránh lỡ tay để hở API.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, targets);
    if (!required || required.length === 0) {
      throw forbidden(
        ErrorCode.ENDPOINT_NOT_DECLARED,
        'Chức năng này chưa khai báo quyền truy cập nên bị từ chối theo mặc định.',
      );
    }

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user) throw unauthenticated();

    const missing = required.filter((p) => !hasPermission(user.role, p));
    if (missing.length === 0) return true;

    if (missing.includes(Permission.SALARY_BAND_READ)) {
      throw forbidden(ErrorCode.SALARY_BAND_FORBIDDEN, SALARY_FORBIDDEN_MESSAGE);
    }
    throw forbidden(ErrorCode.PERMISSION_DENIED, 'Bạn không có quyền thực hiện chức năng này.');
  }
}
