import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HeadcountBudgetPage from '../pages/HeadcountBudgetPage';
import organizationApi from '../api/organization';

const { mockBudgetService } = vi.hoisted(() => {
  const mock = {
    getBudgetStats: vi.fn(),
    searchBudgets: vi.fn(),
    getBudgetById: vi.fn(),
    createBudget: vi.fn(),
    updateBudget: vi.fn(),
    deleteBudget: vi.fn(),
    evaluateBudget: vi.fn(),
    getBudgetAuditLogs: vi.fn(),
    overrideApproveRequisition: vi.fn(),
  };
  return { mockBudgetService: mock };
});

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'hrmanager@example.com', fullName: 'HR Manager' },
    hasRole: (role: string) => role === 'HR_MANAGER' || role === 'ADMIN',
    hasAnyRole: (roles: string[]) => roles.includes('HR_MANAGER') || roles.includes('ADMIN'),
    hasPermission: () => true,
  }),
}));

vi.mock('../api/budget', () => ({
  default: mockBudgetService,
  budgetApi: mockBudgetService,
}));

vi.mock('../api/organization', () => ({
  default: {
    getDepartments: vi.fn(),
  },
}));

const mockDepartments = [
  { id: 1, name: 'Phòng Công nghệ thông tin', code: 'IT', active: true },
  { id: 2, name: 'Phòng Kinh doanh', code: 'SALES', active: true },
];

const mockStats = {
  year: 2026,
  activeBudgetsCount: 2,
  totalHeadcountQuota: 25,
  totalHeadcountUsed: 10,
  totalHeadcountRemaining: 15,
  overallHeadcountUtilizationRate: 40,
  totalSalaryBudgetVnd: 3000000000,
  totalSalaryBudgetUsedVnd: 1200000000,
  totalSalaryBudgetRemainingVnd: 1800000000,
  overallSalaryUtilizationRate: 40,
};

const mockBudgets = [
  {
    id: 101,
    departmentId: 1,
    departmentName: 'Phòng Công nghệ thông tin',
    departmentCode: 'IT',
    year: 2026,
    headcountQuota: 15,
    headcountUsed: 5,
    headcountRemaining: 10,
    headcountUtilizationRate: 33.3,
    salaryBudgetVnd: 1800000000,
    salaryBudgetUsedVnd: 600000000,
    salaryBudgetRemainingVnd: 1200000000,
    salaryUtilizationRate: 33.3,
    status: 'NORMAL' as const,
    note: 'Ngân sách IT 2026',
    createdBy: 1,
    createdByName: 'HR Manager',
    updatedBy: 1,
    updatedByName: 'HR Manager',
    version: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const mockAuditLogs = [
  {
    id: 1,
    action: 'BUDGET_CREATED' as const,
    departmentId: 1,
    departmentName: 'Phòng Công nghệ thông tin',
    year: 2026,
    userId: 1,
    userEmail: 'hrmanager@example.com',
    userFullName: 'HR Manager',
    reason: 'Khai báo kế hoạch năm',
    detail: 'Khởi tạo chỉ tiêu 15 headcount',
    createdAt: '2026-01-01T10:00:00Z',
  },
];

describe('HeadcountBudgetPage (S3-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(organizationApi.getDepartments).mockResolvedValue(mockDepartments as any);
    mockBudgetService.getBudgetStats.mockResolvedValue(mockStats);
    mockBudgetService.searchBudgets.mockResolvedValue({
      content: mockBudgets,
      totalElements: 1,
      totalPages: 1,
      size: 10,
      number: 0,
      first: true,
      last: true,
      empty: false,
    });
    mockBudgetService.getBudgetAuditLogs.mockResolvedValue({
      content: mockAuditLogs,
      totalElements: 1,
      totalPages: 1,
      size: 15,
      number: 0,
      first: true,
      last: true,
      empty: false,
    });
  });

  it('renders 4 KPI summary cards with live data', async () => {
    render(
      <MemoryRouter>
        <HeadcountBudgetPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Quản lý Ngân sách Headcount')).toBeInTheDocument();
      expect(screen.getByText('Tổng chỉ tiêu Headcount')).toBeInTheDocument();
      expect(screen.getByText('Headcount đã sử dụng')).toBeInTheDocument();
      expect(screen.getByText('Headcount còn lại')).toBeInTheDocument();
      expect(screen.getByText('Ngân sách lương còn lại')).toBeInTheDocument();
    });

    // Stats values
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getAllByText('10').length).toBeGreaterThan(0);
    expect(screen.getAllByText('15').length).toBeGreaterThan(0);
  });

  it('renders budget table with correct status and department information', async () => {
    render(
      <MemoryRouter>
        <HeadcountBudgetPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Phòng Công nghệ thông tin').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Bình thường').length).toBeGreaterThan(0);
      expect(screen.getByText('5 / 15 người')).toBeInTheDocument();
    });
  });

  it('opens Create Budget modal and submits request', async () => {
    mockBudgetService.createBudget.mockResolvedValue({
      ...mockBudgets[0],
      id: 102,
      departmentId: 1,
      departmentName: 'Phòng Công nghệ thông tin',
    });

    render(
      <MemoryRouter>
        <HeadcountBudgetPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Khai báo ngân sách')).toBeInTheDocument();
      expect(screen.getAllByText('Phòng Công nghệ thông tin').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByText('Khai báo ngân sách'));

    expect(screen.getByText('Khai báo Ngân sách Headcount Phòng ban')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Xác nhận khai báo'));

    await waitFor(() => {
      expect(mockBudgetService.createBudget).toHaveBeenCalled();
    });
  });

  it('opens Audit Logs modal and displays audit records', async () => {
    render(
      <MemoryRouter>
        <HeadcountBudgetPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nhật ký ngân sách')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Nhật ký ngân sách'));

    await waitFor(() => {
      expect(screen.getByText('Nhật ký Biến động Ngân sách & Phê duyệt Ghi đè')).toBeInTheDocument();
      expect(screen.getByText('Khai báo mới')).toBeInTheDocument();
      expect(screen.getByText('Lý do: Khai báo kế hoạch năm')).toBeInTheDocument();
    });
  });
});
