export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface CompetencyCriterion {
  id: number;
  criterionCode: string;
  criterionName: string;
  description?: string;
  weightPercent?: number;
  active: boolean;
  competencyFrameworkId?: number;
  competencyName?: string;
  jobTitleId?: number;
  jobTitle?: string;
}

export interface InterviewQuestion {
  id: number;
  questionText: string;
  category?: string;
  difficultyLevel: DifficultyLevel | string;
  suggestedAnswer?: string;
  active: boolean;
  competencyCriterionId: number;
  criterionCode: string;
  criterionName: string;
  competencyFrameworkId?: number;
  competencyName?: string;
  jobTitleId?: number;
  jobTitle?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuestionFilterState {
  search: string;
  difficultyLevel: string;
  jobTitleId?: number | 'ALL';
  criterionId?: number | 'ALL';
  active?: boolean | 'ALL';
  page: number;
  size: number;
}

export interface CreateQuestionPayload {
  questionText: string;
  category?: string;
  difficultyLevel: string;
  suggestedAnswer?: string;
  competencyCriterionId: number;
}

export interface UpdateQuestionPayload {
  questionText: string;
  category?: string;
  difficultyLevel: string;
  suggestedAnswer?: string;
  competencyCriterionId: number;
  active: boolean;
}
