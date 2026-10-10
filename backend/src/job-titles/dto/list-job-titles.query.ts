import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { JobLevel, JobTitleSortField, JobTitleStatus, MAX_SALARY_VND, SortDirection } from '../job-title.types';
import { TrimToUndefined } from './transforms';

export class ListJobTitlesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page tối thiểu là 1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageSize phải là số nguyên' })
  @Min(1, { message: 'pageSize tối thiểu là 1' })
  @Max(100, { message: 'pageSize tối đa là 100' })
  pageSize?: number;

  /** Tìm theo mã hoặc tên chức danh. */
  @IsOptional()
  @TrimToUndefined()
  @IsString()
  @MaxLength(100, { message: 'Từ khoá tìm kiếm tối đa 100 ký tự' })
  search?: string;

  @IsOptional()
  @TrimToUndefined()
  @IsEnum(JobLevel, { message: 'Cấp bậc không hợp lệ' })
  level?: JobLevel;

  @IsOptional()
  @TrimToUndefined()
  @IsEnum(JobTitleStatus, { message: 'Trạng thái không hợp lệ' })
  status?: JobTitleStatus;

  /** Sắp xếp/lọc theo lương chỉ dành cho người có quyền xem dải lương (service chặn ở backend). */
  @IsOptional()
  @TrimToUndefined()
  @IsEnum(JobTitleSortField, { message: 'Trường sắp xếp không hợp lệ' })
  sortBy?: JobTitleSortField;

  @IsOptional()
  @TrimToUndefined()
  @IsEnum(SortDirection, { message: 'Chiều sắp xếp phải là asc hoặc desc' })
  sortDir?: SortDirection;

  /** Lọc các chức danh có dải lương giao với đoạn [salaryFrom, salaryTo]. */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'salaryFrom phải là số nguyên' })
  @Min(0)
  @Max(MAX_SALARY_VND)
  salaryFrom?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'salaryTo phải là số nguyên' })
  @Min(0)
  @Max(MAX_SALARY_VND)
  salaryTo?: number;
}
