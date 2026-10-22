import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RequisitionManagementPage from '../pages/RequisitionManagementPage';
import requisitionApi from '../api/requisition';
import organizationApi from '../api/organization';
import jobTitleApi from '../api/jobTitle';
import * as useAuthModule from '../hooks/useAuth';

vi.mock('../api/requisition');
vi.mock('../api/organization');
vi.mock('../api/jobTitle');
vi.mock('../hooks/useAuth');

const mockDepartments = [
  { id: 1, name: 'Phòng Kỹ thuật Phần mềm', code: 'ENG', active: true },
  { id: 2, name: 'Ban Giám Đốc', code: 'BOD', active: true },
];

const mockRecruiters = [
  { id: 10, fullName: 'Nguyễn Văn Tuyển', email: 'rec1@ats.vn', role: 'RECRUITER' },
  { id: 11, fullName: 'Trần Thị Dụng', email: 'rec2@ats.vn', role: 'RECRUITER' },
];

const mockDraftRequisition = {
  id: 101,
  requisitionCode: 'REQ-20261018-9392',
  title: 'Kỹ sư Cầu nối BrSE',
  departmentId: 1,
  departmentName: 'Phòng Kỹ thuật Phần mềm',
  jobTitleId: 10,
  jobTitleName: 'Senior Java Developer',
  quantity: 2,
  targetDate: '2026-11-16',
  status: 'DRAFT' as const,
  reason: 'NEW_HEADCOUNT' as const,
  proposedMinSalary: 25000000,
  proposedMaxSalary: 35000000,
  createdByUserId: 5,
  createdByName: 'Trưởng bộ phận Tech',
  createdAt: '2026-10-18T00:00:00Z',
};

const mockOverdueRequisition = {
  id: 102,
  requisitionCode: 'REQ-20260901-0002',
  title: 'Chuyên viên Tuyển dụng',
  departmentId: 2,
  departmentName: 'Ban Giám Đốc',
  jobTitleId: 20,
  jobTitleName: 'Recruiter',
  quantity: 1,
  targetDate: '2026-10-13',
  status: 'APPROVED' as const,
  reason: 'REPLACEMENT' as const,
  proposedMinSalary: 18000000,
  proposedMaxSalary: 22000000,
  createdByUserId: 3,
  createdByName: 'Trưởng phòng HR',
  createdAt: '2026-09-01T00:00:00Z',
  approvedAt: '2026-09-02T00:00:00Z',
};

describe('RequisitionPaginationAndSla (SCRUM-107 / S3-08)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: {
        id: 1,
        email: 'admin@ats.vn',
        fullName: 'Quản trị viên',
        department: 'BOD',
        role: 'ADMIN',
        roles: ['ADMIN'],
        status: 'ACTIVE',
      },
      token: 'fake-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasRole: () => true,
      hasAnyRole: () => true,
      permissions: ['REQUISITION_READ', 'REQUISITION_CREATE', 'REQUISITION_APPROVE', 'REQUISITION_ASSIGN'],
      hasPermission: () => true,
      hasAnyPermission: () => true,
    } as any);

    vi.mocked(organizationApi.getDepartments).mockResolvedValue(mockDepartments as any);
    vi.mocked(jobTitleApi.getJobTitles).mockResolvedValue([] as any);
    vi.mocked(requisitionApi.getAssignableRecruiters).mockResolvedValue(mockRecruiters as any);
    vi.mocked(requisitionApi.getAssignments).mockResolvedValue({
      requisitionId: 101,
      requisitionCode: 'REQ-20261018-9392',
      requisitionTitle: 'Kỹ sư Cầu nối BrSE',
      supportRecruiters: [],
      hiringManagers: [],
    });
  });

  it('TC04: DRAFT requisition does not show "Đã kết thúc", shows "Chưa mở" and remaining days', async () => {
    vi.mocked(requisitionApi.list).mockResolvedValue({
      content: [mockDraftRequisition],
      totalElements: 1,
      totalPages: 1,
      size: 10,
      number: 0,
    });

    render(
      <MemoryRouter initialEntries={['/requisitions']}>
        <RequisitionManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('REQ-20261018-9392')).toBeInTheDocument();
    });

    // Should NOT show 'Đã kết thúc'
    expect(screen.queryByText('Đã kết thúc')).not.toBeInTheDocument();
    // Should show 'Chưa mở' for days open badge
    expect(screen.getByText('Chưa mở')).toBeInTheDocument();
    // Should display target date and remaining days
    expect(screen.getByText('2026-11-16')).toBeInTheDocument();
  });

  it('TC06 & TC07: 56 items with size 10 renders 6 pages and navigates to page 2', async () => {
    vi.mocked(requisitionApi.list).mockResolvedValue({
      content: [mockDraftRequisition],
      totalElements: 56,
      totalPages: 6,
      size: 10,
      number: 0,
    });

    render(
      <MemoryRouter initialEntries={['/requisitions']}>
        <RequisitionManagementPage />
      </MemoryRouter>
    );

    const page2Btn = await screen.findByRole('button', { name: /Trang 2/i });
    expect(page2Btn).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, el) =>
          el?.tagName.toLowerCase() === 'span' &&
          (el?.textContent?.includes('Hiển thị 1 - 10 trong tổng số 56 yêu cầu') ?? false)
      )
    ).toBeInTheDocument();

    // Click page 2 button
    fireEvent.click(page2Btn);

    await waitFor(() => {
      expect(requisitionApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1, // 0-indexed backend page
          size: 10,
        })
      );
    });
  });

  it('TC08: Changing page preserves existing filters', async () => {
    vi.mocked(requisitionApi.list).mockResolvedValue({
      content: [mockDraftRequisition],
      totalElements: 35,
      totalPages: 4,
      size: 10,
      number: 0,
    });

    render(
      <MemoryRouter initialEntries={['/requisitions?status=DRAFT&dept=1']}>
        <RequisitionManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(requisitionApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'DRAFT',
          departmentId: 1,
          page: 0,
          size: 10,
        })
      );
    });

    const page2Btn = await screen.findByRole('button', { name: /Trang 2/i });
    fireEvent.click(page2Btn);

    await waitFor(() => {
      expect(requisitionApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'DRAFT',
          departmentId: 1,
          page: 1,
          size: 10,
        })
      );
    });
  });

  it('TC09: Multi-condition filtering combines status, department, recruiter, sla, and date range', async () => {
    vi.mocked(requisitionApi.list).mockResolvedValue({
      content: [mockOverdueRequisition],
      totalElements: 1,
      totalPages: 1,
      size: 10,
      number: 0,
    });

    render(
      <MemoryRouter initialEntries={['/requisitions']}>
        <RequisitionManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Yêu cầu Tuyển dụng (Requisition)')).toBeInTheDocument();
    });

    // Change status to APPROVED
    const statusSelect = screen.getByDisplayValue('Tất cả trạng thái');
    fireEvent.change(statusSelect, { target: { value: 'APPROVED' } });

    // Change department to Ban Giám Đốc (id: 2)
    const deptSelect = screen.getByDisplayValue('Tất cả phòng ban');
    fireEvent.change(deptSelect, { target: { value: '2' } });

    // Change recruiter to rec1 (id: 10)
    const recruiterSelect = screen.getByDisplayValue('Tất cả Recruiter phụ trách');
    fireEvent.change(recruiterSelect, { target: { value: '10' } });

    // Change SLA to OVERDUE
    const slaSelect = screen.getByDisplayValue('Tất cả hạn SLA');
    fireEvent.change(slaSelect, { target: { value: 'OVERDUE' } });

    // Enter date range
    const fromDateInput = screen.getByLabelText('Từ ngày tạo');
    fireEvent.change(fromDateInput, { target: { value: '2026-09-01' } });

    const toDateInput = screen.getByLabelText('Đến ngày tạo');
    fireEvent.change(toDateInput, { target: { value: '2026-09-30' } });

    await waitFor(() => {
      expect(requisitionApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'APPROVED',
          departmentId: 2,
          recruiterId: 10,
          sla: 'OVERDUE',
          fromDate: '2026-09-01',
          toDate: '2026-09-30',
          page: 0,
          size: 10,
        })
      );
    });
  });

  it('TC10: Modifying any filter while on page 3 resets back to page 1', async () => {
    vi.mocked(requisitionApi.list).mockResolvedValue({
      content: [mockDraftRequisition],
      totalElements: 50,
      totalPages: 5,
      size: 10,
      number: 2, // on page 3
    });

    render(
      <MemoryRouter initialEntries={['/requisitions?page=3&size=10']}>
        <RequisitionManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(requisitionApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
        })
      );
    });

    // User changes SLA filter
    const slaSelect = screen.getByDisplayValue('Tất cả hạn SLA');
    fireEvent.change(slaSelect, { target: { value: 'OVERDUE' } });

    await waitFor(() => {
      expect(requisitionApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          sla: 'OVERDUE',
          page: 0, // reset to page 1 (0-indexed)
        })
      );
    });
  });

  it('Date range validation: fromDate > toDate displays banner error and prevents invalid API call', async () => {
    vi.mocked(requisitionApi.list).mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 10,
      number: 0,
    });

    render(
      <MemoryRouter initialEntries={['/requisitions']}>
        <RequisitionManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(requisitionApi.list).toHaveBeenCalledTimes(1);
    });

    const fromDateInput = screen.getByLabelText('Từ ngày tạo');
    fireEvent.change(fromDateInput, { target: { value: '2026-10-20' } });

    const toDateInput = screen.getByLabelText('Đến ngày tạo');
    fireEvent.change(toDateInput, { target: { value: '2026-10-10' } });

    // Should display validation error banner
    await waitFor(() => {
      expect(screen.getByText('Ngày bắt đầu không được lớn hơn ngày kết thúc.')).toBeInTheDocument();
    });

    // Should not call API with invalid inverted dates
    expect(requisitionApi.list).not.toHaveBeenCalledWith(
      expect.objectContaining({
        fromDate: '2026-10-20',
        toDate: '2026-10-10',
      })
    );
  });
});
