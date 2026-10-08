import { Logger } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { createTestDataSource } from '../../test/helpers/test-db';
import { HR, NON_HR_ROLES, sampleDto, userOf } from '../../test/helpers/fixtures';
import { Role } from '../common/roles';
import { JobTitle } from './job-title.entity';
import { JobLevel, JobTitleSortField, JobTitleStatus, SortDirection } from './job-title.types';
import { isUniqueViolation, JobTitlesService } from './job-titles.service';

describe('JobTitlesService', () => {
  let ds: DataSource;
  let service: JobTitlesService;

  beforeAll(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    ds = await createTestDataSource();
  });

  afterAll(async () => {
    await ds.destroy();
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    await ds.getRepository(JobTitle).clear();
    service = new JobTitlesService(ds.getRepository(JobTitle));
  });

  const salaryKeys = ['salaryMin', 'salaryMax', 'currency'] as const;

  // ------------------------------------------------------------ tạo mới
  describe('create', () => {
    it('AC1: lưu đủ mã, tên, cấp bậc, lương tối thiểu và tối đa (VND)', async () => {
      const view = await service.create(sampleDto(), HR);
      expect(view).toMatchObject({
        code: 'DEV-SR',
        name: 'Lập trình viên',
        level: JobLevel.SENIOR,
        salaryMin: 28_000_000,
        salaryMax: 45_000_000,
        currency: 'VND',
        status: JobTitleStatus.ACTIVE,
        salaryBandVisible: true,
      });
      expect(view.id).toMatch(/^[0-9a-f-]{36}$/);

      const row = await ds.getRepository(JobTitle).findOneByOrFail({ code: 'DEV-SR' });
      expect(row.salaryMin).toBe(28_000_000);
      expect(typeof row.salaryMax).toBe('number');
      expect(row.createdBy).toBe(HR.id);
      expect(row.levelRank).toBe(5);
    });

    it('chuẩn hoá mã (hoa), tên (gọn khoảng trắng) và mô tả rỗng thành null', async () => {
      const view = await service.create(sampleDto({ code: ' dev-x ', name: '  Kỹ   sư  ', description: '   ' }), HR);
      expect(view.code).toBe('DEV-X');
      expect(view.name).toBe('Kỹ sư');
      expect(view.description).toBeNull();
    });

    it('cho phép lương cố định (min = max)', async () => {
      const view = await service.create(sampleDto({ salaryMin: 9_000_000, salaryMax: 9_000_000 }), HR);
      expect(view.salaryMin).toBe(view.salaryMax);
    });

    it('từ chối khi lương tối đa nhỏ hơn tối thiểu (400) và không ghi gì vào DB', async () => {
      await expect(service.create(sampleDto({ salaryMin: 20_000_000, salaryMax: 10_000_000 }), HR)).rejects.toMatchObject({
        status: 400,
        response: expect.objectContaining({ code: 'SALARY_RANGE_INVALID' }),
      });
      expect(await ds.getRepository(JobTitle).count()).toBe(0);
    });

    it('từ chối mã trùng, không phân biệt hoa/thường (409)', async () => {
      await service.create(sampleDto(), HR);
      await expect(service.create(sampleDto({ code: 'dev-sr', name: 'Tên khác' }), HR)).rejects.toMatchObject({
        status: 409,
        response: expect.objectContaining({ code: 'JOB_TITLE_CODE_EXISTS' }),
      });
    });

    it('từ chối cùng tên + cùng cấp bậc (409), nhưng cho phép cùng tên khác cấp bậc', async () => {
      await service.create(sampleDto(), HR);
      await expect(service.create(sampleDto({ code: 'DEV-SR-2', name: '  LẬP TRÌNH  VIÊN ' }), HR)).rejects.toMatchObject({
        status: 409,
        response: expect.objectContaining({ code: 'JOB_TITLE_NAME_LEVEL_EXISTS' }),
      });
      await expect(service.create(sampleDto({ code: 'DEV-JR', level: JobLevel.JUNIOR }), HR)).resolves.toBeDefined();
    });

    it.each(NON_HR_ROLES)('backend từ chối %s tạo chức danh (403) và không ghi DB', async (role) => {
      await expect(service.create(sampleDto(), userOf(role))).rejects.toMatchObject({ status: 403 });
      expect(await ds.getRepository(JobTitle).count()).toBe(0);
    });
  });

  // ----------------------------------------------------------- quyền xem lương
  describe('AC3: chỉ Trưởng phòng Nhân sự xem được dải lương', () => {
    let id: string;
    beforeEach(async () => {
      id = (await service.create(sampleDto(), HR)).id;
    });

    it('HR Manager thấy lương ở findOne và findAll', async () => {
      expect(await service.findOne(id, HR)).toMatchObject({ salaryMin: 28_000_000, salaryMax: 45_000_000 });
      const list = await service.findAll({}, HR);
      expect(list.items[0]).toMatchObject({ salaryMin: 28_000_000, salaryMax: 45_000_000, currency: 'VND' });
    });

    it.each(NON_HR_ROLES.filter((r) => r !== Role.CANDIDATE))(
      '%s đọc được danh mục nhưng KHÔNG có khoá lương nào trong dữ liệu trả về',
      async (role) => {
        const actor = userOf(role);
        const one = await service.findOne(id, actor);
        const list = await service.findAll({}, actor);
        for (const view of [one, ...list.items]) {
          expect(view.salaryBandVisible).toBe(false);
          for (const key of salaryKeys) expect(Object.keys(view)).not.toContain(key);
          expect(JSON.stringify(view)).not.toMatch(/salaryMin|salaryMax|currency|VND|28000000|45000000/);
        }
        expect(one.code).toBe('DEV-SR');
      },
    );

    it.each(NON_HR_ROLES)('%s gọi getSalaryBand bị 403 SALARY_BAND_FORBIDDEN', async (role) => {
      await expect(service.getSalaryBand(id, userOf(role))).rejects.toMatchObject({
        status: 403,
        response: expect.objectContaining({ code: 'SALARY_BAND_FORBIDDEN' }),
      });
    });

    it('getSalaryBand kiểm quyền trước khi tra DB: id không tồn tại vẫn 403 với người không có quyền', async () => {
      await expect(service.getSalaryBand('00000000-0000-4000-8000-000000000000', userOf(Role.APPROVER))).rejects.toMatchObject({ status: 403 });
      await expect(service.getSalaryBand('00000000-0000-4000-8000-000000000000', HR)).rejects.toMatchObject({ status: 404 });
    });

    it('HR Manager lấy được dải lương qua getSalaryBand', async () => {
      expect(await service.getSalaryBand(id, HR)).toEqual({ id, code: 'DEV-SR', currency: 'VND', salaryMin: 28_000_000, salaryMax: 45_000_000 });
    });

    it.each([
      ['salaryFrom', { salaryFrom: 1 }],
      ['salaryTo', { salaryTo: 99_000_000 }],
      ['sortBy=salaryMin', { sortBy: JobTitleSortField.SALARY_MIN }],
      ['sortBy=salaryMax', { sortBy: JobTitleSortField.SALARY_MAX }],
    ])('chặn kênh phụ: người không có quyền không được lọc/sắp xếp theo lương (%s)', async (_label, query) => {
      await expect(service.findAll(query, userOf(Role.RECRUITER))).rejects.toMatchObject({
        status: 403,
        response: expect.objectContaining({ code: 'SALARY_BAND_FORBIDDEN' }),
      });
      await expect(service.findAll(query, HR)).resolves.toBeDefined();
    });

    it('ứng viên không đọc được cả danh mục', async () => {
      const candidate = userOf(Role.CANDIDATE);
      await expect(service.findAll({}, candidate)).rejects.toMatchObject({ status: 403 });
      await expect(service.findOne(id, candidate)).rejects.toMatchObject({ status: 403 });
      expect(() => service.listLevels(candidate)).toThrow();
    });

    it('người không có quyền ghi cũng không sửa / đổi trạng thái được', async () => {
      const dto = { name: 'X', level: JobLevel.SENIOR, salaryMin: 1, salaryMax: 2 };
      await expect(service.update(id, dto, userOf(Role.ADMIN))).rejects.toMatchObject({ status: 403 });
      await expect(service.setStatus(id, JobTitleStatus.INACTIVE, userOf(Role.RECRUITER))).rejects.toMatchObject({ status: 403 });
    });
  });

  // ------------------------------------------------------------ danh sách
  describe('findAll', () => {
    beforeEach(async () => {
      await service.create(sampleDto({ code: 'C-INT', name: 'Thực tập Dev', level: JobLevel.INTERN, salaryMin: 3_000_000, salaryMax: 5_000_000 }), HR);
      await service.create(sampleDto({ code: 'A-SEN', name: 'Kỹ sư phần mềm', level: JobLevel.SENIOR, salaryMin: 30_000_000, salaryMax: 50_000_000 }), HR);
      await service.create(sampleDto({ code: 'B-MGR', name: 'Quản lý 50% KPI', level: JobLevel.MANAGER, salaryMin: 40_000_000, salaryMax: 70_000_000 }), HR);
    });

    it('mặc định sắp xếp theo mã tăng dần, trả phân trang', async () => {
      const res = await service.findAll({}, HR);
      expect(res.items.map((i) => i.code)).toEqual(['A-SEN', 'B-MGR', 'C-INT']);
      expect(res).toMatchObject({ page: 1, pageSize: 20, total: 3, totalPages: 1 });
    });

    it('sắp xếp theo cấp bậc dùng thứ hạng chứ không theo chữ cái', async () => {
      const asc = await service.findAll({ sortBy: JobTitleSortField.LEVEL }, HR);
      expect(asc.items.map((i) => i.level)).toEqual([JobLevel.INTERN, JobLevel.SENIOR, JobLevel.MANAGER]);
      const desc = await service.findAll({ sortBy: JobTitleSortField.LEVEL, sortDir: SortDirection.DESC }, HR);
      expect(desc.items[0].level).toBe(JobLevel.MANAGER);
    });

    it('sắp xếp theo tên và theo ngày tạo', async () => {
      expect((await service.findAll({ sortBy: JobTitleSortField.NAME }, HR)).items).toHaveLength(3);
      expect((await service.findAll({ sortBy: JobTitleSortField.CREATED_AT, sortDir: SortDirection.DESC }, HR)).items).toHaveLength(3);
    });

    it('HR sắp xếp theo lương tối đa giảm dần', async () => {
      const res = await service.findAll({ sortBy: JobTitleSortField.SALARY_MAX, sortDir: SortDirection.DESC }, HR);
      expect(res.items.map((i) => i.salaryMax)).toEqual([70_000_000, 50_000_000, 5_000_000]);
    });

    it('phân trang', async () => {
      const p1 = await service.findAll({ page: 1, pageSize: 2 }, HR);
      const p2 = await service.findAll({ page: 2, pageSize: 2 }, HR);
      expect(p1.items).toHaveLength(2);
      expect(p2.items).toHaveLength(1);
      expect(p1.totalPages).toBe(2);
      expect([...p1.items, ...p2.items].map((i) => i.code)).toEqual(['A-SEN', 'B-MGR', 'C-INT']);
    });

    it('tìm theo mã hoặc tên, không phân biệt hoa/thường', async () => {
      expect((await service.findAll({ search: 'a-sen' }, HR)).items.map((i) => i.code)).toEqual(['A-SEN']);
      expect((await service.findAll({ search: 'THỰC TẬP' }, HR)).items.map((i) => i.code)).toEqual(['C-INT']);
      expect((await service.findAll({ search: 'dev' }, HR)).items.map((i) => i.code)).toEqual(['C-INT']);
    });

    it('ký tự % trong từ khoá được coi là chữ, không phải ký tự đại diện', async () => {
      expect((await service.findAll({ search: '50%' }, HR)).items.map((i) => i.code)).toEqual(['B-MGR']);
      expect((await service.findAll({ search: '%' }, HR)).items.map((i) => i.code)).toEqual(['B-MGR']);
      expect((await service.findAll({ search: '_' }, HR)).total).toBe(0);
    });

    it('lọc theo cấp bậc và trạng thái', async () => {
      const mgr = await service.findAll({ level: JobLevel.MANAGER }, HR);
      expect(mgr.items.map((i) => i.code)).toEqual(['B-MGR']);
      await service.setStatus(mgr.items[0].id, JobTitleStatus.INACTIVE, HR);
      expect((await service.findAll({ status: JobTitleStatus.INACTIVE }, HR)).items.map((i) => i.code)).toEqual(['B-MGR']);
      expect((await service.findAll({ status: JobTitleStatus.ACTIVE }, HR)).total).toBe(2);
    });

    it('HR lọc theo khoảng lương giao với dải của chức danh', async () => {
      expect((await service.findAll({ salaryFrom: 60_000_000 }, HR)).items.map((i) => i.code)).toEqual(['B-MGR']);
      expect((await service.findAll({ salaryTo: 4_000_000 }, HR)).items.map((i) => i.code)).toEqual(['C-INT']);
      // [20tr, 35tr] giao với A-SEN (30-50tr) nhưng không giao với B-MGR (40-70tr)
      expect((await service.findAll({ salaryFrom: 20_000_000, salaryTo: 35_000_000 }, HR)).items.map((i) => i.code)).toEqual(['A-SEN']);
      // [20tr, 45tr] giao với cả hai
      expect((await service.findAll({ salaryFrom: 20_000_000, salaryTo: 45_000_000 }, HR)).items.map((i) => i.code)).toEqual(['A-SEN', 'B-MGR']);
    });

    it('trang rỗng vẫn có totalPages tối thiểu 1', async () => {
      const res = await service.findAll({ search: 'không-có' }, HR);
      expect(res).toMatchObject({ items: [], total: 0, totalPages: 1 });
    });
  });

  // -------------------------------------------------------------- cập nhật
  describe('update', () => {
    let id: string;
    beforeEach(async () => {
      id = (await service.create(sampleDto(), HR)).id;
    });
    const dto = (o = {}) => ({ name: 'Lập trình viên', level: JobLevel.SENIOR, salaryMin: 30_000_000, salaryMax: 50_000_000, ...o });

    it('cập nhật dải lương, giữ nguyên mã, ghi người sửa', async () => {
      const editor = userOf(Role.HR_MANAGER);
      const view = await service.update(id, dto({ description: '  Mô tả mới ' }), { ...editor, id: 'hr-2' });
      expect(view).toMatchObject({ code: 'DEV-SR', salaryMin: 30_000_000, salaryMax: 50_000_000, description: 'Mô tả mới' });
      const row = await ds.getRepository(JobTitle).findOneByOrFail({ id });
      expect(row.updatedBy).toBe('hr-2');
      expect(row.createdBy).toBe(HR.id);
    });

    it('đổi cấp bậc cập nhật luôn thứ hạng', async () => {
      await service.update(id, dto({ level: JobLevel.LEAD }), HR);
      expect((await ds.getRepository(JobTitle).findOneByOrFail({ id })).levelRank).toBe(6);
    });

    it('lưu lại đúng giá trị cũ không báo trùng với chính nó', async () => {
      await expect(service.update(id, dto({ salaryMin: 28_000_000, salaryMax: 45_000_000, description: 'Phát triển phần mềm' }), HR)).resolves.toBeDefined();
    });

    it('từ chối dải lương sai', async () => {
      await expect(service.update(id, dto({ salaryMin: 50_000_000, salaryMax: 1_000_000 }), HR)).rejects.toMatchObject({ status: 400 });
    });

    it('từ chối đổi sang (tên, cấp bậc) đã thuộc chức danh khác', async () => {
      await service.create(sampleDto({ code: 'DEV-JR', level: JobLevel.JUNIOR }), HR);
      await expect(service.update(id, dto({ level: JobLevel.JUNIOR }), HR)).rejects.toMatchObject({ status: 409 });
    });

    it('404 khi chức danh không tồn tại', async () => {
      await expect(service.update('00000000-0000-4000-8000-000000000000', dto(), HR)).rejects.toMatchObject({
        status: 404,
        response: expect.objectContaining({ code: 'JOB_TITLE_NOT_FOUND' }),
      });
    });
  });

  // --------------------------------------------------------------- trạng thái
  describe('setStatus', () => {
    it('ngừng áp dụng rồi áp dụng lại; gọi lặp lại là idempotent', async () => {
      const { id } = await service.create(sampleDto(), HR);
      expect((await service.setStatus(id, JobTitleStatus.INACTIVE, HR)).status).toBe(JobTitleStatus.INACTIVE);
      expect((await service.setStatus(id, JobTitleStatus.INACTIVE, HR)).status).toBe(JobTitleStatus.INACTIVE);
      expect((await service.setStatus(id, JobTitleStatus.ACTIVE, HR)).status).toBe(JobTitleStatus.ACTIVE);
    });

    it('404 khi không tồn tại', async () => {
      await expect(service.setStatus('00000000-0000-4000-8000-000000000000', JobTitleStatus.INACTIVE, HR)).rejects.toMatchObject({ status: 404 });
    });
  });

  // -------------------------------------------- AC2: hạn mức duyệt offer
  describe('AC2: evaluateSalary (hạn mức cho offer về sau)', () => {
    it('trả trạng thái so với dải mà không lộ giá trị dải', async () => {
      const { id } = await service.create(sampleDto({ salaryMin: 10_000_000, salaryMax: 20_000_000 }), HR);
      expect(await service.evaluateSalary(id, 10_000_000)).toEqual({ status: 'WITHIN', withinBand: true });
      expect(await service.evaluateSalary(id, 20_000_000)).toEqual({ status: 'WITHIN', withinBand: true });
      expect(await service.evaluateSalary(id, 9_999_999)).toEqual({ status: 'BELOW_MIN', withinBand: false });
      expect(await service.evaluateSalary(id, 20_000_001)).toEqual({ status: 'ABOVE_MAX', withinBand: false });
      expect(Object.keys(await service.evaluateSalary(id, 15_000_000))).toEqual(['status', 'withinBand']);
    });

    it.each([0, -5, 1.5, Number.NaN])('từ chối mức lương kiểm tra không hợp lệ: %s', async (amount) => {
      const { id } = await service.create(sampleDto(), HR);
      await expect(service.evaluateSalary(id, amount)).rejects.toMatchObject({ status: 400 });
    });

    it('404 khi chức danh không tồn tại', async () => {
      await expect(service.evaluateSalary('00000000-0000-4000-8000-000000000000', 1_000_000)).rejects.toMatchObject({ status: 404 });
    });
  });

  // ----------------------------------------------------------------- khác
  it('listLevels trả đủ cấp bậc theo thứ tự tăng dần', () => {
    const levels = service.listLevels(userOf(Role.RECRUITER));
    expect(levels.map((l) => l.value)).toEqual(Object.values(JobLevel));
    expect(levels.map((l) => l.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('ràng buộc CHECK ở DB chặn dữ liệu sai dù đi đường tắt qua repository', async () => {
    const repo = ds.getRepository(JobTitle);
    const entity = repo.create({
      code: 'BAD', name: 'Bad', nameKey: 'bad', level: JobLevel.JUNIOR, levelRank: 3,
      salaryMin: 20_000_000, salaryMax: 10_000_000, description: null,
      status: JobTitleStatus.ACTIVE, createdBy: 'x', updatedBy: 'x',
    });
    await expect(repo.save(entity)).rejects.toBeInstanceOf(QueryFailedError);
  });

  it('isUniqueViolation nhận diện lỗi PostgreSQL 23505 và SQLite', () => {
    expect(isUniqueViolation(new QueryFailedError('q', [], { code: '23505', message: 'dup' } as unknown as Error))).toBe(true);
    expect(isUniqueViolation(new QueryFailedError('q', [], new Error('UNIQUE constraint failed: job_titles.code')))).toBe(true);
    expect(isUniqueViolation(new QueryFailedError('q', [], new Error('boom')))).toBe(false);
    expect(isUniqueViolation(new Error('UNIQUE constraint failed'))).toBe(false);
  });
});
