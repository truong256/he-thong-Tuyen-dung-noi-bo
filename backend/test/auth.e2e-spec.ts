import request from 'supertest';
import { Role } from '../src/common/roles';
import { createTestApp, TEST_SECRET } from './helpers/test-app';
import { JwtService } from '@nestjs/jwt';

jest.setTimeout(30000);

describe('dev-login', () => {
  it('bị tắt (404) khi AUTH_DEV_LOGIN=false: không có cửa hậu', async () => {
    const app = await createTestApp({ devLogin: false });
    const http = request(app.getHttpServer());
    expect((await http.post('/api/auth/dev-login').send({ role: Role.HR_MANAGER })).status).toBe(404);
    expect((await http.get('/api/auth/dev-roles')).status).toBe(404);
    await app.close();
  });

  it('khi bật: cấp token đúng vai trò, token dùng được và vẫn bị phân quyền ở backend', async () => {
    const app = await createTestApp({ devLogin: true });
    const http = request(app.getHttpServer());

    const roles = await http.get('/api/auth/dev-roles');
    expect(roles.body).toHaveLength(7); // đúng 7 vai trò trong sheet User Roles (gồm Admin)

    const hr = await http.post('/api/auth/dev-login').send({ role: Role.HR_MANAGER });
    expect(hr.status).toBe(200);
    expect(new JwtService({ secret: TEST_SECRET }).verify(hr.body.accessToken)).toMatchObject({ role: Role.HR_MANAGER });
    expect((await http.get('/api/job-titles').set('Authorization', `Bearer ${hr.body.accessToken}`)).status).toBe(200);

    const iv = await http.post('/api/auth/dev-login').send({ role: Role.INTERVIEWER });
    const created = await http.post('/api/job-titles').set('Authorization', `Bearer ${iv.body.accessToken}`).send({});
    expect(created.status).toBe(403);

    expect((await http.post('/api/auth/dev-login').send({ role: 'ROOT' })).status).toBe(400);
    await app.close();
  });
});
