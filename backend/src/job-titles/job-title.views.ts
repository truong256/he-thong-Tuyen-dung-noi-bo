import { JobTitle } from './job-title.entity';
import { CURRENCY, JOB_LEVEL_META, JobLevel, JobTitleStatus } from './job-title.types';

/**
 * Dạng dữ liệu trả ra API. Với người KHÔNG có quyền xem dải lương, các khoá
 * salaryMin / salaryMax / currency hoàn toàn không tồn tại trong JSON
 * (không phải null, không phải 0, không phải "***") để tránh lộ qua bất kỳ cách nào.
 */
export interface JobTitleView {
  id: string;
  code: string;
  name: string;
  level: JobLevel;
  levelLabel: string;
  description: string | null;
  status: JobTitleStatus;
  createdAt: string;
  updatedAt: string;
  salaryBandVisible: boolean;
  salaryMin?: number;
  salaryMax?: number;
  currency?: typeof CURRENCY;
}

export interface SalaryBandView {
  id: string;
  code: string;
  currency: typeof CURRENCY;
  salaryMin: number;
  salaryMax: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function toJobTitleView(entity: JobTitle, canSeeSalary: boolean): JobTitleView {
  const view: JobTitleView = {
    id: entity.id,
    code: entity.code,
    name: entity.name,
    level: entity.level,
    levelLabel: JOB_LEVEL_META[entity.level].label,
    description: entity.description,
    status: entity.status,
    createdAt: new Date(entity.createdAt).toISOString(),
    updatedAt: new Date(entity.updatedAt).toISOString(),
    salaryBandVisible: canSeeSalary,
  };
  if (canSeeSalary) {
    view.salaryMin = entity.salaryMin;
    view.salaryMax = entity.salaryMax;
    view.currency = CURRENCY;
  }
  return view;
}
