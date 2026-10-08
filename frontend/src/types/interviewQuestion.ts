export interface InterviewQuestion {
  id: number;
  questionText: string;
  category: string;
  difficultyLevel: string;
  suggestedAnswer: string;
  active: boolean;
  competencyCriterionId: number | null;
  criterionCode: string | null;
  criterionName: string | null;
  competencyFrameworkId: number | null;
  competencyName: string | null;
  jobTitleId: number | null;
  jobTitle: string | null;
  createdAt: string;
  updatedAt: string;
}