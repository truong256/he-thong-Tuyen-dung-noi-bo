import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { RequisitionReason } from '../requisition.entity';

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

  @ApiPropertyOptional({ enum: RequisitionReason })
  @IsOptional()
  @IsEnum(RequisitionReason)
  reason?: RequisitionReason;
}
