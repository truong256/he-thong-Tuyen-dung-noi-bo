import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExcelImportPage from '../pages/ExcelImportPage';
import adminApi from '../api/admin';
import { ExcelImportPreviewResponse, ExcelImportResultResponse, parseAndFormatRoles } from '../types/excel';

vi.mock('../api/admin');

describe('ExcelImportPage Frontend Component (S2-S1 / S2-01)', () => {
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

  it('renders initial page with 6-step stepper, title, and file dropzone', () => {
    renderPage();

    expect(screen.getByText('Nhập danh sách nhân sự từ Excel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tải tệp Excel mẫu/i })).toBeInTheDocument();
    expect(screen.getByText(/Kéo và thả tệp Excel vào đây/i)).toBeInTheDocument();
    expect(screen.getByText('Tải mẫu')).toBeInTheDocument();
    expect(screen.getAllByText('Chọn tệp').length).toBeGreaterThan(0);
    expect(screen.getByText('Xem trước')).toBeInTheDocument();
    expect(screen.getByText('Kiểm tra lỗi')).toBeInTheDocument();
    expect(screen.getByText('Xác nhận nhập')).toBeInTheDocument();
    expect(screen.getByText('Kết quả')).toBeInTheDocument();
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

  it('calls preview API upon valid file selection, displays KPI counters and role chips', async () => {
    const mockPreview: ExcelImportPreviewResponse = {
      totalRows: 3,
      validCount: 2,
      invalidCount: 1,
      rows: [
        {
          rowNumber: 2,
          data: {
            rowNumber: 2,
            fullName: 'Nguyễn Văn A',
            email: 'nguyenvana@company.com',
            department: 'Kỹ thuật',
            role: 'RECRUITER;INTERVIEWER',
          },
          valid: true,
          errors: [],
        },
        {
          rowNumber: 3,
          data: {
            rowNumber: 3,
            fullName: 'Lê Văn C',
            email: 'levanc@company.com',
            department: 'Tuyển dụng',
            role: '', // empty role defaults to RECRUITER
          },
          valid: true,
          errors: [],
        },
        {
          rowNumber: 4,
          data: {
            rowNumber: 4,
            fullName: 'Trần Thị B',
            email: 'invalid-email',
            department: 'Kỹ thuật',
            role: 'ADMIN',
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
      expect(screen.getByText('Lê Văn C')).toBeInTheDocument();
      expect(screen.getByText('Trần Thị B')).toBeInTheDocument();
      expect(screen.getByText('Email không đúng định dạng.')).toBeInTheDocument();
    });

    // Check KPI counters
    expect(screen.getByText('Tổng số dòng phát hiện')).toBeInTheDocument();
    expect(screen.getByText('Dòng hợp lệ sẵn sàng nhập')).toBeInTheDocument();
    expect(screen.getByText('Dòng dữ liệu có lỗi')).toBeInTheDocument();

    // Check Multiple roles chips
    expect(screen.getAllByText('Chuyên viên tuyển dụng').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Người phỏng vấn')).toBeInTheDocument();
    expect(screen.getByText('Quản trị viên')).toBeInTheDocument();

    // Check CTA button reflects count
    expect(screen.getByText('Nhập 2 nhân sự hợp lệ')).toBeInTheDocument();
  });

  it('filters rows correctly when clicking All, Valid, and Error filter tabs', async () => {
    const mockPreview: ExcelImportPreviewResponse = {
      totalRows: 2,
      validCount: 1,
      invalidCount: 1,
      rows: [
        {
          rowNumber: 2,
          data: {
            rowNumber: 2,
            fullName: 'User Hợp Lệ',
            email: 'valid@company.com',
            department: 'Kỹ thuật',
            role: 'RECRUITER',
          },
          valid: true,
          errors: [],
        },
        {
          rowNumber: 3,
          data: {
            rowNumber: 3,
            fullName: 'User Có Lỗi',
            email: 'invalid@company.com',
            department: 'Kỹ thuật',
            role: 'RECRUITER',
          },
          valid: false,
          errors: ['Số điện thoại không hợp lệ.'],
        },
      ],
    };

    vi.spyOn(adminApi, 'previewImportExcel').mockResolvedValue(mockPreview);

    renderPage();

    const input = screen.getByTestId('excel-file-input');
    const validFile = new File(['content'], 'filter_test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    selectFile(input, validFile);

    await waitFor(() => {
      expect(screen.getByText('User Hợp Lệ')).toBeInTheDocument();
      expect(screen.getByText('User Có Lỗi')).toBeInTheDocument();
    });

    // Click "Hợp lệ" filter tab
    const validTab = screen.getByRole('button', { name: /Chỉ hiển thị dòng hợp lệ/i });
    fireEvent.click(validTab);
    expect(screen.getByText('User Hợp Lệ')).toBeInTheDocument();
    expect(screen.queryByText('User Có Lỗi')).not.toBeInTheDocument();

    // Click "Có lỗi" filter tab
    const invalidTab = screen.getByRole('button', { name: /Chỉ hiển thị dòng có lỗi/i });
    fireEvent.click(invalidTab);
    expect(screen.queryByText('User Hợp Lệ')).not.toBeInTheDocument();
    expect(screen.getByText('User Có Lỗi')).toBeInTheDocument();

    // Click "Tất cả" filter tab
    const allTab = screen.getByRole('button', { name: /Hiển thị tất cả các dòng/i });
    fireEvent.click(allTab);
    expect(screen.getByText('User Hợp Lệ')).toBeInTheDocument();
    expect(screen.getByText('User Có Lỗi')).toBeInTheDocument();
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
    expect(screen.getByText('Không có dòng hợp lệ')).toBeInTheDocument();
  });

  it('executes import and renders partial success report with all 6 columns in failure table', async () => {
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
            fullName: 'Phạm Sai Vai Trò',
            email: 's2s1.fail06@company.com',
            department: 'Phòng Nhân sự',
            role: 'INVALID_ROLE',
          },
          valid: false,
          errors: ['Vai trò không hợp lệ: INVALID_ROLE'],
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
            fullName: 'Phạm Sai Vai Trò',
            email: 's2s1.fail06@company.com',
            department: 'Phòng Nhân sự',
            role: 'INVALID_ROLE',
          },
          errors: ['Vai trò không hợp lệ: INVALID_ROLE'],
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

      // Check failed table columns and row details
      expect(screen.getByTestId('failed-rows-table')).toBeInTheDocument();
      expect(screen.getByText('Phạm Sai Vai Trò')).toBeInTheDocument();
      expect(screen.getByText('s2s1.fail06@company.com')).toBeInTheDocument();
      expect(screen.getByText('Phòng Nhân sự')).toBeInTheDocument();
      expect(screen.getByText('INVALID_ROLE')).toBeInTheDocument();
      expect(screen.getByText('Vai trò không hợp lệ: INVALID_ROLE')).toBeInTheDocument();

      // Check floating toast message and close button
      const toast = screen.getByTestId('toast-notification');
      expect(toast).toHaveClass('excel-import-toast');
      expect(screen.getByText('Đã nhập thành công 1 nhân sự vào hệ thống!')).toBeInTheDocument();

      // Test toast close button
      const closeBtn = screen.getByRole('button', { name: /Đóng thông báo/i });
      fireEvent.click(closeBtn);
      expect(screen.queryByTestId('toast-notification')).not.toBeInTheDocument();
    });
  });

  it('resets all state when clicking "Hủy bỏ & Chọn lại tệp"', async () => {
    const mockPreview: ExcelImportPreviewResponse = {
      totalRows: 1,
      validCount: 1,
      invalidCount: 0,
      rows: [
        {
          rowNumber: 2,
          data: {
            rowNumber: 2,
            fullName: 'Nguyễn Văn Test',
            email: 'test@company.com',
            department: 'IT',
            role: 'RECRUITER',
          },
          valid: true,
          errors: [],
        },
      ],
    };

    vi.spyOn(adminApi, 'previewImportExcel').mockResolvedValue(mockPreview);

    renderPage();

    const input = screen.getByTestId('excel-file-input');
    const validFile = new File(['content'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    selectFile(input, validFile);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Test')).toBeInTheDocument();
    });

    // Click "Hủy bỏ & Chọn lại tệp"
    const cancelBtn = screen.getByRole('button', { name: /Hủy bỏ và chọn tệp khác/i });
    fireEvent.click(cancelBtn);

    // Should return to step 1/2 file selection
    expect(screen.queryByText('Nguyễn Văn Test')).not.toBeInTheDocument();
    expect(screen.getByText(/Kéo và thả tệp Excel vào đây/i)).toBeInTheDocument();
  });

  it('correctly maps all 7 system roles into Vietnamese using parseAndFormatRoles helper', () => {
    expect(parseAndFormatRoles('ADMIN')).toEqual([{ code: 'ADMIN', label: 'Quản trị viên' }]);
    expect(parseAndFormatRoles('HR_MANAGER')).toEqual([{ code: 'HR_MANAGER', label: 'Quản lý nhân sự' }]);
    expect(parseAndFormatRoles('RECRUITER')).toEqual([{ code: 'RECRUITER', label: 'Chuyên viên tuyển dụng' }]);
    expect(parseAndFormatRoles('INTERVIEWER')).toEqual([{ code: 'INTERVIEWER', label: 'Người phỏng vấn' }]);
    expect(parseAndFormatRoles('HIRING_MANAGER')).toEqual([{ code: 'HIRING_MANAGER', label: 'Quản lý tuyển dụng' }]);
    expect(parseAndFormatRoles('APPROVER')).toEqual([{ code: 'APPROVER', label: 'Người phê duyệt' }]);
    expect(parseAndFormatRoles('CANDIDATE')).toEqual([{ code: 'CANDIDATE', label: 'Ứng viên' }]);

    // Empty role defaults to RECRUITER
    expect(parseAndFormatRoles('')).toEqual([{ code: 'RECRUITER', label: 'Chuyên viên tuyển dụng' }]);
    expect(parseAndFormatRoles(undefined)).toEqual([{ code: 'RECRUITER', label: 'Chuyên viên tuyển dụng' }]);

    // Multiple roles separated by ; or ,
    expect(parseAndFormatRoles('RECRUITER;INTERVIEWER')).toEqual([
      { code: 'RECRUITER', label: 'Chuyên viên tuyển dụng' },
      { code: 'INTERVIEWER', label: 'Người phỏng vấn' },
    ]);
    expect(parseAndFormatRoles('RECRUITER, INTERVIEWER')).toEqual([
      { code: 'RECRUITER', label: 'Chuyên viên tuyển dụng' },
      { code: 'INTERVIEWER', label: 'Người phỏng vấn' },
    ]);
  });
});
