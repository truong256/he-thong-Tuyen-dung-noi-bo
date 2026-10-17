export type BudgetStatus = 'NORMAL' | 'NEAR_LIMIT' | 'EXHAUSTED' | 'EXCEEDED';

export interface BudgetSummary {
  id: number;
  departmentId: number;
  departmentName: string;
  departmentCode: string;
  year: number;
  headcountQuota: number;
  headcountUsed: number;
  headcountRemaining: number;
  headcountUtilizationRate: number;
  salaryBudgetVnd: number;
  salaryBudgetUsedVnd: number;
  salaryBudgetRemainingVnd: number;
  salaryUtilizationRate: number;
  status: BudgetStatus;
  note?: string;
  createdBy: number;
  createdByName: string;
  updatedBy: number;
  updatedByName: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetDashboardStats {
  year: number;
  activeBudgetsCount: number;
  totalHeadcountQuota: number;
  totalHeadcountUsed: number;
  totalHeadcountRemaining: number;
  overallHeadcountUtilizationRate: number;
  totalSalaryBudgetVnd: number;
  totalSalaryBudgetUsedVnd: number;
  totalSalaryBudgetRemainingVnd: number;
  overallSalaryUtilizationRate: number;
}

export interface CreateBudgetPayload {
  departmentId: number;
  year: number;
  headcountQuota: number;
  salaryBudgetVnd: number;
  note?: string;
}

export interface UpdateBudgetPayload {
  headcountQuota: number;
  salaryBudgetVnd: number;
  note?: string;
}

export interface EvaluateBudgetPayload {
  departmentId: number;
  year?: number;
  proposedQuantity: number;
  proposedMaxSalaryMonthlyVnd?: number;
  requisitionId?: number;
}

export interface BudgetEvaluation {
  budgetExists: boolean;
  departmentId: number;
  departmentName: string;
  year: number;
  headcountQuota: number;
  headcountUsed: number;
  headcountRemaining: number;
  salaryBudgetVnd: number;
  salaryBudgetUsedVnd: number;
  salaryBudgetRemainingVnd: number;
  proposedQuantity: number;
  proposedMonthlySalaryVnd: number;
  proposedAnnualizedSalaryVnd: number;
  exceedsHeadcount: boolean;
  excessHeadcount: number;
  exceedsSalary: boolean;
  excessSalaryVnd: number;
  requiresOverride: boolean;
  warningMessage?: string;
}

export interface OverrideApprovalPayload {
  reason: string;
}

export interface BudgetAuditLog {
  id: number;
  action: 'BUDGET_CREATED' | 'BUDGET_UPDATED' | 'BUDGET_DELETED' | 'BUDGET_OVERRIDE';
  departmentId: number;
  departmentName: string;
  year: number;
  requisitionId?: number;
  requisitionTitle?: string;
  userId: number;
  userEmail: string;
  userFullName?: string;
  reason?: string;
  detail?: string;
  createdAt: string;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
