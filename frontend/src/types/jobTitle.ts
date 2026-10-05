export type JobTitleLevel =
  | 'INTERN'
  | 'JUNIOR'
  | 'MIDDLE'
  | 'SENIOR'
  | 'LEAD'
  | 'MANAGER'
  | 'DIRECTOR'
  | 'EXECUTIVE';

export type JobFamily =
  | 'TECH'
  | 'HR'
  | 'PRODUCT_DESIGN'
  | 'BUSINESS'
  | 'MARKETING'
  | 'FINANCE_OPS'
  | 'CUSTOMER_SUCCESS';

export interface JobTitle {
  id: number;
  title: string;
  code: string;
  departmentId: number;
  departmentName?: string;
  level: JobTitleLevel;
  jobFamily: JobFamily;
  minSalary?: number;
  maxSalary?: number;
  salaryRangeDisplay?: string;
  jobDescription: string;
  keyResponsibilities: string[];
  requirements: string[];
  competencies?: string[];
  standardHeadcount?: number;
  currentHeadcount: number;
  openRequisitions: number;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface JobTitleStatistics {
  totalJobTitles: number;
  activeJobTitles: number;
  inactiveJobTitles: number;
  totalHeadcount: number;
  openRequisitions: number;
  levelDistribution: Record<string, number>;
}

export interface JobTitleFilterState {
  search: string;
  departmentId: string | number;
  level: string;
  jobFamily: string;
  status: 'ALL' | 'ACTIVE' | 'INACTIVE';
  sortBy: 'title' | 'level' | 'headcount' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export const LEVEL_METADATA: Record<
  JobTitleLevel,
  { label: string; shortLabel: string; order: number; colorClass: string; badgeBg: string; badgeText: string }
> = {
  INTERN: {
    label: 'Thực tập sinh (Intern)',
    shortLabel: 'Intern',
    order: 1,
    colorClass: 'level-intern',
    badgeBg: '#f1f5f9',
    badgeText: '#475569',
  },
  JUNIOR: {
    label: 'Nhân viên Mới (Junior)',
    shortLabel: 'Junior',
    order: 2,
    colorClass: 'level-junior',
    badgeBg: '#e0f2fe',
    badgeText: '#0369a1',
  },
  MIDDLE: {
    label: 'Chuyên viên (Middle)',
    shortLabel: 'Mid-level',
    order: 3,
    colorClass: 'level-middle',
    badgeBg: '#e0e7ff',
    badgeText: '#4338ca',
  },
  SENIOR: {
    label: 'Chuyên viên Cấp cao (Senior)',
    shortLabel: 'Senior',
    order: 4,
    colorClass: 'level-senior',
    badgeBg: '#fef3c7',
    badgeText: '#b45309',
  },
  LEAD: {
    label: 'Trưởng nhóm (Team Lead)',
    shortLabel: 'Team Lead',
    order: 5,
    colorClass: 'level-lead',
    badgeBg: '#fed7aa',
    badgeText: '#c2410c',
  },
  MANAGER: {
    label: 'Trưởng phòng (Manager)',
    shortLabel: 'Manager',
    order: 6,
    colorClass: 'level-manager',
    badgeBg: '#fce7f3',
    badgeText: '#be185d',
  },
  DIRECTOR: {
    label: 'Giám đốc Bộ phận (Director)',
    shortLabel: 'Director',
    order: 7,
    colorClass: 'level-director',
    badgeBg: '#ede9fe',
    badgeText: '#6d28d9',
  },
  EXECUTIVE: {
    label: 'Ban Giám đốc (C-Level / VP)',
    shortLabel: 'C-Level',
    order: 8,
    colorClass: 'level-executive',
    badgeBg: '#dcfce7',
    badgeText: '#15803d',
  },
};

export const JOB_FAMILY_METADATA: Record<
  JobFamily,
  { label: string; iconName: string; color: string }
> = {
  TECH: {
    label: 'Công nghệ & Kỹ thuật Phần mềm',
    iconName: 'Code',
    color: '#2563eb',
  },
  HR: {
    label: 'Quản trị Nhân sự & Đào tạo',
    iconName: 'Users',
    color: '#059669',
  },
  PRODUCT_DESIGN: {
    label: 'Sản phẩm & Thiết kế UI/UX',
    iconName: 'Layers',
    color: '#7c3aed',
  },
  BUSINESS: {
    label: 'Kinh doanh & Phát triển Thị trường',
    iconName: 'TrendingUp',
    color: '#d97706',
  },
  MARKETING: {
    label: 'Truyền thông & Tiếp thị',
    iconName: 'Megaphone',
    color: '#e11d48',
  },
  FINANCE_OPS: {
    label: 'Tài chính - Kế toán & Vận hành',
    iconName: 'DollarSign',
    color: '#0891b2',
  },
  CUSTOMER_SUCCESS: {
    label: 'Dịch vụ Khách hàng & Hỗ trợ kỹ thuật',
    iconName: 'Headphones',
    color: '#4f46e5',
  },
};
