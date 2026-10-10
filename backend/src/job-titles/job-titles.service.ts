import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { AuthUser } from '../auth/auth.types';
import {
  ErrorCode,
  badRequest,
  conflict,
  forbidden,
  notFound,
  salaryForbidden,
} from '../common/errors';
import { hasPermission, Permission } from '../common/permissions';
import { CreateJobTitleDto, JobTitleBodyDto, UpdateJobTitleDto } from './dto/job-title-body.dto';
import { ListJobTitlesQueryDto } from './dto/list-job-titles.query';
import { JobTitle } from './job-title.entity';
import {
  SalaryEvaluation,
  assertSalaryRange,
  collapseSpaces,
  escapeLike,
  evaluateAgainstBand,
  rankOf,
  toNameKey,
} from './job-title.rules';
import {
  CURRENCY,
  JOB_LEVEL_META,
  JobLevel,
  JobTitleSortField,
  JobTitleStatus,
  SortDirection,
} from './job-title.types';
import { Paginated, SalaryBandView, JobTitleView, toJobTitleView } from './job-title.views';

const DEFAULT_PAGE_SIZE = 20;

/** Cột (thuộc tính entity) tương ứng với từng trường sắp xếp. */
const SORT_COLUMNS: Readonly<Record<JobTitleSortField, keyof JobTitle>> = {
  [JobTitleSortField.CODE]: 'code',
  [JobTitleSortField.NAME]: 'name',
  [JobTitleSortField.LEVEL]: 'levelRank',
  [JobTitleSortField.CREATED_AT]: 'createdAt',
  [JobTitleSortField.SALARY_MIN]: 'salaryMin',
  [JobTitleSortField.SALARY_MAX]: 'salaryMax',
};

export function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as { code?: string; message?: string } | undefined;
  return driverError?.code === '23505' || /UNIQUE constraint failed/i.test(driverError?.message ?? error.message);
}

@Injectable()
export class JobTitlesService {
  private readonly logger = new Logger(JobTitlesService.name);

  constructor(@InjectRepository(JobTitle) private readonly repo: Repository<JobTitle>) {}

  // ------------------------------------------------------------------ đọc

  listLevels(actor: AuthUser): { value: JobLevel; label: string; rank: number }[] {
    this.assertPermission(actor, Permission.JOB_TITLE_READ);
    return Object.values(JobLevel).map((value) => ({ value, ...JOB_LEVEL_META[value] }));
  }

  async findAll(query: ListJobTitlesQueryDto, actor: AuthUser): Promise<Paginated<JobTitleView>> {
    this.assertPermission(actor, Permission.JOB_TITLE_READ);
    const canSeeSalary = this.canSeeSalary(actor);

    // Chặn kênh phụ: nếu cho người không có quyền lọc/sắp xếp theo lương thì họ
    // có thể suy ra dải lương dù không thấy con số nào.
    const touchesSalary =
      query.salaryFrom !== undefined ||
      query.salaryTo !== undefined ||
      query.sortBy === JobTitleSortField.SALARY_MIN ||
      query.sortBy === JobTitleSortField.SALARY_MAX;
    if (touchesSalary && !canSeeSalary) throw salaryForbidden();

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const sortBy = query.sortBy ?? JobTitleSortField.CODE;
    const direction = (query.sortDir ?? SortDirection.ASC) === SortDirection.DESC ? 'DESC' : 'ASC';

    const qb = this.repo.createQueryBuilder('jt');
    if (query.search) {
      const like = `%${escapeLike(query.search.toLowerCase())}%`;
      qb.andWhere(`(LOWER(jt.code) LIKE :like ESCAPE '\\' OR LOWER(jt.name) LIKE :like ESCAPE '\\')`, { like });
    }
    if (query.level) qb.andWhere('jt.level = :level', { level: query.level });
    if (query.status) qb.andWhere('jt.status = :status', { status: query.status });
    if (query.salaryFrom !== undefined) qb.andWhere('jt.salaryMax >= :salaryFrom', { salaryFrom: query.salaryFrom });
    if (query.salaryTo !== undefined) qb.andWhere('jt.salaryMin <= :salaryTo', { salaryTo: query.salaryTo });

    qb.orderBy(`jt.${SORT_COLUMNS[sortBy]}`, direction);
    if (sortBy !== JobTitleSortField.CODE) qb.addOrderBy('jt.code', 'ASC'); // thứ tự ổn định khi trùng giá trị
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows.map((row) => toJobTitleView(row, canSeeSalary)),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async findOne(id: string, actor: AuthUser): Promise<JobTitleView> {
    this.assertPermission(actor, Permission.JOB_TITLE_READ);
    return toJobTitleView(await this.mustFind(id), this.canSeeSalary(actor));
  }

  /** Endpoint riêng cho dải lương: kiểm quyền TRƯỚC khi truy vấn dữ liệu. */
  async getSalaryBand(id: string, actor: AuthUser): Promise<SalaryBandView> {
    if (!this.canSeeSalary(actor)) throw salaryForbidden();
    const entity = await this.mustFind(id);
    return {
      id: entity.id,
      code: entity.code,
      currency: CURRENCY,
      salaryMin: entity.salaryMin,
      salaryMax: entity.salaryMax,
    };
  }

  // ----------------------------------------------------------------- ghi

  async create(dto: CreateJobTitleDto, actor: AuthUser): Promise<JobTitleView> {
    this.assertPermission(actor, Permission.JOB_TITLE_WRITE);
    assertSalaryRange(dto.salaryMin, dto.salaryMax);

    const code = dto.code.trim().toUpperCase();
    const name = collapseSpaces(dto.name);
    const nameKey = toNameKey(name);

    if (await this.repo.exists({ where: { code } })) {
      throw conflict(ErrorCode.JOB_TITLE_CODE_EXISTS, `Mã chức danh "${code}" đã tồn tại.`);
    }
    await this.assertNameLevelFree(nameKey, dto.level);

    const entity = this.repo.create({
      id: randomUUID(),
      code,
      name,
      nameKey,
      level: dto.level,
      levelRank: rankOf(dto.level),
      salaryMin: dto.salaryMin,
      salaryMax: dto.salaryMax,
      description: this.normalizeDescription(dto.description),
      status: JobTitleStatus.ACTIVE,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    const saved = await this.save(entity);
    this.logger.log(`Chức danh ${saved.code} được tạo bởi ${actor.id}`);
    return toJobTitleView(saved, this.canSeeSalary(actor));
  }

  async update(id: string, dto: UpdateJobTitleDto, actor: AuthUser): Promise<JobTitleView> {
    this.assertPermission(actor, Permission.JOB_TITLE_WRITE);
    assertSalaryRange(dto.salaryMin, dto.salaryMax);

    const entity = await this.mustFind(id);
    const name = collapseSpaces(dto.name);
    const nameKey = toNameKey(name);

    if (nameKey !== entity.nameKey || dto.level !== entity.level) {
      await this.assertNameLevelFree(nameKey, dto.level, entity.id);
    }

    const changed = this.diffFields(entity, dto, name);
    Object.assign(entity, {
      name,
      nameKey,
      level: dto.level,
      levelRank: rankOf(dto.level),
      salaryMin: dto.salaryMin,
      salaryMax: dto.salaryMax,
      description: this.normalizeDescription(dto.description),
      updatedBy: actor.id,
    });
    const saved = await this.save(entity);
    // Chỉ ghi tên trường thay đổi, không ghi giá trị lương vào log ứng dụng.
    this.logger.log(`Chức danh ${saved.code} được cập nhật bởi ${actor.id}; trường đổi: ${changed.join(', ') || 'không'}`);
    return toJobTitleView(saved, this.canSeeSalary(actor));
  }

  /** Ngừng / áp dụng lại chức danh. Không xoá cứng vì offer và yêu cầu tuyển dụng sẽ tham chiếu. */
  async setStatus(id: string, status: JobTitleStatus, actor: AuthUser): Promise<JobTitleView> {
    this.assertPermission(actor, Permission.JOB_TITLE_WRITE);
    const entity = await this.mustFind(id);
    if (entity.status !== status) {
      entity.status = status;
      entity.updatedBy = actor.id;
      await this.save(entity);
      this.logger.log(`Chức danh ${entity.code} chuyển sang ${status} bởi ${actor.id}`);
    }
    return toJobTitleView(entity, this.canSeeSalary(actor));
  }

  // ------------------------------------------------ dùng nội bộ cho module sau

  /**
   * Hạn mức duyệt offer (S7-04/S7-05) và đề xuất lương trong yêu cầu tuyển dụng (S2-10).
   * CỐ Ý không có route HTTP: nếu mở ra, người không có quyền có thể dò nhị phân
   * để suy ra dải lương. Module gọi chỉ nhận trạng thái, không nhận giá trị dải.
   */
  async evaluateSalary(titleId: string, amount: number): Promise<SalaryEvaluation> {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw badRequest(ErrorCode.SALARY_AMOUNT_INVALID, 'Mức lương cần kiểm tra phải là số nguyên VND lớn hơn 0.');
    }
    const entity = await this.mustFind(titleId);
    return evaluateAgainstBand(entity.salaryMin, entity.salaryMax, amount);
  }

  // ------------------------------------------------------------- nội bộ

  private canSeeSalary(actor: AuthUser): boolean {
    return hasPermission(actor.role, Permission.SALARY_BAND_READ);
  }

  private assertPermission(actor: AuthUser, permission: Permission): void {
    if (!hasPermission(actor.role, permission)) {
      throw forbidden(ErrorCode.PERMISSION_DENIED, 'Bạn không có quyền thực hiện chức năng này.');
    }
  }

  private async mustFind(id: string): Promise<JobTitle> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw notFound(ErrorCode.JOB_TITLE_NOT_FOUND, 'Không tìm thấy chức danh.');
    return entity;
  }

  private async assertNameLevelFree(nameKey: string, level: JobLevel, ignoreId?: string): Promise<void> {
    const existing = await this.repo.findOne({ where: { nameKey, level } });
    if (existing && existing.id !== ignoreId) {
      throw conflict(
        ErrorCode.JOB_TITLE_NAME_LEVEL_EXISTS,
        `Đã có chức danh cùng tên ở cấp bậc "${JOB_LEVEL_META[level].label}".`,
      );
    }
  }

  /** Bắt lỗi trùng khoá từ DB (hai người lưu cùng lúc) và đổi thành 409 thay vì 500. */
  private async save(entity: JobTitle): Promise<JobTitle> {
    try {
      return await this.repo.save(entity);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict(ErrorCode.JOB_TITLE_CODE_EXISTS, 'Mã hoặc tên chức danh đã tồn tại.');
      }
      throw error;
    }
  }

  private normalizeDescription(value: string | undefined): string | null {
    const trimmed = value === undefined ? '' : collapseSpaces(value);
    return trimmed === '' ? null : trimmed;
  }

  private diffFields(entity: JobTitle, dto: JobTitleBodyDto, name: string): string[] {
    const changed: string[] = [];
    if (entity.name !== name) changed.push('name');
    if (entity.level !== dto.level) changed.push('level');
    if (entity.salaryMin !== dto.salaryMin) changed.push('salaryMin');
    if (entity.salaryMax !== dto.salaryMax) changed.push('salaryMax');
    if (entity.description !== this.normalizeDescription(dto.description)) changed.push('description');
    return changed;
  }
}
