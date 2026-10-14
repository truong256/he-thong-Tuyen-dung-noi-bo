import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { bigintTransformer } from '../common/transformers';

/**
 * SCRUM-123 — Ngân sách headcount của MỘT phòng ban trong MỘT năm.
 * Số liệu "đã dùng / còn lại" KHÔNG lưu ở đây mà tính từ yêu cầu tuyển dụng
 * đã duyệt và còn hiệu lực -> không bao giờ lệch dữ liệu.
 */
@Entity('headcount_budgets')
@Index('uq_headcount_budget_dept_year', ['departmentId', 'year'], { unique: true })
export class HeadcountBudget {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'department_id' })
  departmentId: number;

  @Column({ type: 'int' })
  year: number;

  /** Chỉ tiêu headcount được phê duyệt đầu năm */
  @Column({ type: 'int', name: 'headcount_quota' })
  headcountQuota: number;

  /** Tổng ngân sách lương cả năm, đơn vị VND (số nguyên) */
  @Column({ type: 'bigint', name: 'salary_budget_vnd', transformer: bigintTransformer })
  salaryBudgetVnd: number;

  @Column({ type: 'int', name: 'created_by' })
  createdBy: number;

  @Column({ type: 'int', name: 'updated_by' })
  updatedBy: number;

  @VersionColumn()
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
