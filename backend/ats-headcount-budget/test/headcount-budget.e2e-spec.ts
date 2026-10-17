process.env.DB_TYPE = 'memory';
process.env.SEED = 'true';
process.env.DEMO_PASSWORD = 'Passw0rd!';
process.env.JWT_SECRET = 'e2e-secret';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const YEAR = new Date().getFullYear();
const PASSWORD = 'Passw0rd!';

describe('S3-04 e2e — quyền truy cập ở backend + luồng ngân sách headcount (SCRUM-127)', () => {
  let app: INestApplication;
  const tokens: Record<string, string> = {};
  let itDeptId: number;
  let mktDeptId: number;

  const http = () => request(app.getHttpServer());
  const auth = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });

  async function login(email: string) {
    const res = await http().post('/auth/login').send({ email, password: PASSWORD }).expect(200);
    return res.body.accessToken as string;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    tokens.hr = await login('hr.manager@company.vn');
    tokens.admin = await login('admin@company.vn');
    tokens.approver = await login('approver@company.vn');
    tokens.recruiter = await login('recruiter@company.vn');
    tokens.hmIt = await login('hm.it@company.vn');
    tokens.hmMkt = await login('hm.mkt@company.vn');
    tokens.interviewer = await login('interviewer@company.vn');

    const depts = await http().get('/departments').set(auth('hr')).expect(200);
    itDeptId = depts.body.find((d: any) => d.code === 'IT').id;
    mktDeptId = depts.body.find((d: any) => d.code === 'MKT').id;
  });

  afterAll(async () => {
    await app.close();
  });

  // --------------------------------------------------------------- Xác thực
  describe('xác thực', () => {
    it('không có token => 401', async () => {
      await http().get('/headcount-budgets').expect(401);
      await http().post('/headcount-budgets').send({}).expect(401);
    });

    it('token rác => 401', async () => {
      await http().get('/headcount-budgets').set('Authorization', 'Bearer abc.def.ghi').expect(401);
    });

    it('sai mật khẩu => 401, thông báo chung', async () => {
      const res = await http().post('/auth/login').send({ email: 'hr.manager@company.vn', password: 'sai' }).expect(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
      const res2 = await http().post('/auth/login').send({ email: 'khong.ton.tai@x.vn', password: 'sai' }).expect(401);
      expect(res2.body.message).toBe(res.body.message);
    });
  });

  // --------------------------------------------------------------- Phân quyền
  describe('phân quyền kiểm ở server', () => {
    const body = () => ({ departmentId: mktDeptId, year: YEAR + 5, headcountQuota: 1, salaryBudgetVnd: 1000 });

    it.each(['hmIt', 'recruiter', 'approver', 'interviewer'])('%s KHÔNG được tạo ngân sách => 403', async (who) => {
      await http().post('/headcount-budgets').set(auth(who)).send(body()).expect(403);
    });

    it.each(['hmIt', 'recruiter', 'interviewer'])('%s KHÔNG xem được danh sách ngân sách đầy đủ => 403', async (who) => {
      await http().get('/headcount-budgets').set(auth(who)).expect(403);
    });

    it.each(['hmIt', 'recruiter', 'approver', 'interviewer'])('%s KHÔNG sửa/xoá được ngân sách => 403', async (who) => {
      await http().put('/headcount-budgets/1').set(auth(who)).send({ headcountQuota: 1, salaryBudgetVnd: 1 }).expect(403);
      await http().delete('/headcount-budgets/1').set(auth(who)).expect(403);
    });

    it('Interviewer không xem được headcount còn lại', async () => {
      await http().get(`/headcount-budgets/remaining?departmentId=${itDeptId}`).set(auth('interviewer')).expect(403);
    });

    it('chỉ HR Manager/Admin đọc được nhật ký ghi đè', async () => {
      for (const who of ['hmIt', 'approver', 'recruiter', 'interviewer']) {
        await http().get('/headcount-budgets/override-logs').set(auth(who)).expect(403);
      }
      await http().get('/headcount-budgets/override-logs').set(auth('hr')).expect(200);
      await http().get('/headcount-budgets/override-logs').set(auth('admin')).expect(200);
    });

    it('Approver xem được ngân sách (R) kèm số liệu lương', async () => {
      const res = await http().get(`/headcount-budgets?year=${YEAR}`).set(auth('approver')).expect(200);
      expect(res.body[0]).toHaveProperty('salaryBudgetVnd');
    });

    it('Hiring Manager chỉ xem headcount còn lại của phòng ban mình, KHÔNG thấy số liệu lương', async () => {
      const own = await http().get(`/headcount-budgets/remaining?departmentId=${itDeptId}&year=${YEAR}`).set(auth('hmIt')).expect(200);
      expect(own.body.headcountRemaining).toBe(5);
      expect(own.body).not.toHaveProperty('salaryBudgetVnd');
      const other = await http().get(`/headcount-budgets/remaining?departmentId=${itDeptId}&year=${YEAR}`).set(auth('hmMkt')).expect(403);
      expect(other.body.code).toBe('DEPARTMENT_SCOPE');
    });

  });

  // --------------------------------------------------------------- Validate
  describe('validate dữ liệu', () => {
    it('từ chối số âm, không nguyên, năm sai, field lạ => 400', async () => {
      const bad = [
        { departmentId: itDeptId, year: YEAR, headcountQuota: -1, salaryBudgetVnd: 1 },
        { departmentId: itDeptId, year: YEAR, headcountQuota: 1.5, salaryBudgetVnd: 1 },
        { departmentId: itDeptId, year: YEAR, headcountQuota: 1, salaryBudgetVnd: -5 },
        { departmentId: itDeptId, year: 1999, headcountQuota: 1, salaryBudgetVnd: 1 },
        { departmentId: itDeptId, year: YEAR, headcountQuota: 1, salaryBudgetVnd: 1, hack: true },
        {},
      ];
      for (const b of bad) {
        const res = await http().post('/headcount-budgets').set(auth('hr')).send(b).expect(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      }
    });

    it('trùng phòng ban + năm => 409', async () => {
      const res = await http()
        .post('/headcount-budgets')
        .set(auth('hr'))
        .send({ departmentId: itDeptId, year: YEAR, headcountQuota: 1, salaryBudgetVnd: 1 })
        .expect(409);
      expect(res.body.code).toBe('BUDGET_ALREADY_EXISTS');
    });
  });

  // --------------------------------------------------------------- Luồng đầy đủ
  describe('luồng nghiệp vụ: khai báo -> yêu cầu -> chặn -> ghi đè -> nhật ký', () => {
    let budgetId: number;
    const newReq = async (who: string, quantity: number, salary = 20_000_000) => {
      const created = await http()
        .post('/requisitions')
        .set(auth(who))
        .send({ title: 'Backend Dev', departmentId: itDeptId, budgetYear: YEAR, quantity, proposedSalaryVnd: salary })
        .expect(201);
      await http().post(`/requisitions/${created.body.id}/submit`).set(auth(who)).expect(200);
      return created.body;
    };

    it('AC1: HR Manager khai báo ngân sách phòng Marketing theo năm (VND)', async () => {
      const res = await http()
        .post('/headcount-budgets')
        .set(auth('hr'))
        .send({ departmentId: mktDeptId, year: YEAR, headcountQuota: 2, salaryBudgetVnd: 1_000_000_000 })
        .expect(201);
      budgetId = res.body.id;
      expect(res.body).toMatchObject({ headcountQuota: 2, headcountRemaining: 2, salaryBudgetVnd: 1_000_000_000 });
    });

    it('AC1: HR Manager cập nhật ngân sách', async () => {
      const res = await http().put(`/headcount-budgets/${budgetId}`).set(auth('hr')).send({ headcountQuota: 3, salaryBudgetVnd: 1_500_000_000 }).expect(200);
      expect(res.body.headcountQuota).toBe(3);
      await http().put(`/headcount-budgets/${budgetId}`).set(auth('admin')).send({ headcountQuota: 2, salaryBudgetVnd: 1_000_000_000 }).expect(200);
    });

    it('AC2: tạo yêu cầu mới trả về số headcount còn lại của phòng ban', async () => {
      const res = await http()
        .post('/requisitions')
        .set(auth('hmIt'))
        .send({ title: 'QA', departmentId: itDeptId, budgetYear: YEAR, quantity: 1, proposedSalaryVnd: 15_000_000 })
        .expect(201);
      expect(res.body.budget.headcountRemaining).toBe(5);
      expect(res.body.budget).not.toHaveProperty('salaryBudgetVnd');
    });

    it('Hiring Manager không tạo yêu cầu cho phòng ban khác => 403', async () => {
      await http()
        .post('/requisitions')
        .set(auth('hmMkt'))
        .send({ title: 'x', departmentId: itDeptId, quantity: 1, proposedSalaryVnd: 1 })
        .expect(403);
    });

    it('POST /check xem trước vượt chỉ tiêu mà không thay đổi dữ liệu', async () => {
      const res = await http()
        .post('/headcount-budgets/check')
        .set(auth('hmIt'))
        .send({ departmentId: itDeptId, year: YEAR, quantity: 6, proposedSalaryVnd: 10_000_000 })
        .expect(200);
      expect(res.body).toMatchObject({ exceeds: true, headcountOver: 1, canOverride: false });
    });

    it('duyệt trong chỉ tiêu (4/5) thành công', async () => {
      const r = await newReq('hmIt', 4);
      const res = await http().post(`/requisitions/${r.id}/approve`).set(auth('approver')).send({}).expect(200);
      expect(res.body.status).toBe('APPROVED');
      const rem = await http().get(`/headcount-budgets/remaining?departmentId=${itDeptId}&year=${YEAR}`).set(auth('hmIt')).expect(200);
      expect(rem.body.headcountRemaining).toBe(1);
    });

    let overReqId: number;
    it('AC3: yêu cầu vượt chỉ tiêu (2 > còn 1) bị CHẶN với mã 409', async () => {
      const r = await newReq('hmIt', 2);
      overReqId = r.id;
      const res = await http().post(`/requisitions/${r.id}/approve`).set(auth('approver')).send({}).expect(409);
      expect(res.body).toMatchObject({ code: 'HEADCOUNT_BUDGET_EXCEEDED', canOverride: false });
      expect(res.body.details.headcountOver).toBe(1);
    });

    it('AC3: Approver / Admin / Hiring Manager gửi ghi đè => 403', async () => {
      const body = { override: { reason: 'Cần gấp cho dự án khách hàng X' } };
      await http().post(`/requisitions/${overReqId}/approve`).set(auth('approver')).send(body).expect(403);
      await http().post(`/requisitions/${overReqId}/approve`).set(auth('admin')).send(body).expect(403);
      await http().post(`/requisitions/${overReqId}/approve`).set(auth('hmIt')).send(body).expect(403); // không có quyền duyệt
    });

    it('AC3: HR Manager ghi đè không có lý do => 400', async () => {
      const res = await http().post(`/requisitions/${overReqId}/approve`).set(auth('hr')).send({ override: { reason: '' } }).expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      const res2 = await http().post(`/requisitions/${overReqId}/approve`).set(auth('hr')).send({ override: { reason: 'ngắn' } }).expect(400);
      expect(res2.body.code).toBe('OVERRIDE_REASON_REQUIRED');
    });

    it('AC3+AC4: HR Manager ghi đè kèm lý do => APPROVED và có nhật ký', async () => {
      const res = await http()
        .post(`/requisitions/${overReqId}/approve`)
        .set(auth('hr'))
        .send({ override: { reason: 'Dự án khách hàng X được ký thêm' } })
        .expect(200);
      expect(res.body).toMatchObject({ status: 'APPROVED', budgetOverridden: true });

      const logs = await http().get(`/headcount-budgets/override-logs?action=BUDGET_OVERRIDE&departmentId=${itDeptId}`).set(auth('hr')).expect(200);
      expect(logs.body).toHaveLength(1);
      expect(logs.body[0]).toMatchObject({
        action: 'BUDGET_OVERRIDE',
        requisitionId: overReqId,
        userEmail: 'hr.manager@company.vn',
        reason: 'Dự án khách hàng X được ký thêm',
      });
      expect(logs.body[0].detail.headcountOver).toBe(1);
    });

    it('Technical note: huỷ yêu cầu đã duyệt => headcount được trả lại', async () => {
      const before = await http().get(`/headcount-budgets/remaining?departmentId=${itDeptId}&year=${YEAR}`).set(auth('hr')).expect(200);
      await http().post(`/requisitions/${overReqId}/cancel`).set(auth('hmIt')).send({ reason: 'Không còn nhu cầu' }).expect(200);
      const after = await http().get(`/headcount-budgets/remaining?departmentId=${itDeptId}&year=${YEAR}`).set(auth('hr')).expect(200);
      expect(after.body.headcountRemaining).toBe(before.body.headcountRemaining + 2);
    });

    it('Technical note: tiền lương VND — vượt ngân sách lương cũng bị chặn', async () => {
      // Marketing: quota 2, lương 1 tỷ/năm. 1 người x 100tr/tháng x 12 = 1.2 tỷ > 1 tỷ
      const created = await http()
        .post('/requisitions')
        .set(auth('hmMkt'))
        .send({ title: 'Lead', departmentId: mktDeptId, budgetYear: YEAR, quantity: 1, proposedSalaryVnd: 100_000_000 })
        .expect(201);
      await http().post(`/requisitions/${created.body.id}/submit`).set(auth('hmMkt')).expect(200);
      const res = await http().post(`/requisitions/${created.body.id}/approve`).set(auth('approver')).send({}).expect(409);
      expect(res.body.details.exceedsSalary).toBe(true);
      expect(res.body.details.exceedsHeadcount).toBe(false);
    });

    it('không hạ chỉ tiêu thấp hơn số đã dùng (IT đã dùng 4)', async () => {
      const list = await http().get(`/headcount-budgets?departmentId=${itDeptId}`).set(auth('hr')).expect(200);
      const res = await http().put(`/headcount-budgets/${list.body[0].id}`).set(auth('hr')).send({ headcountQuota: 3, salaryBudgetVnd: 1_800_000_000 }).expect(422);
      expect(res.body.code).toBe('QUOTA_BELOW_USED');
    });

    it('nhật ký ngân sách ghi cả tạo và sửa', async () => {
      const logs = await http().get(`/headcount-budgets/override-logs?departmentId=${mktDeptId}`).set(auth('hr')).expect(200);
      const actions = logs.body.map((l: any) => l.action);
      expect(actions).toEqual(expect.arrayContaining(['BUDGET_CREATED', 'BUDGET_UPDATED']));
    });

    it('xoá ngân sách chưa dùng thành công; ngân sách đã dùng bị chặn', async () => {
      await http().delete(`/headcount-budgets/${budgetId}`).set(auth('hr')).expect(200);
      const list = await http().get(`/headcount-budgets?departmentId=${itDeptId}`).set(auth('hr')).expect(200);
      await http().delete(`/headcount-budgets/${list.body[0].id}`).set(auth('hr')).expect(409);
    });
  });
});
