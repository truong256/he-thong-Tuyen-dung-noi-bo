export interface ExcelImportRowData {
  rowNumber: number;
  employeeCode?: string;
  fullName: string;
  email: string;
  phone?: string;
  department: string;
  role: string;
}

export interface ExcelImportRowPreview {
  rowNumber: number;
  data: ExcelImportRowData;
  valid: boolean;
  errors: string[];
}

export interface ExcelImportPreviewResponse {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  rows: ExcelImportRowPreview[];
}

export interface ExcelImportSuccessRow {
  rowNumber: number;
  userId: number;
  email: string;
  fullName: string;
  department?: string;
  phone?: string;
  role?: string;
  roles?: string[];
  emailStatus: string;
}

export interface ExcelImportFailedRow {
  rowNumber: number;
  data: ExcelImportRowData;
  errors: string[];
}

export interface ExcelImportResultResponse {
  totalRows: number;
  successCount: number;
  failedCount: number;
  successRows: ExcelImportSuccessRow[];
  failedRows: ExcelImportFailedRow[];
}

export const ROLE_VIETNAMESE_MAP: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  HR_MANAGER: 'Quản lý nhân sự',
  RECRUITER: 'Chuyên viên tuyển dụng',
  INTERVIEWER: 'Người phỏng vấn',
  HIRING_MANAGER: 'Quản lý tuyển dụng',
  APPROVER: 'Người phê duyệt',
  CANDIDATE: 'Ứng viên',
};

export interface ParsedRoleItem {
  code: string;
  label: string;
}

export function parseAndFormatRoles(roleStr?: string): ParsedRoleItem[] {
  if (!roleStr || !roleStr.trim()) {
    return [{ code: 'RECRUITER', label: 'Chuyên viên tuyển dụng' }];
  }
  const parts = roleStr.split(/[,;]/).map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (parts.length === 0) {
    return [{ code: 'RECRUITER', label: 'Chuyên viên tuyển dụng' }];
  }
  return parts.map((code) => ({
    code,
    label: ROLE_VIETNAMESE_MAP[code] || code,
  }));
}
