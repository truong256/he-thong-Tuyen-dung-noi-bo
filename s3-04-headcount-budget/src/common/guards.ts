import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY, ROLES_KEY } from './decorators';
import { Role } from './roles.enum';
import { AuthUser } from './auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Bạn cần đăng nhập để thực hiện thao tác này.',
      });
    }
    try {
      const payload = await this.jwt.verifyAsync(token);
      const user: AuthUser = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles,
        departmentId: payload.departmentId ?? null,
      };
      req.user = user;
      return true;
    } catch {
      throw new UnauthorizedException({
        code: 'TOKEN_INVALID',
        message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
      });
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const user: AuthUser | undefined = ctx.switchToHttp().getRequest().user;
    if (!required || required.length === 0 || !user || !user.roles.some((r) => required.includes(r))) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền thực hiện chức năng này.',
      });
    }
    return true;
  }
}
