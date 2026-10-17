import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RequisitionManagementPage } from '../pages/RequisitionManagementPage';
import * as useAuthModule from '../hooks/useAuth';
import budgetApi from '../api/budget';
import requisitionApi from '../api/requisition';
import organizationApi from '../api/organization';
import jobTitleApi from '../api/jobTitle';

vi.mock('../hooks/useAuth');
vi.mock('../api/budget');
vi.mock('../api/requisition');
vi.mock('../api/organization');
vi.mock('../api/jobTitle');

const mockDept = { id: 10, name: 'Ban Giám Đốc (BOD)', code: 'BOD', active: true };
const mockJob = { id: 101, title: 'Giám đốc Công nghệ (CTO)', active: true, minSalary: 100000000, maxSalary: 300000000 };

const mockOverrunRequisition = {
  id: 3001,
  requisitionCode: 'REQ-202610-0003',
  title: 'Giám đốc Công nghệ (CTO)',
  departmentId: 10,
  departmentName: 'Ban Giám Đốc (BOD)',
  jobTitleId: 101,
  jobTitleName: 'Giám đốc Công nghệ (CTO)',
  quantity: 13,
  status: 'PENDING_APPROVAL',
  recruitmentType: 'NEW_HEADCOUNT',
  proposedMinSalary: 250000000,
  proposedMaxSalary: 300000000,
  salaryExplanation: 'Mức lương thỏa thuận cho vị trí BOD',
  neededDate: '2026-12-31',
  targetDate: '2026-12-31',
  budgetOverridden: false,
  headcountOverridden: false,
};

const mockEvaluationOverrun = {
  budgetExists: true,
  departmentId: 10,
  departmentName: 'Ban Giám Đốc (BOD)',
  year: 2026,
  headcountQuota: 10,
  headcountUsed: 0,
  headcountRemaining: 10,
  salaryBudgetVnd: 240000000,
  salaryBudgetUsedVnd: 0,
  salaryBudgetRemainingVnd: 240000000,
  proposedQuantity: 13,
  proposedMonthlySalaryVnd: 300000000,
  proposedAnnualizedSalaryVnd: 3900000000,
  exceedsHeadcount: true,
  excessHeadcount: 3,
  exceedsSalary: true,
  excessSalaryVnd: 3660000000,
  requiresOverride: true,
  warningMessage: 'Vượt chỉ tiêu 3 headcount và 3,660,000,000 VND ngân sách lương.',
};

describe('Budget Override UI Verification (S3-04 / SCRUM-101)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(organizationApi.getDepartments).mockResolvedValue([mockDept] as any);
    vi.mocked(jobTitleApi.getJobTitles).mockResolvedValue([mockJob] as any);
    vi.mocked(requisitionApi.list).mockResolvedValue({
      content: [mockOverrunRequisition],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
      first: true,
      last: true,
      empty: false,
    } as any);
    vi.mocked(requisitionApi.getAssignableRecruiters).mockResolvedValue([]);
    vi.mocked(requisitionApi.getAssignments).mockResolvedValue(null as any);

    vi.mocked(budgetApi.evaluateBudget).mockResolvedValue(mockEvaluationOverrun);
  });

  it('TC01-UI: HR Manager opens requisition detail and sees "Ghi đè ngân sách" button', async () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { id: 1, email: 'hr.manager@test.com', fullName: 'Trưởng phòng Nhân sự', role: 'HR_MANAGER' },
      hasPermission: () => true,
      hasAnyRole: (roles: string[]) => roles.includes('HR_MANAGER'),
      hasRole: (role: string) => role === 'HR_MANAGER',
      permissions: ['REQUISITION_READ_ALL', 'REQUISITION_APPROVE', 'ROLE_HR_MANAGER'],
      refreshUser: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <RequisitionManagementPage />
      </MemoryRouter>
    );

    // Chờ danh sách tải xong
    await waitFor(() => {
      expect(screen.getByText('REQ-202610-0003')).toBeInTheDocument();
    });

    // Mở modal chi tiết yêu cầu
    const detailBtn = screen.getByTitle('Xem chi tiết');
    fireEvent.click(detailBtn);

    // Kiểm tra widget đánh giá ngân sách hiển thị cảnh báo vượt định mức
    await waitFor(() => {
      expect(screen.getByText(/Vượt chỉ tiêu 3 headcount và 3,660,000,000 VND ngân sách lương/i)).toBeInTheDocument();
    });

    // Nút "Ghi đè ngân sách" phải xuất hiện cho HR Manager
    const overrideBtn = screen.getByRole('button', { name: /Ghi đè ngân sách/i });
    expect(overrideBtn).toBeInTheDocument();

    // Bấm nút "Ghi đè ngân sách" để mở modal ghi đè
    fireEvent.click(overrideBtn);

    // Modal ghi đè phải hiển thị đầy đủ thông tin theo yêu cầu nghiệp vụ
    expect(screen.getByText(/Ghi đè Ngân sách Tuyển dụng/i)).toBeInTheDocument();
    expect(screen.getByText(/Ban Giám Đốc \(BOD\) \(Năm ngân sách 2026\)/i)).toBeInTheDocument();
    expect(screen.getByText(/\+13 người \(Vượt 3 chỉ tiêu\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/3,660,000,000 VND/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByPlaceholderText(/Nhập lý do chi tiết ghi đè ngoại lệ/i)).toBeInTheDocument();
  });

  it('TC02-UI: Recruiter/Approver không thấy nút "Ghi đè ngân sách" trong chi tiết yêu cầu', async () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { id: 2, email: 'recruiter@test.com', fullName: 'Chuyên viên tuyển dụng', role: 'RECRUITER' },
      hasPermission: () => true,
      hasAnyRole: (roles: string[]) => roles.includes('RECRUITER'),
      hasRole: (role: string) => role === 'RECRUITER',
      permissions: ['REQUISITION_READ_ALL'],
      refreshUser: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <RequisitionManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('REQ-202610-0003')).toBeInTheDocument();
    });

    const detailBtn = screen.getByTitle('Xem chi tiết');
    fireEvent.click(detailBtn);

    await waitFor(() => {
      expect(screen.getByText(/Vượt chỉ tiêu 3 headcount/i)).toBeInTheDocument();
    });

    // Nút ghi đè ngân sách KHÔNG được hiển thị cho tài khoản không phải HR Manager
    expect(screen.queryByRole('button', { name: /Ghi đè ngân sách/i })).not.toBeInTheDocument();
  });

  it('TC03-UI: Validation bắt buộc lý do ghi đè phải từ 10 ký tự trở lên', async () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { id: 1, email: 'hr.manager@test.com', fullName: 'Trưởng phòng Nhân sự', role: 'HR_MANAGER' },
      hasPermission: () => true,
      hasAnyRole: (roles: string[]) => roles.includes('HR_MANAGER'),
      hasRole: (role: string) => role === 'HR_MANAGER',
      permissions: ['REQUISITION_READ_ALL', 'ROLE_HR_MANAGER'],
      refreshUser: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <RequisitionManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('REQ-202610-0003')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Xem chi tiết'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ghi đè ngân sách/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ghi đè ngân sách/i }));

    const confirmBtn = screen.getByRole('button', { name: /Xác nhận ghi đè/i });
    expect(confirmBtn).toBeDisabled();

    const textarea = screen.getByPlaceholderText(/Nhập lý do chi tiết ghi đè ngoại lệ/i);
    // Nhập lý do quá ngắn (< 10 ký tự)
    fireEvent.change(textarea, { target: { value: 'Lý do' } });
    expect(confirmBtn).toBeDisabled();
    expect(screen.getByText(/5 \/ 10 ký tự tối thiểu/i)).toBeInTheDocument();

    // Nhập lý do hợp lệ (>= 10 ký tự)
    fireEvent.change(textarea, { target: { value: 'Phê duyệt ngoại lệ mở rộng quy mô bộ phận BOD' } });
    expect(confirmBtn).not.toBeDisabled();
  });

  it('TC04-UI: HR Manager gửi ghi đè thành công -> Cập nhật trạng thái ngoại lệ mà không chuyển thành APPROVED', async () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { id: 1, email: 'hr.manager@test.com', fullName: 'Trưởng phòng Nhân sự', role: 'HR_MANAGER' },
      hasPermission: () => true,
      hasAnyRole: (roles: string[]) => roles.includes('HR_MANAGER'),
      hasRole: (role: string) => role === 'HR_MANAGER',
      permissions: ['REQUISITION_READ_ALL', 'ROLE_HR_MANAGER'],
      refreshUser: vi.fn(),
    } as any);

    vi.mocked(budgetApi.overrideBudget).mockResolvedValue({
      requisitionId: 3001,
      requisitionCode: 'REQ-202610-0003',
      title: 'Giám đốc Công nghệ (CTO)',
      departmentId: 10,
      departmentName: 'Ban Giám Đốc (BOD)',
      status: 'PENDING_APPROVAL',
      budgetOverridden: true,
      headcountOverridden: true,
      overrideReason: 'Đặc cách bổ sung định biên theo quyết định Hội đồng quản trị',
      overrideByUserId: 1,
      overrideByUserEmail: 'hr.manager@test.com',
      overrideByUserName: 'Trưởng phòng Nhân sự',
      overrideAt: '2026-10-17T20:00:00Z',
      excessHeadcount: 3,
      excessSalaryVnd: 3660000000,
      message: 'Ghi đè ngoại lệ ngân sách thành công.',
    });

    render(
      <MemoryRouter>
        <RequisitionManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('REQ-202610-0003')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Xem chi tiết'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ghi đè ngân sách/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ghi đè ngân sách/i }));

    const textarea = screen.getByPlaceholderText(/Nhập lý do chi tiết ghi đè ngoại lệ/i);
    fireEvent.change(textarea, { target: { value: 'Đặc cách bổ sung định biên theo quyết định Hội đồng quản trị' } });

    const confirmBtn = screen.getByRole('button', { name: /Xác nhận ghi đè/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(budgetApi.overrideBudget).toHaveBeenCalledWith(3001, {
        reason: 'Đặc cách bổ sung định biên theo quyết định Hội đồng quản trị',
      });
    });

    // Thông báo toast thành công
    await waitFor(() => {
      expect(screen.getByText(/Đã ghi đè ngân sách thành công cho yêu cầu REQ-202610-0003/i)).toBeInTheDocument();
    });
  });
});
