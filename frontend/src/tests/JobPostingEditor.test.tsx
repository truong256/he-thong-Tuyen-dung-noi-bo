import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as useAuthHook from '../hooks/useAuth';
import { JobPostingEditorModal } from '../components/requisition/JobPostingEditorModal';
import { JobPostingManagementPage } from '../pages/JobPostingManagementPage';
import { jobPostingApi } from '../api/jobPosting';
import { Requisition } from '../types/requisition';
import { JobPosting, JobPostingTemplate } from '../types/jobPosting';

vi.mock('../api/jobPosting');
vi.mock('../hooks/useAuth');

const mockApprovedRequisition: Requisition = {
  id: 100,
  requisitionCode: 'REQ-2026-0001',
  title: 'Tuyển dụng Kỹ sư Java Backend',
  departmentId: 1,
  departmentName: 'Phòng Kỹ thuật',
  jobTitleId: 2,
  jobTitleName: 'Kỹ sư Phần mềm',
  quantity: 2,
  reason: 'NEW_HEADCOUNT',
  status: 'APPROVED',
  jobDescription: 'Lập trình backend bằng Java Spring Boot',
  requirements: '2 năm kinh nghiệm Spring Boot và PostgreSQL',
  targetDate: '2026-11-30',
  proposedMinSalary: 20000000,
  proposedMaxSalary: 35000000,
  createdAt: '2026-10-01T08:00:00Z',
  updatedAt: '2026-10-10T08:00:00Z',
};

const mockDraftRequisition: Requisition = {
  id: 101,
  requisitionCode: 'REQ-2026-0002',
  title: 'Tuyển dụng Tester QA',
  departmentId: 1,
  jobTitleId: 3,
  quantity: 1,
  reason: 'NEW_HEADCOUNT',
  status: 'DRAFT',
  createdAt: '2026-10-01T08:00:00Z',
  updatedAt: '2026-10-01T08:00:00Z',
};

const mockTemplate: JobPostingTemplate = {
  requisitionId: 100,
  requisitionCode: 'REQ-2026-0001',
  requisitionTitle: 'Tuyển dụng Kỹ sư Java Backend',
  departmentId: 1,
  departmentName: 'Phòng Kỹ thuật',
  jobTitleId: 2,
  jobTitleName: 'Kỹ sư Phần mềm',
  quantity: 2,
  title: 'Tuyển dụng Kỹ sư Java Backend',
  jobDescription: 'Lập trình backend bằng Java Spring Boot',
  candidateRequirements: '2 năm kinh nghiệm Spring Boot và PostgreSQL',
  benefits: 'Thưởng tháng 13, BHXH đầy đủ',
  workLocation: 'Hà Nội',
  workingModel: 'HYBRID',
  applicationDeadline: '2026-11-30',
  showSalary: true,
  salaryType: 'RANGE',
  salaryMin: 20000000,
  salaryMax: 35000000,
  currency: 'VND',
  requisitionStatus: 'APPROVED',
};

describe('JobPostingEditorModal (S3-09)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[AC-1] Kế thừa đầy đủ dữ liệu từ yêu cầu đã duyệt (APPROVED)', async () => {
    vi.mocked(jobPostingApi.getByRequisitionId).mockResolvedValue(null);
    vi.mocked(jobPostingApi.getTemplate).mockResolvedValue(mockTemplate);

    render(
      <JobPostingEditorModal
        isOpen={true}
        onClose={vi.fn()}
        requisition={mockApprovedRequisition}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Tuyển dụng Kỹ sư Java Backend')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('Lập trình backend bằng Java Spring Boot')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2 năm kinh nghiệm Spring Boot và PostgreSQL')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Thưởng tháng 13, BHXH đầy đủ')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Hà Nội')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20000000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('35000000')).toBeInTheDocument();
  });

  it('[AC-3] Chặn tạo tin từ yêu cầu chưa được duyệt (DRAFT) và hiển thị thông báo lỗi', async () => {
    render(
      <JobPostingEditorModal
        isOpen={true}
        onClose={vi.fn()}
        requisition={mockDraftRequisition}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Chỉ có thể tạo tin tuyển dụng từ yêu cầu đã được phê duyệt/i)
      ).toBeInTheDocument();
    });

    // Các nút hành động Lưu nháp và Gửi duyệt bị disabled
    const saveDraftBtn = screen.getByRole('button', { name: /Lưu nháp/i });
    const submitBtn = screen.getByRole('button', { name: /Gửi phê duyệt/i });
    expect(saveDraftBtn).toBeDisabled();
    expect(submitBtn).toBeDisabled();
  });

  it('[AC-Validation] Kiểm tra validation trường bắt buộc và hạn nhận hồ sơ', async () => {
    vi.mocked(jobPostingApi.getByRequisitionId).mockResolvedValue(null);
    vi.mocked(jobPostingApi.getTemplate).mockResolvedValue(mockTemplate);

    render(
      <JobPostingEditorModal
        isOpen={true}
        onClose={vi.fn()}
        requisition={mockApprovedRequisition}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Tuyển dụng Kỹ sư Java Backend')).toBeInTheDocument();
    });

    // Xóa tiêu đề và nhập ngày quá khứ
    const titleInput = screen.getByDisplayValue('Tuyển dụng Kỹ sư Java Backend');
    fireEvent.change(titleInput, { target: { value: '' } });

    const deadlineInput = screen.getByDisplayValue('2026-11-30');
    fireEvent.change(deadlineInput, { target: { value: '2020-01-01' } });

    // Bấm lưu nháp
    const saveDraftBtn = screen.getByRole('button', { name: /Lưu nháp/i });
    fireEvent.click(saveDraftBtn);

    expect(screen.getByText(/Vui lòng nhập tiêu đề tin tuyển dụng/i)).toBeInTheDocument();
    expect(screen.getByText(/Hạn nhận hồ sơ không thể trong quá khứ/i)).toBeInTheDocument();
    expect(jobPostingApi.create).not.toHaveBeenCalled();
  });

  it('[AC-4] Xác minh bản xem trước (Preview) dùng cùng dữ liệu với giao diện công khai', async () => {
    vi.mocked(jobPostingApi.getByRequisitionId).mockResolvedValue(null);
    vi.mocked(jobPostingApi.getTemplate).mockResolvedValue(mockTemplate);

    render(
      <JobPostingEditorModal
        isOpen={true}
        onClose={vi.fn()}
        requisition={mockApprovedRequisition}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Tuyển dụng Kỹ sư Java Backend')).toBeInTheDocument();
    });

    // Chuyển sang Tab xem trước
    const previewTabBtn = screen.getByRole('button', { name: /Xem trước giao diện công khai/i });
    fireEvent.click(previewTabBtn);

    // Kiểm tra các thành phần giao diện xem trước công khai
    expect(screen.getByText(/Bản xem trước công khai/i)).toBeInTheDocument();
    expect(screen.getByText(/20.000.000 - 35.000.000 ₫/i)).toBeInTheDocument();
    expect(screen.getByText('Hà Nội')).toBeInTheDocument();
    expect(screen.getByText(/Ứng tuyển ngay \(Xem trước\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Lập trình backend bằng Java Spring Boot/i)).toBeInTheDocument();
    expect(screen.getByText(/2 năm kinh nghiệm Spring Boot và PostgreSQL/i)).toBeInTheDocument();
  });

  it('[AC-2] Lưu nháp thành công và gọi đúng API create với status DRAFT', async () => {
    vi.mocked(jobPostingApi.getByRequisitionId).mockResolvedValue(null);
    vi.mocked(jobPostingApi.getTemplate).mockResolvedValue(mockTemplate);
    vi.mocked(jobPostingApi.create).mockResolvedValue({
      id: 500,
      postingCode: 'JP-20261013-0001',
      requisitionId: 100,
      title: 'Tuyển dụng Kỹ sư Java Backend',
      jobDescription: 'Mô tả',
      candidateRequirements: 'Yêu cầu',
      workLocation: 'Hà Nội',
      workingModel: 'HYBRID',
      applicationDeadline: '2026-11-30',
      showSalary: true,
      salaryType: 'RANGE',
      currency: 'VND',
      status: 'DRAFT',
      createdByUserId: 10,
      createdAt: '2026-10-13T08:00:00Z',
      updatedAt: '2026-10-13T08:00:00Z',
    });

    const mockOnSuccess = vi.fn();
    const mockOnClose = vi.fn();

    render(
      <JobPostingEditorModal
        isOpen={true}
        onClose={mockOnClose}
        requisition={mockApprovedRequisition}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Tuyển dụng Kỹ sư Java Backend')).toBeInTheDocument();
    });

    const saveDraftBtn = screen.getByRole('button', { name: /Lưu nháp/i });
    fireEvent.click(saveDraftBtn);

    await waitFor(() => {
      expect(jobPostingApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requisitionId: 100,
          status: 'DRAFT',
          title: 'Tuyển dụng Kỹ sư Java Backend',
        })
      );
    });

    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('[AC-2] Tải lại bản nháp đã lưu không mất dữ liệu', async () => {
    const existingDraft: JobPosting = {
      id: 500,
      postingCode: 'JP-20261013-0001',
      requisitionId: 100,
      title: 'Bản nháp đã lưu trước đó',
      jobDescription: 'Mô tả đã lưu',
      candidateRequirements: 'Yêu cầu đã lưu',
      benefits: 'Quyền lợi đã lưu',
      workLocation: 'Đà Nẵng',
      workingModel: 'REMOTE',
      applicationDeadline: '2026-12-15',
      showSalary: false,
      salaryType: 'NEGOTIABLE',
      currency: 'VND',
      status: 'DRAFT',
      createdByUserId: 10,
      createdAt: '2026-10-13T08:00:00Z',
      updatedAt: '2026-10-13T08:00:00Z',
    };

    vi.mocked(jobPostingApi.getByRequisitionId).mockResolvedValue(existingDraft);

    render(
      <JobPostingEditorModal
        isOpen={true}
        onClose={vi.fn()}
        requisition={mockApprovedRequisition}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Bản nháp đã lưu trước đó')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('Mô tả đã lưu')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Đà Nẵng')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-12-15')).toBeInTheDocument();
  });

  it('Nút Xem trước và Gửi phê duyệt hiển thị văn bản rõ ràng không chứa icon thừa', async () => {
    vi.mocked(jobPostingApi.getByRequisitionId).mockResolvedValue(null);
    vi.mocked(jobPostingApi.getTemplate).mockResolvedValue(mockTemplate);

    render(
      <JobPostingEditorModal
        isOpen={true}
        onClose={vi.fn()}
        requisition={mockApprovedRequisition}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Tuyển dụng Kỹ sư Java Backend')).toBeInTheDocument();
    });

    const previewBtn = screen.getByRole('button', { name: 'Xem trước tin công khai' });
    const submitBtn = screen.getByRole('button', { name: 'Gửi phê duyệt' });
    expect(previewBtn).toBeInTheDocument();
    expect(submitBtn).toBeInTheDocument();
  });
});

describe('JobPostingManagementPage - Nút Xem chi tiết (View-only)', () => {
  beforeEach(() => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: { id: 1, email: 'recruiter@company.com', fullName: 'Recruiter User' } as any,
      isAuthenticated: true,
      hasRole: () => true,
      hasAnyRole: () => true,
      hasPermission: () => true,
      hasAnyPermission: () => true,
    } as any);
  });

  it('Nút mắt xem mở modal chi tiết chỉ xem không thể chỉnh sửa giống bên yêu cầu tuyển dụng', async () => {
    const mockPostings = [
      {
        id: 201,
        postingCode: 'JP-20261013-0001',
        requisitionId: 100,
        requisitionCode: 'REQ-2026-0001',
        title: 'Tuyển dụng Kỹ sư Java Backend',
        jobDescription: 'Lập trình backend bằng Java Spring Boot',
        candidateRequirements: '2 năm kinh nghiệm Spring Boot',
        benefits: 'Thưởng tháng 13',
        workLocation: 'Hà Nội',
        workingModel: 'HYBRID' as const,
        applicationDeadline: '2026-11-30',
        showSalary: true,
        salaryType: 'RANGE' as const,
        salaryMin: 20000000,
        salaryMax: 35000000,
        currency: 'VND',
        status: 'DRAFT' as const,
        createdByUserId: 1,
        createdByName: 'Nguyễn Văn A',
        createdAt: '2026-10-13T08:00:00Z',
        updatedAt: '2026-10-13T08:00:00Z',
      },
    ];

    vi.mocked(jobPostingApi.list).mockResolvedValue({
      content: mockPostings,
      totalElements: 1,
      totalPages: 1,
      size: 50,
      number: 0,
    } as any);

    render(
      <MemoryRouter>
        <JobPostingManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('JP-20261013-0001')).toBeInTheDocument();
    });

    // Bấm nút Xem chi tiết (Eye icon)
    const viewDetailBtn = screen.getByTitle('Xem chi tiết');
    expect(viewDetailBtn).toBeInTheDocument();
    fireEvent.click(viewDetailBtn);

    // Mở modal chi tiết giống bên yêu cầu tuyển dụng (read-only)
    await waitFor(() => {
      expect(screen.getByText('Chi tiết Tin tuyển dụng: JP-20261013-0001')).toBeInTheDocument();
    });

    expect(screen.getByText('Lập trình backend bằng Java Spring Boot')).toBeInTheDocument();
    expect(screen.getByText('2 năm kinh nghiệm Spring Boot')).toBeInTheDocument();
    expect(screen.getByText('Thưởng tháng 13')).toBeInTheDocument();

    // Bấm nút Đóng để tắt modal
    const closeBtn = screen.getByRole('button', { name: 'Đóng' });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Chi tiết Tin tuyển dụng: JP-20261013-0001')).not.toBeInTheDocument();
    });
  });
});
