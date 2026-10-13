import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Role } from './roles.enum';
import { AuthUser } from './auth.types';

export const ROLES_KEY = 'roles';
export const IS_PUBLIC_KEY = 'isPublic';

/** Mặc định TỪ CHỐI: endpoint nào không khai báo @Roles hoặc @Public đều bị chặn */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);
