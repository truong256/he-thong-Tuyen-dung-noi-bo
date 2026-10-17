import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { bigintTransformer, DATETIME_TYPE } from '../common/transformers';

export enum RequisitionStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED',
  CLOSED = 'CLOSED',
  FILLED = 'FILLED',
}

/**
 * Technical Note: "Tính ngân sách theo dữ liệu yêu cầu đã duyệt và còn hiệu lực".
 * Chỉ các trạng thái dưới đây mới được tính vào số headcount đã dùng.
 */
export const BUDGET_COUNTED_STATUSES: RequisitionStatus[] = [
  RequisitionStatus.APPROVED, // đã duyệt, đang tuyển
  RequisitionStatus.FILLED, // đã tuyển đủ -> headcount đã được dùng thật
];

/**
 * S3-08: yêu cầu còn đang chờ xử lý/tuyển mà quá hạn tuyển => cảnh báo trễ hạn.
 * ON_HOLD (tạm dừng), CANCELLED, CLOSED, REJECTED, FILLED không bị coi là trễ.
 */
export const OVERDUE_ELIGIBLE_STATUSES: RequisitionStatus[] = [
  RequisitionStatus.DRAFT,
  RequisitionStatus.PENDING_APPROVAL,
  RequisitionStatus.APPROVED,
];

export enum RequisitionReason {
  REPLACEMENT = 'REPLACEMENT',
  NEW = 'NEW',
}

/** Bản tối thiểu của yêu cầu tuyển dụng (đầy đủ ở S2-10/S3-02) — đủ để tính ngân sách */
@Entity('recruitment_requisitions')
export class Requisition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'int', name: 'department_id' })
  departmentId: number;

  /** Năm ngân sách mà yêu cầu này trừ vào */
  @Column({ type: 'int', name: 'budget_year' })
  budgetYear: number;

  @Column({ type: 'int' })
  quantity: number;

  /** Lương đề xuất / tháng / người, VND */
  @Column({ type: 'bigint', name: 'proposed_salary_vnd', transformer: bigintTransformer })
  proposedSalaryVnd: number;

  @Column({ type: 'varchar', length: 20, default: RequisitionReason.NEW })
  reason: RequisitionReason;

  @Column({ type: 'varchar', length: 20, default: RequisitionStatus.DRAFT })
  status: RequisitionStatus;

  /** S3-08: hạn cần có người (YYYY-MM-DD), không bắt buộc */
  @Column({ type: 'date', name: 'due_date', nullable: true })
  dueDate: string | null;

  /** S3-07: lý do tạm dừng / đóng / huỷ gần nhất */
  @Column({ type: 'varchar', length: 500, name: 'status_reason', nullable: true })
  statusReason: string | null;

  @Column({ type: 'int', name: 'status_changed_by', nullable: true })
  statusChangedBy: number | null;

  @Column({ type: DATETIME_TYPE, name: 'status_changed_at', nullable: true })
  statusChangedAt: Date | null;

  @Column({ type: 'int', name: 'created_by' })
  createdBy: number;

  @Column({ type: 'int', name: 'approved_by', nullable: true })
  approvedBy: number | null;

  @Column({ type: DATETIME_TYPE, name: 'approved_at', nullable: true })
  approvedAt: Date | null;

  /** true nếu yêu cầu được duyệt nhờ HR Manager ghi đè vượt chỉ tiêu */
  @Column({ type: 'boolean', name: 'budget_overridden', default: false })
  budgetOverridden: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
