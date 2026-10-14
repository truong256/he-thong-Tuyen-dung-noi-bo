import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrganizationManagementPage from '../pages/OrganizationManagementPage';
import * as useAuthHook from '../hooks/useAuth';

vi.mock('../hooks/useAuth');

describe('Organization Management Page (Hồ sơ tổ chức & Cơ cấu)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: {
        id: 3,
        email: 'hr_manager@ats.com',
        fullName: 'HR Manager Quản Trị',
        role: 'HR_MANAGER',
        roles: ['HR_MANAGER'],
        status: 'ACTIVE',
      },
      token: 'mock-hr-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasRole: (r: string) => r === 'HR_MANAGER',
      hasAnyRole: (roles: string[]) => roles.includes('HR_MANAGER'),
      permissions: ['DEPARTMENT_MANAGE', 'USER_READ'],
      hasPermission: (p: string) => ['DEPARTMENT_MANAGE', 'USER_READ'].includes(p),
      hasAnyPermission: (perms: string[]) => perms.some((p) => ['DEPARTMENT_MANAGE', 'USER_READ'].includes(p)),
    });
  });

  it('renders hero card with company name, tax code, and metrics cards', async () => {
    render(
      <MemoryRouter>
        <OrganizationManagementPage />
      </MemoryRouter>
    );

    // Verify company name from initial profile
    await waitFor(() => {
      expect(
        screen.getByText('Công ty Cổ phần Công nghệ & Giải pháp Tuyển dụng ATS Việt Nam')
      ).toBeInTheDocument();
    });

    expect(screen.getAllByText('0109887766').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Đã xác thực pháp lý')).toBeInTheDocument();

    // Verify key metrics labels
    expect(screen.getByText('Tổng số phòng ban / đơn vị')).toBeInTheDocument();
    expect(screen.getByText('Tổng nhân sự trực thuộc')).toBeInTheDocument();
    expect(screen.getAllByText('Chi nhánh & Địa điểm').length).toBeGreaterThanOrEqual(1);
  });

  it('allows switching between tabs (Overview, Departments, Locations, Branding)', async () => {
    render(
      <MemoryRouter>
        <OrganizationManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
    });

    // Switch to Departments Tab
    const deptTabBtn = screen.getByRole('button', { name: /Cơ cấu tổ chức & Phòng ban/i });
    fireEvent.click(deptTabBtn);
    expect(screen.getByTestId('tab-departments')).toBeInTheDocument();

    // Switch to Locations Tab
    const locTabBtn = screen.getByRole('button', { name: /Chi nhánh & Địa điểm/i });
    fireEvent.click(locTabBtn);
    expect(screen.getByTestId('tab-locations')).toBeInTheDocument();

    // Switch to Branding & Policies Tab
    const brandTabBtn = screen.getByRole('button', { name: /Chính sách & Đãi ngộ/i });
    fireEvent.click(brandTabBtn);
    expect(screen.getByTestId('tab-branding')).toBeInTheDocument();
  });

  it('toggles department view between Org Chart and Table view', async () => {
    render(
      <MemoryRouter>
        <OrganizationManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
    });

    const deptTabBtn = screen.getByRole('button', { name: /Cơ cấu tổ chức & Phòng ban/i });
    fireEvent.click(deptTabBtn);

    // Initial view is Org Chart
    await waitFor(() => {
      expect(screen.getByTestId('org-chart-visualizer')).toBeInTheDocument();
    });

    // Toggle to Table view
    const tableToggleBtn = screen.getByRole('button', { name: /Danh sách bảng/i });
    fireEvent.click(tableToggleBtn);

    expect(screen.getByTestId('dept-table-view')).toBeInTheDocument();
    expect(screen.getByText('Phòng Phát triển Phần mềm Backend')).toBeInTheDocument();
  });

  it('filters departments by search keyword in Table view', async () => {
    render(
      <MemoryRouter>
        <OrganizationManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
    });

    const deptTabBtn = screen.getByRole('button', { name: /Cơ cấu tổ chức & Phòng ban/i });
    fireEvent.click(deptTabBtn);

    const tableToggleBtn = screen.getByRole('button', { name: /Danh sách bảng/i });
    fireEvent.click(tableToggleBtn);

    await waitFor(() => {
      expect(screen.getByTestId('dept-table-view')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText('Tìm kiếm phòng ban');
    fireEvent.change(searchInput, { target: { value: 'Frontend' } });

    expect(screen.getByText('Phòng Phát triển Giao diện Frontend')).toBeInTheDocument();
    expect(screen.queryByText('Phòng Phát triển Phần mềm Backend')).not.toBeInTheDocument();
  });

  it('opens and cancels Department Modal when adding a new department', async () => {
    render(
      <MemoryRouter>
        <OrganizationManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
    });

    const deptTabBtn = screen.getByRole('button', { name: /Cơ cấu tổ chức & Phòng ban/i });
    fireEvent.click(deptTabBtn);

    const addBtn = screen.getByRole('button', { name: /Thêm phòng ban mới/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByTestId('department-modal')).toBeInTheDocument();
    });

    expect(screen.getByText('Thêm mới Phòng ban / Đơn vị')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /Hủy bỏ/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('department-modal')).not.toBeInTheDocument();
    });
  });

  it('opens and closes Location Modal for branch offices', async () => {
    render(
      <MemoryRouter>
        <OrganizationManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
    });

    const locTabBtn = screen.getByRole('button', { name: /Chi nhánh & Địa điểm/i });
    fireEvent.click(locTabBtn);

    await waitFor(() => {
      expect(screen.getByTestId('tab-locations')).toBeInTheDocument();
    });

    const addLocBtn = screen.getByRole('button', { name: /Thêm địa điểm mới/i });
    fireEvent.click(addLocBtn);

    await waitFor(() => {
      expect(screen.getByTestId('location-modal')).toBeInTheDocument();
    });

    expect(screen.getByText('Thêm mới Địa điểm & Chi nhánh')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /Hủy bỏ/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('location-modal')).not.toBeInTheDocument();
    });
  });

  it('restricts edit buttons when user is CANDIDATE or unauthorized', async () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: {
        id: 2,
        email: 'candidate@ats.com',
        fullName: 'Ứng Viên',
        role: 'CANDIDATE',
        roles: ['CANDIDATE'],
        status: 'ACTIVE',
      },
      token: 'mock-cand-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasRole: (r: string) => r === 'CANDIDATE',
      hasAnyRole: () => false,
      permissions: [],
      hasPermission: () => false,
      hasAnyPermission: () => false,
    });

    render(
      <MemoryRouter>
        <OrganizationManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
    });

    // Edit profile button should not be rendered for CANDIDATE
    expect(screen.queryByRole('button', { name: /Chỉnh sửa hồ sơ/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Dữ liệu mẫu/i })).not.toBeInTheDocument();
  });

  it('restricts department mutation buttons for ADMIN when ADMIN lacks DEPARTMENT_MANAGE', async () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        email: 'admin@ats.com',
        fullName: 'Quản Trị Viên',
        role: 'ADMIN',
        roles: ['ADMIN'],
        status: 'ACTIVE',
      },
      token: 'mock-admin-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasRole: (r: string) => r === 'ADMIN',
      hasAnyRole: (roles: string[]) => roles.includes('ADMIN'),
      permissions: ['USER_MANAGE', 'ROLE_MANAGE'],
      hasPermission: (p: string) => ['USER_MANAGE', 'ROLE_MANAGE'].includes(p),
      hasAnyPermission: (perms: string[]) => perms.some((p) => ['USER_MANAGE', 'ROLE_MANAGE'].includes(p)),
    });

    render(
      <MemoryRouter>
        <OrganizationManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
    });

    const deptTabBtn = screen.getByRole('button', { name: /Cơ cấu tổ chức & Phòng ban/i });
    fireEvent.click(deptTabBtn);

    // ADMIN without DEPARTMENT_MANAGE must not see the Add Department button
    expect(screen.queryByRole('button', { name: /Thêm phòng ban mới/i })).not.toBeInTheDocument();
  });
});
