import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { RequisitionReason, RequisitionStatus } from '../requisition.entity';

export class CreateRequisitionDto {
  @ApiProperty({ example: 'Backend Developer' })
  @IsString()
  @IsNotEmpty({ message: 'Phải nhập tiêu đề' })
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  departmentId: number;

  @ApiPropertyOptional({ example: 2026, description: 'Mặc định là năm hiện tại' })
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  budgetYear?: number;

  @ApiProperty({ example: 2 })
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  @Max(1000)
  quantity: number;

  @ApiProperty({ example: 25000000, description: 'Lương đề xuất / tháng / người (VND)' })
  @IsInt({ message: 'Lương phải là số nguyên VND' })
  @Min(1, { message: 'Lương đề xuất phải lớn hơn 0' })
  @Max(Number.MAX_SAFE_INTEGER)
  proposedSalaryVnd: number;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Hạn cần có người (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({ strict: true }, { message: 'Hạn tuyển phải có dạng YYYY-MM-DD' })
  dueDate?: string;

  @ApiPropertyOptional({ enum: RequisitionReason })
  @IsOptional()
  @IsEnum(RequisitionReason)
  reason?: RequisitionReason;
}

/** S3-07: tạm dừng / đóng / huỷ — bắt buộc nhập lý do */
export class StatusChangeDto {
  @ApiProperty({ example: 'Dự án tạm hoãn đến quý sau.' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Phải nhập lý do' })
  @MinLength(5, { message: 'Lý do tối thiểu 5 ký tự' })
  @MaxLength(500, { message: 'Lý do tối đa 500 ký tự' })
  reason: string;
}

/** S3-08: bộ lọc danh sách */
export class ListRequisitionsQuery {
  @ApiPropertyOptional() @IsOptional() @IsEnum(RequisitionStatus) status?: RequisitionStatus;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) departmentId?: number;
  @ApiPropertyOptional({ description: 'Tìm theo tiêu đề' }) @IsOptional() @IsString() @MaxLength(100) q?: string;
  @ApiPropertyOptional({ description: 'Hạn tuyển từ ngày (YYYY-MM-DD)' }) @IsOptional() @IsDateString({ strict: true }) dueFrom?: string;
  @ApiPropertyOptional({ description: 'Hạn tuyển đến ngày (YYYY-MM-DD)' }) @IsOptional() @IsDateString({ strict: true }) dueTo?: string;
  @ApiPropertyOptional({ description: 'true = chỉ yêu cầu đã trễ hạn' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  overdue?: boolean;
}
