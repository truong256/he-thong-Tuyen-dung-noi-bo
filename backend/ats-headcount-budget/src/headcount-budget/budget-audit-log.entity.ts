import { BeforeRemove, BeforeUpdate, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum BudgetAuditAction {
  BUDGET_CREATED = 'BUDGET_CREATED',
  BUDGET_UPDATED = 'BUDGET_UPDATED',
  BUDGET_DELETED = 'BUDGET_DELETED',
  /** HR Manager ghi đè khi vượt chỉ tiêu */
  BUDGET_OVERRIDE = 'BUDGET_OVERRIDE',
}

/** Nhật ký chỉ-thêm (append-only). Trên PostgreSQL còn có trigger chặn UPDATE/DELETE. */
@Entity('budget_audit_logs')
export class BudgetAuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30 })
  action: BudgetAuditAction;

  @Column({ type: 'int', name: 'department_id' })
  departmentId: number;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int', name: 'requisition_id', nullable: true })
  requisitionId: number | null;

  @Column({ type: 'int', name: 'user_id' })
  userId: number;

  @Column({ type: 'varchar', length: 255, name: 'user_email' })
  userEmail: string;

  /** Lý do ghi đè (bắt buộc với BUDGET_OVERRIDE) */
  @Column({ type: 'text', nullable: true })
  reason: string | null;

  /** JSON: ảnh chụp số liệu tại thời điểm thao tác */
  @Column({ type: 'text', nullable: true })
  detail: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @BeforeUpdate()
  @BeforeRemove()
  protected forbidMutation(): void {
    throw new Error('Nhật ký ngân sách không được sửa hoặc xoá.');
  }
}
