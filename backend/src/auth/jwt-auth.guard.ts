import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { unauthenticated } from '../common/errors';
import { isRole } from '../common/roles';
import { IS_PUBLIC_KEY } from './auth.decorators';
import { AuthenticatedRequest, AuthUser } from './auth.types';

export function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

/** Chuyển payload JWT đã xác thực chữ ký thành AuthUser; trả null nếu thiếu/ sai trường. */
export function toAuthUser(payload: unknown): AuthUser | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const { sub, email, role } = payload as Record<string, unknown>;
  if (typeof sub !== 'string' || sub === '' || typeof email !== 'string' || !isRole(role)) return null;
  return { id: sub, email, role };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) throw unauthenticated();

    let payload: unknown;
    try {
      // Chốt thuật toán để chống tấn công đổi alg (alg=none / confusion).
      payload = await this.jwtService.verifyAsync(token, { algorithms: ['HS256'] });
    } catch {
      throw unauthenticated();
    }

    const user = toAuthUser(payload);
    if (!user) throw unauthenticated();
    request.user = user;
    return true;
  }
}
