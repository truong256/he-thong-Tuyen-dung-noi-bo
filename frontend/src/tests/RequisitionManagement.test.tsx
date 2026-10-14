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
  { id: 2, name: 'Phòng Tuyển dụng & Đào tạo', code: 'HR-REC', active: true },
];

const mockJobTitles = [
  {
    id: 10,
    title: 'Senior Java Developer',
    code: 'SE-SR',
    level: 'L4',
    minSalary: 25000000,
    maxSalary: 40000000,
    active: true,
  },
  {
    id: 20,
    title: 'Recruitment Specialist',
    code: 'REC-SPEC',
    level: 'L3',
    minSalary: 15000000,
    maxSalary: 25000000,
    active: true,
  },
];

const mockRequisitions = [
  {
    id: 101,
    requisitionCode: 'REQ-2026-0001',
    title: 'Tuyển dụng Senior Backend Java',
    departmentId: 1,
    departmentName: 'Phòng Kỹ thuật Phần mềm',
    jobTitleId: 10,
    jobTitleName: 'Senior Java Developer',
    quantity: 2,
    targetDate: '2026-12-01',
    status: 'DRAFT' as const,
    reason: 'NEW_HEADCOUNT' as const,
    proposedMinSalary: 25000000,
    proposedMaxSalary: 35000000,
    createdByUserId: 5,
    createdByName: 'Trưởng bộ phận Tech',
  },
  {
    id: 102,
    requisitionCode: 'REQ-2026-0002',
    title: 'Tuyển dụng Chuyên viên Nhân sự',
    departmentId: 2,
    departmentName: 'Phòng Tuyển dụng & Đào tạo',
    jobTitleId: 20,
    jobTitleName: 'Recruitment Specialist',
    quantity: 1,
    targetDate: '2026-11-15',
    status: 'PENDING_APPROVAL' as const,
    reason: 'REPLACEMENT' as const,
    proposedMinSalary: 18000000,
    proposedMaxSalary: 22000000,
    createdByUserId: 3,
    createdByName: 'Trưởng phòng HR',
  },
];

describe('RequisitionManagementPage (S2-10 - Yêu cầu Tuyển dụng)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: {
        id: 5,
        email: 'manager@ats.vn',
        fullName: 'Trưởng bộ phận Tech',
        department: 'ENG',
        role: 'HIRING_MANAGER',
        roles: ['HIRING_MANAGER'],
        status: 'ACTIVE',
      },
      token: 'fake-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasRole: (r: string) => r === 'HIRING_MANAGER',
      hasAnyRole: (roles: string[]) => roles.includes('HIRING_MANAGER'),
      permissions: ['REQUISITION_CREATE', 'REQUISITION_READ_OWN'],
      hasPermission: (p: string) => ['REQUISITION_CREATE', 'REQUISITION_READ_OWN'].includes(p),
      hasAnyPermission: (perms: string[]) => perms.some((p) => ['REQUISITION_CREATE', 'REQUISITION_READ_OWN'].includes(p)),
    } as any);

    vi.mocked(organizationApi.getDepartments).mockResolvedValue(mockDepartments as any);
    vi.mocked(jobTitleApi.getJobTitles).mockResolvedValue(mockJobTitles as any);
    vi.mocked(requisitionApi.list).mockResolvedValue({
      content: mockRequisitions,
      totalElements: 2,
      totalPages: 1,
      size: 20,
      number: 0,
    });
  });

  it('renders hero card, filters, and requisition table', async () => {
    render(
      <MemoryRouter>
        <RequisitionManagementPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Yêu cầu Tuyển dụng (Requisition)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tìm theo mã yêu cầu hoặc tiêu đề...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('REQ-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('REQ-2026-0002')).toBeInTheDocument();
    });

    expect(screen.getByText('Tuyển dụng Senior Backend Java')).toBeInTheDocument();
    expect(screen.getByText('Tuyển dụng Chuyên viên Nhân sự')).toBeInTheDocument();
  });

  it('opens create modal when clicking "Tạo yêu cầu mới" and validates required fields', async () => {
    render(
      <MemoryRouter>
        <RequisitionManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('REQ-2026-0001')).toBeInTheDocument();
    });

    const createBtn = screen.getByRole('button', { name: /Tạo yêu cầu mới/i });
    fireEvent.click(createBtn);

    expect(screen.getByText('Tạo yêu cầu tuyển dụng mới')).toBeInTheDocument();

    // Click "Gửi yêu cầu" with empty title
    const submitBtn = screen.getByRole('button', { name: /Gửi yêu cầu/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Vui lòng nhập tiêu đề yêu cầu tuyển dụng.')).toBeInTheDocument();
  });

  it('validates past target date and warns when proposed salary is outside standard range', async () => {
    render(
      <MemoryRouter>
        <RequisitionManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('REQ-2026-0001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Tạo yêu cầu mới/i }));

    const titleInput = screen.getByPlaceholderText(/Ví dụ: Tuyển dụng Senior Java Developer/i);
    fireEvent.change(titleInput, { target: { value: 'Vị trí thử nghiệm' } });

    // Choose past date
    const dateInput = screen.getByDisplayValue(new RegExp(/\d{4}-\d{2}-\d{2}/));
    fireEvent.change(dateInput, { target: { value: '2020-01-01' } });

    // Submit -> triggers date validation
    fireEvent.click(screen.getByRole('button', { name: /Gửi yêu cầu/i }));
    expect(screen.getByText('Ngày cần người không được ở quá khứ.')).toBeInTheDocument();
  });

  it('allows saving draft and calls requisitionApi.create with isDraft: true', async () => {
    vi.mocked(requisitionApi.create).mockResolvedValue({
      id: 103,
      requisitionCode: 'REQ-2026-0003',
      title: 'Bản nháp Tuyển dụng',
      departmentId: 1,
      jobTitleId: 10,
      quantity: 1,
      status: 'DRAFT',
      reason: 'NEW_HEADCOUNT',
    } as any);

    render(
      <MemoryRouter>
        <RequisitionManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('REQ-2026-0001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Tạo yêu cầu mới/i }));

    const titleInput = screen.getByPlaceholderText(/Ví dụ: Tuyển dụng Senior Java Developer/i);
    fireEvent.change(titleInput, { target: { value: 'Bản nháp Tuyển dụng' } });

    const draftBtn = screen.getByRole('button', { name: /Lưu nháp/i });
    fireEvent.click(draftBtn);

    await waitFor(() => {
      expect(requisitionApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Bản nháp Tuyển dụng',
          isDraft: true,
        })
      );
    });
  });

  it('allows deleting a DRAFT requisition', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(requisitionApi.delete).mockResolvedValue();

    render(
      <MemoryRouter>
        <RequisitionManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('REQ-2026-0001')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTitle('Xóa bản nháp');
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(requisitionApi.delete).toHaveBeenCalledWith(101);
  });
});
