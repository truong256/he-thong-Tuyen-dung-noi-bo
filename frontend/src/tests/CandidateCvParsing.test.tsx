import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import CvParsingConfirmModal from '../components/candidate/CvParsingConfirmModal';
import candidateApi from '../api/candidate';
import { CandidateDetail } from '../types/candidate';

vi.mock('../api/candidate', () => ({
  default: {
    confirmParsedInfo: vi.fn(),
    reparseCv: vi.fn(),
    getCvUrl: vi.fn((id: number) => `/api/candidates/${id}/cv`),
  },
}));

describe('S4-04: Recruiter confirms and edits CV parsed info in modal', () => {
  const mockCandidateSuccess: CandidateDetail = {
    id: 101,
    requisitionId: 5,
    fullName: 'Lê Văn Gốc',
    email: 'goc@example.com',
    phone: '0901234567',
    stage: 'APPLIED',
    cvFileName: 'nguyen_van_a_cv.pdf',
    cvUrl: '/api/candidates/101/cv',
    parsedFullName: 'Nguyễn Văn A Gợi Ý',
    parsedEmail: 'nguyen.vana.goiy@example.com',
    parsedPhone: '0987654321',
    parsedStatus: 'SUCCESS',
    parsedMessage: 'Bóc tách thông tin từ CV thành công.',
    isParsedConfirmed: false,
    createdAt: '2026-10-19T00:00:00Z',
    updatedAt: '2026-10-19T00:00:00Z',
  };

  const mockCandidateFailed: CandidateDetail = {
    id: 102,
    requisitionId: 5,
    fullName: 'Trần Thị B',
    email: 'tran.b@example.com',
    phone: '0912345678',
    stage: 'APPLIED',
    cvFileName: 'scanned_cv.pdf',
    cvUrl: '/api/candidates/102/cv',
    parsedFullName: null,
    parsedEmail: null,
    parsedPhone: null,
    parsedStatus: 'UNREADABLE_OR_EMPTY',
    parsedMessage: 'Tệp PDF không có lớp văn bản (dạng scan/ảnh) hoặc nội dung rỗng. Recruiter có thể nhập tay thông tin.',
    isParsedConfirmed: false,
    createdAt: '2026-10-19T00:00:00Z',
    updatedAt: '2026-10-19T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders side-by-side comparison with suggestions and current verified fields', () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <CvParsingConfirmModal
        candidate={mockCandidateSuccess}
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    // Modal title
    expect(screen.getByText('Xác nhận thông tin ứng viên từ CV')).toBeInTheDocument();

    // Check suggested values on left
    expect(screen.getByText('Nguyễn Văn A Gợi Ý')).toBeInTheDocument();
    expect(screen.getByText('nguyen.vana.goiy@example.com')).toBeInTheDocument();
    expect(screen.getByText('0987654321')).toBeInTheDocument();
    expect(screen.getByText('Bóc tách thành công')).toBeInTheDocument();

    // Check editable inputs on right initialized with current data
    const nameInput = screen.getByLabelText(/Họ và tên ứng viên/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/Email liên hệ/i) as HTMLInputElement;
    const phoneInput = screen.getByLabelText(/Số điện thoại/i) as HTMLInputElement;

    expect(nameInput.value).toBe('Lê Văn Gốc');
    expect(emailInput.value).toBe('goc@example.com');
    expect(phoneInput.value).toBe('0901234567');
  });

  it('applies suggested values when clicking "Áp dụng tất cả gợi ý"', () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <CvParsingConfirmModal
        candidate={mockCandidateSuccess}
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    const applyAllBtn = screen.getByRole('button', { name: /Áp dụng tất cả gợi ý/i });
    fireEvent.click(applyAllBtn);

    const nameInput = screen.getByLabelText(/Họ và tên ứng viên/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/Email liên hệ/i) as HTMLInputElement;
    const phoneInput = screen.getByLabelText(/Số điện thoại/i) as HTMLInputElement;

    expect(nameInput.value).toBe('Nguyễn Văn A Gợi Ý');
    expect(emailInput.value).toBe('nguyen.vana.goiy@example.com');
    expect(phoneInput.value).toBe('0987654321');
  });

  it('clicking "Hủy thao tác" closes modal without saving to API', () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <CvParsingConfirmModal
        candidate={mockCandidateSuccess}
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /Hủy thao tác/i });
    fireEvent.click(cancelBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(candidateApi.confirmParsedInfo).not.toHaveBeenCalled();
    expect(handleSuccess).not.toHaveBeenCalled();
  });

  it('submits confirmed info when clicking "Xác nhận & Lưu thông tin"', async () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    const mockUpdated: CandidateDetail = {
      ...mockCandidateSuccess,
      fullName: 'Nguyễn Văn A Gợi Ý',
      isParsedConfirmed: true,
    };
    vi.mocked(candidateApi.confirmParsedInfo).mockResolvedValue(mockUpdated);

    render(
      <CvParsingConfirmModal
        candidate={mockCandidateSuccess}
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    // Apply suggestions
    fireEvent.click(screen.getByRole('button', { name: /Áp dụng tất cả gợi ý/i }));

    // Click confirm & save
    const saveBtn = screen.getByRole('button', { name: /Xác nhận & Lưu thông tin/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(candidateApi.confirmParsedInfo).toHaveBeenCalledWith(101, {
        fullName: 'Nguyễn Văn A Gợi Ý',
        email: 'nguyen.vana.goiy@example.com',
        phone: '0987654321',
        stage: 'APPLIED',
      });
    });
  });

  it('displays warning notice when PDF has no text layer or parsing failed, allowing manual entry without breaking flow', () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <CvParsingConfirmModal
        candidate={mockCandidateFailed}
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    // Non-blocking warning banner shown
    expect(
      screen.getByText(/Bóc tách tự động không khả dụng cho tệp này/i)
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/không có lớp văn bản/i).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Lỗi bóc tách không làm hỏng hồ sơ ứng tuyển, bạn có thể tiếp tục xử lý bình thường/i)
    ).toBeInTheDocument();

    // User can manually edit inputs
    const nameInput = screen.getByLabelText(/Họ và tên ứng viên/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Trần Thị B Đã Sửa' } });
    expect(nameInput.value).toBe('Trần Thị B Đã Sửa');
  });
});
