import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExcelImportPage from '../pages/ExcelImportPage';
import adminApi from '../api/admin';
import { ExcelImportPreviewResponse, ExcelImportResultResponse } from '../types/excel';

vi.mock('../api/admin');

describe('ExcelImportPage Frontend Component (SCRUM-60 & SCRUM-61)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <ExcelImportPage />
      </MemoryRouter>
    );
  };

  const selectFile = (input: HTMLElement, file: File) => {
    Object.defineProperty(input, 'files', {
      value: [file],
      configurable: true,
    });
    fireEvent.change(input);
  };

  it('renders initial page with stepper, title, and file dropzone', () => {
    renderPage();

    expect(screen.getByText('Nhập danh sách nhân sự từ Excel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tải tệp Excel mẫu/i })).toBeInTheDocument();
    expect(screen.getByText(/Kéo và thả tệp Excel vào đây/i)).toBeInTheDocument();
    expect(screen.getByText(/Tải mẫu/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Chọn tệp/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Xem trước/i)).toBeInTheDocument();
  });

  it('handles template download correctly', async () => {
    const mockBlob = new Blob(['mock excel content'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    vi.spyOn(adminApi, 'downloadImportTemplate').mockResolvedValue(mockBlob);

    // Mock createObjectURL & revokeObjectURL
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-file');
    window.URL.revokeObjectURL = vi.fn();

    renderPage();

    const downloadBtn = screen.getByRole('button', { name: /Tải tệp Excel mẫu/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(adminApi.downloadImportTemplate).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Đã tải tệp Excel mẫu thành công!')).toBeInTheDocument();
    });
  });

  it('validates file extension and rejects invalid file formats', async () => {
    renderPage();

    const input = screen.getByTestId('excel-file-input');
    const invalidFile = new File(['content'], 'candidates.txt', { type: 'text/plain' });

    selectFile(input, invalidFile);

    await waitFor(() => {
      expect(screen.getByText(/Định dạng tệp không được hỗ trợ/i)).toBeInTheDocument();
    });
    expect(adminApi.previewImportExcel).not.toHaveBeenCalled();
  });

  it('calls preview API upon valid file selection and displays preview table and metrics', async () => {
    const mockPreview: ExcelImportPreviewResponse = {
      totalRows: 2,
      validCount: 1,
      invalidCount: 1,
      rows: [
        {
          rowNumber: 2,
          data: {
            rowNumber: 2,
            fullName: 'Nguyễn Văn A',
            email: 'nguyenvana@company.com',
            department: 'Kỹ thuật',
            role: 'Chuyên viên tuyển dụng',
          },
          valid: true,
          errors: [],
        },
        {
          rowNumber: 3,
          data: {
            rowNumber: 3,
            fullName: 'Trần Thị B',
            email: 'invalid-email',
            department: 'Kỹ thuật',
            role: 'Người phỏng vấn',
          },
          valid: false,
          errors: ['Email không đúng định dạng.'],
        },
      ],
    };

    vi.spyOn(adminApi, 'previewImportExcel').mockResolvedValue(mockPreview);

    renderPage();

    const input = screen.getByTestId('excel-file-input');
    const validFile = new File(['content'], 'nhan_su.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    selectFile(input, validFile);

    await waitFor(() => {
      expect(adminApi.previewImportExcel).toHaveBeenCalledWith(validFile);
      expect(screen.getByText(/Xem trước & Kiểm tra dữ liệu từng dòng/i)).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
      expect(screen.getByText('nguyenvana@company.com')).toBeInTheDocument();
      expect(screen.getByText('Trần Thị B')).toBeInTheDocument();
      expect(screen.getByText('Email không đúng định dạng.')).toBeInTheDocument();
    });

    // Check summary metric chips
    expect(screen.getByText('Nhập 1 nhân sự hợp lệ')).toBeInTheDocument();
  });

  it('disables Import CTA button when there are 0 valid rows', async () => {
    const mockPreviewAllInvalid: ExcelImportPreviewResponse = {
      totalRows: 1,
      validCount: 0,
      invalidCount: 1,
      rows: [
        {
          rowNumber: 2,
          data: {
            rowNumber: 2,
            fullName: 'Lỗi Toàn Bộ',
            email: 'duplicate@company.com',
            department: 'Kế toán',
            role: 'ADMIN',
          },
          valid: false,
          errors: ['Email đã tồn tại trong hệ thống.'],
        },
      ],
    };

    vi.spyOn(adminApi, 'previewImportExcel').mockResolvedValue(mockPreviewAllInvalid);

    renderPage();

    const input = screen.getByTestId('excel-file-input');
    const validFile = new File(['content'], 'all_invalid.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    selectFile(input, validFile);

    await waitFor(() => {
      expect(screen.getByText(/Tất cả các dòng dữ liệu trong tệp đều có lỗi/i)).toBeInTheDocument();
    });

    const confirmBtn = screen.getByTestId('btn-confirm-import');
    expect(confirmBtn).toBeDisabled();
  });

  it('executes import and renders partial success report with failed rows list', async () => {
    const mockPreview: ExcelImportPreviewResponse = {
      totalRows: 2,
      validCount: 1,
      invalidCount: 1,
      rows: [
        {
          rowNumber: 2,
          data: {
            rowNumber: 2,
            fullName: 'Hợp Lệ Một',
            email: 'valid1@company.com',
            department: 'IT',
            role: 'INTERVIEWER',
          },
          valid: true,
          errors: [],
        },
        {
          rowNumber: 3,
          data: {
            rowNumber: 3,
            fullName: 'Lỗi Hai',
            email: 'fail2@company.com',
            department: 'IT',
            role: 'UNKNOWN',
          },
          valid: false,
          errors: ['Vai trò không hợp lệ'],
        },
      ],
    };

    const mockImportResult: ExcelImportResultResponse = {
      totalRows: 2,
      successCount: 1,
      failedCount: 1,
      successRows: [
        {
          rowNumber: 2,
          userId: 101,
          email: 'valid1@company.com',
          fullName: 'Hợp Lệ Một',
          roles: ['INTERVIEWER'],
          emailStatus: 'ACCOUNT_CREATED_EMAIL_SENT',
        },
      ],
      failedRows: [
        {
          rowNumber: 3,
          data: {
            rowNumber: 3,
            fullName: 'Lỗi Hai',
            email: 'fail2@company.com',
            department: 'IT',
            role: 'UNKNOWN',
          },
          errors: ['Vai trò không hợp lệ'],
        },
      ],
    };

    vi.spyOn(adminApi, 'previewImportExcel').mockResolvedValue(mockPreview);
    vi.spyOn(adminApi, 'executeImportExcel').mockResolvedValue(mockImportResult);

    renderPage();

    const input = screen.getByTestId('excel-file-input');
    const validFile = new File(['content'], 'partial.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    selectFile(input, validFile);

    await waitFor(() => {
      expect(screen.getByTestId('btn-confirm-import')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId('btn-confirm-import'));

    await waitFor(() => {
      expect(adminApi.executeImportExcel).toHaveBeenCalledWith(validFile);
      expect(screen.getByTestId('import-result-card')).toBeInTheDocument();
      expect(screen.getByText('Báo cáo kết quả nhập dữ liệu hoàn tất')).toBeInTheDocument();
      expect(screen.getByText('Danh sách các dòng không thể nhập (1 dòng):')).toBeInTheDocument();
      expect(screen.getByText('Vai trò không hợp lệ')).toBeInTheDocument();
      expect(screen.getByTestId('btn-back-users')).toBeInTheDocument();
    });
  });

  it('handles backend import error gracefully without crashing', async () => {
    const mockPreview: ExcelImportPreviewResponse = {
      totalRows: 1,
      validCount: 1,
      invalidCount: 0,
      rows: [
        {
          rowNumber: 2,
          data: {
            rowNumber: 2,
            fullName: 'Valid User',
            email: 'valid@company.com',
            department: 'IT',
            role: 'RECRUITER',
          },
          valid: true,
          errors: [],
        },
      ],
    };

    vi.spyOn(adminApi, 'previewImportExcel').mockResolvedValue(mockPreview);
    vi.spyOn(adminApi, 'executeImportExcel').mockRejectedValue({
      response: { data: { message: 'Máy chủ đang bận xử lý giao dịch.' } },
    });

    renderPage();

    const input = screen.getByTestId('excel-file-input');
    const validFile = new File(['content'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    selectFile(input, validFile);

    await waitFor(() => {
      expect(screen.getByTestId('btn-confirm-import')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId('btn-confirm-import'));

    await waitFor(() => {
      expect(screen.getAllByText('Máy chủ đang bận xử lý giao dịch.').length).toBeGreaterThan(0);
    });
  });
});
