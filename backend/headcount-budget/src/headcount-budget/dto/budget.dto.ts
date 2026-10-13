import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const MAX_VND = Number.MAX_SAFE_INTEGER;

export class CreateBudgetDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: 'departmentId phải là số nguyên' })
  @Min(1)
  departmentId: number;

  @ApiProperty({ example: 2026 })
  @IsInt({ message: 'Năm phải là số nguyên' })
  @Min(2000, { message: 'Năm không hợp lệ' })
  @Max(2100, { message: 'Năm không hợp lệ' })
  year: number;

  @ApiProperty({ example: 10, description: 'Chỉ tiêu headcount được duyệt đầu năm' })
  @IsInt({ message: 'Chỉ tiêu headcount phải là số nguyên' })
  @Min(0, { message: 'Chỉ tiêu headcount không được âm' })
  @Max(100000)
  headcountQuota: number;

  @ApiProperty({ example: 3600000000, description: 'Ngân sách lương cả năm (VND)' })
  @IsInt({ message: 'Ngân sách lương phải là số nguyên VND' })
  @Min(0, { message: 'Ngân sách lương không được âm' })
  @Max(MAX_VND)
  salaryBudgetVnd: number;
}

export class UpdateBudgetDto {
  @ApiProperty({ example: 12 })
  @IsInt({ message: 'Chỉ tiêu headcount phải là số nguyên' })
  @Min(0, { message: 'Chỉ tiêu headcount không được âm' })
  @Max(100000)
  headcountQuota: number;

  @ApiProperty({ example: 4200000000 })
  @IsInt({ message: 'Ngân sách lương phải là số nguyên VND' })
  @Min(0, { message: 'Ngân sách lương không được âm' })
  @Max(MAX_VND)
  salaryBudgetVnd: number;
}

export class CheckBudgetDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  departmentId: number;

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 2, description: 'Số lượng cần tuyển' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 25000000, description: 'Lương đề xuất / tháng / người (VND)' })
  @IsInt()
  @Min(1)
  @Max(MAX_VND)
  proposedSalaryVnd: number;
}

export class OverrideDto {
  @ApiProperty({ example: 'Dự án khách hàng X được ký thêm, cần bổ sung nhân sự gấp.' })
  @IsString()
  @IsNotEmpty({ message: 'Phải nhập lý do ghi đè' })
  @MaxLength(500, { message: 'Lý do ghi đè tối đa 500 ký tự' })
  reason: string;
}

export class ApproveDto {
  @ApiPropertyOptional({ type: OverrideDto, description: 'Chỉ HR Manager mới được gửi khi vượt chỉ tiêu' })
  @IsOptional()
  @ValidateNested()
  @Type(() => OverrideDto)
  override?: OverrideDto;
}
