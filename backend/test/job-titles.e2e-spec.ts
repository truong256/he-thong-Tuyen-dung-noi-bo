import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Role } from '../src/common/roles';
import { bearer, createTestApp, tokenFor } from './helpers/test-app';

jest.setTimeout(30000);

type Body = Record<string, unknown>;
const READERS = [Role.INTERVIEWER, Role.HIRING_MANAGER, Role.RECRUITER, Role.APPROVER, Role.ADMIN];
const SENSITIVE = /salaryMin|salaryMax|currency|VND|28000000|45000000/;

describe('S2-05 Chức danh & dải lương (HTTP, e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let titleId: string;

  const payload = (o: Body = {}): Body => ({
    code: 'DEV-SR',
    name: 'Lập trình viên',
    level: 'SENIOR',
    salaryMin: 28_000_000,
    salaryMax: 45_000_000,
    description: 'Phát triển phần mềm',
    ...o,
  });

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
    const res = await http.post('/api/job-titles').set(bearer(Role.HR_MANAGER)).send(payload());
    expect(res.status).toBe(201);
    titleId = res.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // --------------------------------------------------------------- xác thực
  describe('xác thực (401)', () => {
    it('không có token', async () => {
      const res = await http.get('/api/job-titles');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('token rác / sai chữ ký / hết hạn / tự ký bằng secret khác', async () => {
      for (const token of [
        'rac',
        tokenFor(Role.HR_MANAGER, { secret: 'a-completely-different-secret-1234567890' }),
        tokenFor(Role.HR_MANAGER, { expiresIn: -60 }),
      ]) {
        const res = await http.get('/api/job-titles').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(401);
      }
    });

    it('không thể tự nâng vai trò bằng cách sửa payload token', async () => {
      const [h, , s] = tokenFor(Role.INTERVIEWER).split('.');
      const p = Buffer.from(JSON.stringify({ sub: 'x', email: 'x@x.com', role: 'HR_MANAGER' })).toString('base64url');
      const res = await http.get(`/api/job-titles/${titleId}/salary-band`).set('Authorization', `Bearer ${h}.${p}.${s}`);
      expect(res.status).toBe(401);
    });

    it('health check công khai', async () => {
      expect((await http.get('/api/health')).body).toEqual({ status: 'ok' });
    });
  });

  // -------------------------------------------------------- mặc định từ chối
  it('endpoint không khai báo quyền bị 403 dù đã đăng nhập bằng HR Manager (default deny)', async () => {
    const res = await http.get('/api/undeclared').set(bearer(Role.HR_MANAGER));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ENDPOINT_NOT_DECLARED');
    expect(res.body.leaked).toBeUndefined();
  });

  // ------------------------------------------------- AC3: chỉ HR xem dải lương
  describe('AC3: chỉ Trưởng phòng Nhân sự xem được dải lương', () => {
    it('HR Manager thấy đủ dải lương (VND) ở danh sách, chi tiết và endpoint riêng', async () => {
      const list = await http.get('/api/job-titles').set(bearer(Role.HR_MANAGER));
      expect(list.status).toBe(200);
      expect(list.body.items[0]).toMatchObject({ salaryMin: 28_000_000, salaryMax: 45_000_000, currency: 'VND', salaryBandVisible: true });

      const detail = await http.get(`/api/job-titles/${titleId}`).set(bearer(Role.HR_MANAGER));
      expect(detail.body).toMatchObject({ salaryMin: 28_000_000, salaryMax: 45_000_000 });

      const band = await http.get(`/api/job-titles/${titleId}/salary-band`).set(bearer(Role.HR_MANAGER));
      expect(band.status).toBe(200);
      expect(band.body).toEqual({ id: titleId, code: 'DEV-SR', currency: 'VND', salaryMin: 28_000_000, salaryMax: 45_000_000 });
    });

    it.each(READERS)('%s: đọc được danh mục nhưng phản hồi không chứa bất kỳ dữ liệu lương nào', async (role) => {
      const list = await http.get('/api/job-titles').set(bearer(role));
      const detail = await http.get(`/api/job-titles/${titleId}`).set(bearer(role));
      expect(list.status).toBe(200);
      expect(detail.status).toBe(200);
      expect(list.body.items[0]).toMatchObject({ code: 'DEV-SR', salaryBandVisible: false });
      expect(JSON.stringify(list.body)).not.toMatch(SENSITIVE);
      expect(JSON.stringify(detail.body)).not.toMatch(SENSITIVE);
    });

    it.each([...READERS, Role.CANDIDATE])('%s: GET /:id/salary-band => 403 tiếng Việt', async (role) => {
      const res = await http.get(`/api/job-titles/${titleId}/salary-band`).set(bearer(role));
      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({
        code: 'SALARY_BAND_FORBIDDEN',
        message: 'Bạn không có quyền xem dải lương. Chỉ Trưởng phòng Nhân sự được xem.',
      });
      expect(JSON.stringify(res.body)).not.toMatch(SENSITIVE);
    });

    it.each(['salaryFrom=1', 'salaryTo=99000000', 'sortBy=salaryMin', 'sortBy=salaryMax&sortDir=desc'])(
      'người không có quyền không thể dò lương bằng bộ lọc/sắp xếp (%s)',
      async (qs) => {
        const res = await http.get(`/api/job-titles?${qs}`).set(bearer(Role.RECRUITER));
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('SALARY_BAND_FORBIDDEN');
        expect((await http.get(`/api/job-titles?${qs}`).set(bearer(Role.HR_MANAGER))).status).toBe(200);
      },
    );

    it('ứng viên không truy cập được danh mục (403)', async () => {
      expect((await http.get('/api/job-titles').set(bearer(Role.CANDIDATE))).status).toBe(403);
      expect((await http.get(`/api/job-titles/${titleId}`).set(bearer(Role.CANDIDATE))).status).toBe(403);
      expect((await http.get('/api/job-titles/meta/levels').set(bearer(Role.CANDIDATE))).status).toBe(403);
    });

    it.each(READERS)('%s: không ghi được dữ liệu (403) và dữ liệu không bị đổi', async (role) => {
      const h = bearer(role);
      expect((await http.post('/api/job-titles').set(h).send(payload({ code: 'HACK' }))).status).toBe(403);
      expect((await http.put(`/api/job-titles/${titleId}`).set(h).send({ name: 'x', level: 'SENIOR', salaryMin: 1, salaryMax: 2 })).status).toBe(403);
      expect((await http.patch(`/api/job-titles/${titleId}/status`).set(h).send({ status: 'INACTIVE' })).status).toBe(403);
      const after = await http.get(`/api/job-titles/${titleId}`).set(bearer(Role.HR_MANAGER));
      expect(after.body).toMatchObject({ salaryMin: 28_000_000, status: 'ACTIVE' });
    });

    it('phản hồi không được cache (có thể chứa lương)', async () => {
      const res = await http.get('/api/job-titles').set(bearer(Role.HR_MANAGER));
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.headers['vary']).toMatch(/Authorization/i);
    });
  });

  // ----------------------------------------------- AC1: dữ liệu & kiểm tra đầu vào
  describe('AC1: khai báo chức danh với mã, tên, cấp bậc, lương tối thiểu / tối đa', () => {
    const hr = () => bearer(Role.HR_MANAGER);

    it('tạo mới thành công, chuẩn hoá mã và trả 201', async () => {
      const res = await http.post('/api/job-titles').set(hr()).send(payload({ code: ' pm-mid ', name: '  Quản lý  dự án ', level: 'MIDDLE', salaryMin: 20_000_000, salaryMax: 30_000_000 }));
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ code: 'PM-MID', name: 'Quản lý dự án', level: 'MIDDLE', status: 'ACTIVE', currency: 'VND' });
    });

    it('thiếu trường bắt buộc => 400 với thông báo tiếng Việt', async () => {
      const res = await http.post('/api/job-titles').set(hr()).send({});
      expect(res.status).toBe(400);
      const messages = (res.body.message as string[]).join(' | ');
      expect(messages).toMatch(/Mã chức danh/);
      expect(messages).toMatch(/Tên chức danh/);
      expect(messages).toMatch(/Cấp bậc/);
      expect(messages).toMatch(/Mức lương/);
    });

    it.each([
      ['mã chứa ký tự không hợp lệ', { code: 'DEV SR!' }],
      ['mã quá ngắn', { code: 'A' }],
      ['cấp bậc lạ', { level: 'GOD' }],
      ['lương dạng chuỗi', { salaryMin: '28000000' }],
      ['lương thập phân', { salaryMin: 1000.5 }],
      ['lương bằng 0', { salaryMin: 0 }],
      ['lương âm', { salaryMax: -1 }],
      ['lương vượt trần 10 tỷ', { salaryMax: 10_000_000_001 }],
      ['trường lạ (mass assignment)', { status: 'INACTIVE', createdBy: 'me' }],
      ['mô tả quá dài', { description: 'a'.repeat(501) }],
    ])('400 khi %s', async (_label, override) => {
      const res = await http.post('/api/job-titles').set(hr()).send(payload({ code: 'TMP-X', name: 'Tmp', ...override }));
      expect(res.status).toBe(400);
    });

    it('400 khi lương tối đa < tối thiểu', async () => {
      const res = await http.post('/api/job-titles').set(hr()).send(payload({ code: 'RNG', name: 'Rng', salaryMin: 30_000_000, salaryMax: 10_000_000 }));
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('SALARY_RANGE_INVALID');
    });

    it('409 khi trùng mã và khi trùng (tên, cấp bậc)', async () => {
      const dupCode = await http.post('/api/job-titles').set(hr()).send(payload({ name: 'Khác' }));
      expect(dupCode.status).toBe(409);
      expect(dupCode.body.code).toBe('JOB_TITLE_CODE_EXISTS');
      const dupName = await http.post('/api/job-titles').set(hr()).send(payload({ code: 'OTHER' }));
      expect(dupName.status).toBe(409);
      expect(dupName.body.code).toBe('JOB_TITLE_NAME_LEVEL_EXISTS');
    });

    it('cập nhật dải lương và giữ nguyên mã; gửi kèm `code` bị từ chối (mã không đổi)', async () => {
      const ok = await http.put(`/api/job-titles/${titleId}`).set(hr()).send({ name: 'Lập trình viên', level: 'SENIOR', salaryMin: 30_000_000, salaryMax: 48_000_000 });
      expect(ok.status).toBe(200);
      expect(ok.body).toMatchObject({ code: 'DEV-SR', salaryMin: 30_000_000, salaryMax: 48_000_000, description: null });

      const withCode = await http.put(`/api/job-titles/${titleId}`).set(hr()).send({ code: 'NEW', name: 'x1', level: 'SENIOR', salaryMin: 1, salaryMax: 2 });
      expect(withCode.status).toBe(400);

      // khôi phục dữ liệu gốc cho các test sau
      await http.put(`/api/job-titles/${titleId}`).set(hr()).send({ name: 'Lập trình viên', level: 'SENIOR', salaryMin: 28_000_000, salaryMax: 45_000_000, description: 'Phát triển phần mềm' });
    });

    it('ngừng áp dụng / áp dụng lại chức danh', async () => {
      const off = await http.patch(`/api/job-titles/${titleId}/status`).set(hr()).send({ status: 'INACTIVE' });
      expect(off.body.status).toBe('INACTIVE');
      expect((await http.patch(`/api/job-titles/${titleId}/status`).set(hr()).send({ status: 'BAD' })).status).toBe(400);
      const on = await http.patch(`/api/job-titles/${titleId}/status`).set(hr()).send({ status: 'ACTIVE' });
      expect(on.body.status).toBe('ACTIVE');
    });

    it('không có API xoá cứng', async () => {
      expect((await http.delete(`/api/job-titles/${titleId}`).set(hr())).status).toBe(404);
    });

    it('id sai định dạng => 400, id không tồn tại => 404', async () => {
      expect((await http.get('/api/job-titles/khong-phai-uuid').set(hr())).status).toBe(400);
      const missing = await http.get('/api/job-titles/00000000-0000-4000-8000-000000000000').set(hr());
      expect(missing.status).toBe(404);
      expect(missing.body.code).toBe('JOB_TITLE_NOT_FOUND');
    });

    it('danh sách: tìm kiếm, lọc, phân trang và kiểm tra tham số', async () => {
      const search = await http.get('/api/job-titles?search=pm-').set(hr());
      expect(search.body.items.map((i: Body) => i.code)).toEqual(['PM-MID']);

      const level = await http.get('/api/job-titles?level=SENIOR&pageSize=1&page=1').set(hr());
      expect(level.body).toMatchObject({ page: 1, pageSize: 1 });
      expect(level.body.items).toHaveLength(1);

      for (const bad of ['page=0', 'pageSize=1000', 'level=X', 'sortBy=password', 'sortDir=up', 'unknown=1']) {
        expect((await http.get(`/api/job-titles?${bad}`).set(hr())).status).toBe(400);
      }
    });

    it('danh sách cấp bậc theo thứ tự tăng dần', async () => {
      const res = await http.get('/api/job-titles/meta/levels').set(bearer(Role.INTERVIEWER));
      expect(res.status).toBe(200);
      expect(res.body.map((l: Body) => l.value)).toEqual(['INTERN', 'FRESHER', 'JUNIOR', 'MIDDLE', 'SENIOR', 'LEAD', 'MANAGER', 'DIRECTOR']);
    });
  });
});
