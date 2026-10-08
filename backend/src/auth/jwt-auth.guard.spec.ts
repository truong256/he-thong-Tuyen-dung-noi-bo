import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './auth.decorators';
import { extractBearerToken, JwtAuthGuard, toAuthUser } from './jwt-auth.guard';
import { AuthenticatedRequest } from './auth.types';
import { Role } from '../common/roles';

const SECRET = 'unit-test-secret-unit-test-secret-1234';
const jwt = new JwtService({ secret: SECRET });

function contextFor(request: Partial<AuthenticatedRequest>, isPublic = false): ExecutionContext {
  const handler = () => undefined;
  if (isPublic) Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
  class Controller {}
  return {
    getHandler: () => handler,
    getClass: () => Controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const sign = (payload: object, options: object = {}) => jwt.sign(payload, { algorithm: 'HS256', ...options });
const goodPayload = { sub: 'u1', email: 'u1@x.com', role: Role.HR_MANAGER };

describe('extractBearerToken', () => {
  it.each([
    ['Bearer abc.def.ghi', 'abc.def.ghi'],
    ['bearer abc', 'abc'],
    ['  Bearer   abc  ', 'abc'],
  ])('lấy token từ "%s"', (header, expected) => {
    expect(extractBearerToken(header)).toBe(expected);
  });

  it.each([undefined, '', 'Basic abc', 'Bearer', 'Bearer a b'])('từ chối header %p', (header) => {
    expect(extractBearerToken(header)).toBeNull();
  });
});

describe('toAuthUser', () => {
  it('chấp nhận payload đúng', () => {
    expect(toAuthUser(goodPayload)).toEqual({ id: 'u1', email: 'u1@x.com', role: Role.HR_MANAGER });
  });

  it.each([null, 'x', {}, { sub: '', email: 'a', role: Role.ADMIN }, { sub: 'a', email: 'a', role: 'ROOT' }, { sub: 'a', role: Role.ADMIN }])(
    'từ chối payload %p',
    (payload) => {
      expect(toAuthUser(payload)).toBeNull();
    },
  );
});

describe('JwtAuthGuard', () => {
  const guard = new JwtAuthGuard(new Reflector(), jwt);

  it('cho qua endpoint @Public không cần token', async () => {
    await expect(guard.canActivate(contextFor({ headers: {} }, true))).resolves.toBe(true);
  });

  it('token hợp lệ: gắn user vào request', async () => {
    const request = { headers: { authorization: `Bearer ${sign(goodPayload)}` } } as AuthenticatedRequest;
    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'u1', email: 'u1@x.com', role: Role.HR_MANAGER });
  });

  it('thiếu token => 401', async () => {
    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toMatchObject({ status: 401 });
  });

  it('token hết hạn => 401', async () => {
    const token = sign(goodPayload, { expiresIn: -10 });
    await expect(guard.canActivate(contextFor({ headers: { authorization: `Bearer ${token}` } }))).rejects.toMatchObject({ status: 401 });
  });

  it('token ký bằng secret khác => 401', async () => {
    const forged = new JwtService({ secret: 'another-secret-another-secret-123456' }).sign(goodPayload);
    await expect(guard.canActivate(contextFor({ headers: { authorization: `Bearer ${forged}` } }))).rejects.toMatchObject({ status: 401 });
  });

  it('token alg=none => 401', async () => {
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const token = `${b64({ alg: 'none', typ: 'JWT' })}.${b64(goodPayload)}.`;
    await expect(guard.canActivate(contextFor({ headers: { authorization: `Bearer ${token}` } }))).rejects.toMatchObject({ status: 401 });
  });

  it('token ký đúng nhưng vai trò không tồn tại => 401', async () => {
    const token = sign({ ...goodPayload, role: 'SUPERUSER' });
    await expect(guard.canActivate(contextFor({ headers: { authorization: `Bearer ${token}` } }))).rejects.toMatchObject({ status: 401 });
  });
});
