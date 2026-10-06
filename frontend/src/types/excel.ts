export interface ExcelImportRowData {
  rowNumber: number;
  fullName: string;
  email: string;
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
  roles: string[];
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
