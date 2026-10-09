export interface CompetencyCriterion {
  id?: number;
  criterionCode: string;
  criterionName: string;
  description?: string;
  weightPercent: number;
  active?: boolean;
  competencyFrameworkId?: number;
  competencyName?: string;
}

export interface JobTitleSummary {
  id: number;
  title: string;
  code: string;
}

export interface CompetencyFramework {
  id: number;
  competencyName: string;
  description?: string;
  category?: string;
  weightPercent: number;
  criteria: CompetencyCriterion[];
  jobTitles: JobTitleSummary[];
  criteriaCount: number;
  jobTitlesCount: number;
}

export interface CreateCompetencyFrameworkPayload {
  competencyName: string;
  description?: string;
  category?: string;
  criteria: CompetencyCriterion[];
  jobTitleIds?: number[];
}

export interface UpdateCompetencyFrameworkPayload {
  competencyName: string;
  description?: string;
  category?: string;
  criteria: CompetencyCriterion[];
  jobTitleIds?: number[];
}

export const FRAMEWORK_CATEGORIES = [
  'KỸ THUẬT',
  'QUẢN LÝ & LÃNH ĐẠO',
  'NHÂN SỰ & VẬN HÀNH',
  'KINH DOANH & MARKETING',
  'KỸ NĂNG MỀM & VĂN HÓA',
  'CHUNG',
] as const;
