/** Cấp bậc chức danh, xếp từ thấp lên cao. `rank` dùng để sắp xếp đúng thứ tự cấp bậc. */
export enum JobLevel {
  INTERN = 'INTERN',
  FRESHER = 'FRESHER',
  JUNIOR = 'JUNIOR',
  MIDDLE = 'MIDDLE',
  SENIOR = 'SENIOR',
  LEAD = 'LEAD',
  MANAGER = 'MANAGER',
  DIRECTOR = 'DIRECTOR',
}

export const JOB_LEVEL_META: Readonly<Record<JobLevel, { label: string; rank: number }>> = {
  [JobLevel.INTERN]: { label: 'Thực tập sinh', rank: 1 },
  [JobLevel.FRESHER]: { label: 'Mới đi làm (Fresher)', rank: 2 },
  [JobLevel.JUNIOR]: { label: 'Nhân viên (Junior)', rank: 3 },
  [JobLevel.MIDDLE]: { label: 'Chuyên viên (Middle)', rank: 4 },
  [JobLevel.SENIOR]: { label: 'Chuyên viên cao cấp (Senior)', rank: 5 },
  [JobLevel.LEAD]: { label: 'Trưởng nhóm (Lead)', rank: 6 },
  [JobLevel.MANAGER]: { label: 'Quản lý (Manager)', rank: 7 },
  [JobLevel.DIRECTOR]: { label: 'Giám đốc (Director)', rank: 8 },
};

export enum JobTitleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum JobTitleSortField {
  CODE = 'code',
  NAME = 'name',
  LEVEL = 'level',
  CREATED_AT = 'createdAt',
  SALARY_MIN = 'salaryMin',
  SALARY_MAX = 'salaryMax',
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export const CURRENCY = 'VND' as const;

/** Trần hợp lý cho một mức lương tháng: 10 tỷ VND. Chặn nhập nhầm thừa số 0. */
export const MAX_SALARY_VND = 10_000_000_000;
