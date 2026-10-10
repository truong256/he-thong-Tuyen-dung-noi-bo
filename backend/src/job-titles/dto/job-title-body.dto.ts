import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { JobLevel, MAX_SALARY_VND } from '../job-title.types';
import { Trim, Upper } from './transforms';

const salaryMessages = {
  int: 'Mức lương phải là số nguyên (đơn vị VND)',
  min: 'Mức lương phải lớn hơn 0',
  max: `Mức lương không được vượt quá ${MAX_SALARY_VND.toLocaleString('vi-VN')} VND`,
};

/** Các trường dùng chung cho tạo mới và cập nhật chức danh. */
export class JobTitleBodyDto {
  @Trim()
  @IsString({ message: 'Tên chức danh phải là chuỗi ký tự' })
  @MinLength(2, { message: 'Tên chức danh tối thiểu 2 ký tự' })
  @MaxLength(150, { message: 'Tên chức danh tối đa 150 ký tự' })
  name!: string;

  @IsEnum(JobLevel, { message: 'Cấp bậc không hợp lệ' })
  level!: JobLevel;

  @IsInt({ message: salaryMessages.int })
  @Min(1, { message: salaryMessages.min })
  @Max(MAX_SALARY_VND, { message: salaryMessages.max })
  salaryMin!: number;

  @IsInt({ message: salaryMessages.int })
  @Min(1, { message: salaryMessages.min })
  @Max(MAX_SALARY_VND, { message: salaryMessages.max })
  salaryMax!: number;

  @IsOptional()
  @Trim()
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Mô tả tối đa 500 ký tự' })
  description?: string;
}

export class CreateJobTitleDto extends JobTitleBodyDto {
  @Upper()
  @IsString({ message: 'Mã chức danh phải là chuỗi ký tự' })
  @Matches(/^[A-Z0-9][A-Z0-9_-]{1,29}$/, {
    message: 'Mã chức danh dài 2-30 ký tự, chỉ gồm chữ không dấu, số, dấu gạch ngang hoặc gạch dưới',
  })
  code!: string;
}

/** Cập nhật toàn bộ thông tin; KHÔNG cho đổi mã (forbidNonWhitelisted sẽ trả 400 nếu gửi `code`). */
export class UpdateJobTitleDto extends JobTitleBodyDto {}
