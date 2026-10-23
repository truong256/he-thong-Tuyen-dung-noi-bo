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

const mockApprovedReq = {
  id: 201,
  requisitionCode: 'REQ-20261018-0201',
  title: 'Senior Frontend Engineer',
  departmentId: 1,
  departmentName: 'Phòng Kỹ thuật Phần mềm',
  jobTitleId: 10,
  jobTitleName: 'Frontend Dev',
  quantity: 2,
  targetDate: '2026-11-20',
  status: 'APPROVED' as const,
  reason: 'NEW_HEADCOUNT' as const,
  proposedMinSalary: 25000000,
  proposedMaxSalary: 35000000,
  createdByUserId: 1,
  createdByName: 'HR Admin',
  createdAt: '2026-10-18T00:00:00Z',
  approvedAt: '2026-10-18T01:00:00Z',
};

const mockFilledReq = {
  id: 202,
  requisitionCode: 'REQ-20261018-0202',
  title: 'DevOps Engineer',
  departmentId: 1,
  departmentName: 'Phòng Kỹ thuật Phần mềm',
  jobTitleId: 12,
  jobTitleName: 'DevOps',
  quantity: 1,
  targetDate: '2026-11-15',
  status: 'FILLED' as const,
  reason: 'NEW_HEADCOUNT' as const,
  proposedMinSalary: 30000000,
  proposedMaxSalary: 40000000,
  createdByUserId: 1,
  createdByName: 'HR Admin',
  createdAt: '2026-10-10T00:00:00Z',
};

describe('S3-07 Requisition Lifecycle & Pipeline Warning (SCRUM-103, SCRUM-135, SCRUM-139)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: {
        id: 1,
        fullName: 'Trưởng Phòng Nhân Sự',
        email: 'hrmanager@ats.vn',
        roles: ['HR_MANAGER', 'ADMIN'],
      },
      hasRole: (role: string) => role === 'HR_MANAGER' || role === 'ADMIN',
      hasAnyRole: () => true,
      hasPermission: () => true,
    } as any);

    vi.mocked(organizationApi.getDepartments).mockResolvedValue([
      { id: 1, name: 'Phòng Kỹ thuật Phần mềm', code: 'ENG', active: true } as any,
    ]);

    vi.mocked(jobTitleApi.getJobTitles).mockResolvedValue([]);
    vi.mocked(requisitionApi.getAssignableRecruiters).mockResolvedValue([]);
    vi.mocked(requisitionApi.getAssignments).mockResolvedValue({
      requisitionId: 201,
      supportRecruiters: [],
    } as any);
  });

  it('TC01: renders FILLED status badge as "Đã tuyển đủ"', async () => {
    vi.mocked(requisitionApi.list).mockResolvedValue({
      content: [mockFilledReq],
      totalElements: 1,
      totalPages: 1,
      size: 10,
      number: 0,
    } as any);

    render(
      <MemoryRouter>
        <RequisitionManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Đã tuyển đủ')).toBeInTheDocument();
    });
  });

  it('TC02: displays pipeline warning alert when closing requisition with active candidates', async () => {
    vi.mocked(requisitionApi.list).mockResolvedValue({
      content: [mockApprovedReq],
      totalElements: 1,
      totalPages: 1,
      size: 10,
      number: 0,
    } as any);

    vi.mocked(requisitionApi.getPipelineSummary).mockResolvedValue({
      requisitionId: 201,
      totalCount: 5,
      activeCount: 3,
      countByStage: { APPLIED: 2, INTERVIEW: 1, REJECTED: 2 },
    });

    render(
      <MemoryRouter>
        <RequisitionManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('REQ-20261018-0201')).toBeInTheDocument();
    });

    // Click close button
    const closeBtn = screen.getByTitle('Đóng yêu cầu tuyển dụng (hoàn thành)');
    fireEvent.click(closeBtn);

    // Verify modal title and pipeline warning
    await waitFor(() => {
      expect(screen.getByText(/Đóng yêu cầu tuyển dụng/i)).toBeInTheDocument();
      expect(screen.getByText(/Còn 3 ứng viên đang trong pipeline/i)).toBeInTheDocument();
      expect(screen.getByText(/Vẫn tiếp tục xác nhận/i)).toBeInTheDocument();
    });

    // Verify reason dropdown has standard options (HEADCOUNT_REACHED, INTERNAL_TRANSFER, OTHER)
    expect(screen.getByRole('option', { name: 'Đã tuyển đủ số lượng' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Đã bố trí nhân sự nội bộ' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Lý do khác' })).toBeInTheDocument();
  });
});
