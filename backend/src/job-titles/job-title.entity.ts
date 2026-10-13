import {
  BeforeInsert,
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
  ValueTransformer,
} from 'typeorm';
import { randomUUID } from 'node:crypto';
import { JobLevel, JobTitleStatus } from './job-title.types';

/** pg trả bigint dạng chuỗi; mức lương tối đa 1e10 nằm trong vùng số nguyên an toàn của JS. */
const bigintToNumber: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

/**
 * Production dùng timestamptz (đúng múi giờ). Unit/e2e test chạy trên SQLite in-memory
 * (NODE_ENV=test) nên dùng datetime, vì SQLite không có kiểu timestamptz.
 */
const TIMESTAMP_TYPE = (process.env.NODE_ENV === 'test' ? 'datetime' : 'timestamptz') as 'timestamptz';

const LEVEL_LIST = Object.values(JobLevel)
  .map((l) => `'${l}'`)
  .join(', ');

@Entity('job_titles')
@Index('uq_job_titles_code', ['code'], { unique: true })
@Index('uq_job_titles_name_level', ['nameKey', 'level'], { unique: true })
@Index('ix_job_titles_status', ['status'])
@Check('chk_job_titles_salary', '"salary_min" > 0 AND "salary_max" >= "salary_min"')
@Check('chk_job_titles_level', `"level" IN (${LEVEL_LIST})`)
@Check('chk_job_titles_status', `"status" IN ('ACTIVE', 'INACTIVE')`)
export class JobTitle {
  @PrimaryColumn('uuid')
  id!: string;

  /** Mã chức danh, viết hoa, không đổi sau khi tạo vì các module sau sẽ tham chiếu. */
  @Column({ type: 'varchar', length: 30 })
  code!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  /** Tên chuẩn hoá (thường, gọn khoảng trắng) để ràng buộc duy nhất theo (tên, cấp bậc). */
  @Column({ name: 'name_key', type: 'varchar', length: 150 })
  nameKey!: string;

  @Column({ type: 'varchar', length: 20 })
  level!: JobLevel;

  /** Thứ hạng của cấp bậc, để sắp xếp theo cấp bậc thay vì theo bảng chữ cái. */
  @Column({ name: 'level_rank', type: 'smallint' })
  levelRank!: number;

  /** Mức lương tối thiểu / tháng, đơn vị VND. */
  @Column({ name: 'salary_min', type: 'bigint', transformer: bigintToNumber })
  salaryMin!: number;

  /** Mức lương tối đa / tháng, đơn vị VND. */
  @Column({ name: 'salary_max', type: 'bigint', transformer: bigintToNumber })
  salaryMax!: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 10, default: JobTitleStatus.ACTIVE })
  status!: JobTitleStatus;

  @Column({ name: 'created_by', type: 'varchar', length: 64 })
  createdBy!: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 64 })
  updatedBy!: string;

  @CreateDateColumn({ name: 'created_at', type: TIMESTAMP_TYPE })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: TIMESTAMP_TYPE })
  updatedAt!: Date;

  @BeforeInsert()
  assignId(): void {
    this.id ??= randomUUID();
  }
}
