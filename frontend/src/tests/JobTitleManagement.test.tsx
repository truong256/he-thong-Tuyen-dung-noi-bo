import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import JobTitleManagementPage from '../pages/JobTitleManagementPage';
import * as useAuthHook from '../hooks/useAuth';

vi.mock('../hooks/useAuth');

describe('Job Title Management Page (Quản lý Chức danh & Vị trí - EP-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        email: 'hrmanager@ats.com',
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
    });
  });

  it('renders hero banner with title, badges, and metrics cards', async () => {
    render(
      <MemoryRouter>
        <JobTitleManagementPage />
      </MemoryRouter>
    );

    // Hero title
    expect(screen.getByText('Quản lý Chức danh & Vị trí Công việc')).toBeInTheDocument();
    expect(screen.getByText('Danh mục Tiêu chuẩn (EP-02)')).toBeInTheDocument();

    // Metrics cards
    await waitFor(() => {
      expect(screen.getByText('Tổng số chức danh chuẩn hóa')).toBeInTheDocument();
      expect(screen.getByText('Đang áp dụng thực tế')).toBeInTheDocument();
      expect(screen.getByText('Nhân sự đảm nhiệm chức danh')).toBeInTheDocument();
      expect(screen.getByText('Vị trí đang mở tuyển dụng')).toBeInTheDocument();
    });

    // Check table loaded with initial job titles
    await waitFor(() => {
      expect(screen.getAllByText(/Senior Backend Engineer/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('filters job titles by search keyword', async () => {
    render(
      <MemoryRouter>
        <JobTitleManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Senior Backend Engineer/i).length).toBeGreaterThanOrEqual(1);
    });

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm theo mã, tên chức danh hoặc phòng ban/i);
    fireEvent.change(searchInput, { target: { value: 'Frontend Intern' } });

    await waitFor(() => {
      expect(screen.getAllByText(/Frontend Intern/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText(/Senior Backend Engineer/i)).not.toBeInTheDocument();
    });
  });

  it('allows switching between Table view, Cards view, and Career Matrix view', async () => {
    render(
      <MemoryRouter>
        <JobTitleManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    // Switch to Cards View
    const cardsTabBtn = screen.getByRole('tab', { name: /Dạng thẻ/i });
    fireEvent.click(cardsTabBtn);

    await waitFor(() => {
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.getAllByText(/Senior Backend Engineer/i).length).toBeGreaterThanOrEqual(1);
    });

    // Switch to Career Matrix View
    const matrixTabBtn = screen.getByRole('tab', { name: /Lộ trình cấp bậc/i });
    fireEvent.click(matrixTabBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Ma trận Bậc chức danh \(Career Ladder & Competency Matrix\)/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Bậc 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Bậc 8/i)).toBeInTheDocument();
    });
  });

  it('opens and cancels the Add Job Title modal', async () => {
    render(
      <MemoryRouter>
        <JobTitleManagementPage />
      </MemoryRouter>
    );

    const addBtn = await screen.findByRole('button', { name: /Thêm Chức danh mới/i });
    fireEvent.click(addBtn);

    // Modal appears
    expect(screen.getByText('Thêm Chức danh Mới')).toBeInTheDocument();
    expect(screen.getByLabelText(/Tên chức danh/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mã chức danh/i)).toBeInTheDocument();

    // Cancel modal
    const cancelBtn = screen.getByRole('button', { name: /Hủy bỏ/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText('Thêm Chức danh Mới')).not.toBeInTheDocument();
    });
  });

  it('opens detail modal when clicking a job title', async () => {
    render(
      <MemoryRouter>
        <JobTitleManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Senior Backend Engineer/i).length).toBeGreaterThanOrEqual(1);
    });

    // Click on title link
    const titleLink = screen.getAllByText(/Senior Backend Engineer/i)[0];
    fireEvent.click(titleLink);

    // Detail modal opens
    await waitFor(() => {
      expect(screen.getByText('Mô tả công việc chuẩn hóa')).toBeInTheDocument();
      expect(screen.getByText('Trách nhiệm & Nhiệm vụ chính')).toBeInTheDocument();
      expect(screen.getAllByText('Dải lương tham chiếu').length).toBeGreaterThanOrEqual(2);
    });

    // Close detail modal
    const closeBtn = screen.getByRole('button', { name: /Đóng chi tiết/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Mô tả công việc chuẩn hóa')).not.toBeInTheDocument();
    });
  });

  it('warns when attempting to delete a job title with active headcount', async () => {
    render(
      <MemoryRouter>
        <JobTitleManagementPage />
      </MemoryRouter>
    );

    const deleteBtn = await screen.findByTestId('delete-btn-1');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
      expect(screen.getByText('Xác nhận Xóa Chức danh')).toBeInTheDocument();
      expect(screen.getByText(/Không thể xóa chức danh này vào lúc này/i)).toBeInTheDocument();
      expect(screen.getByText(/được phân bổ chức danh này/i)).toBeInTheDocument();
    });

    // Confirm button is disabled
    const confirmDeleteBtn = screen.getByRole('button', { name: /Xác nhận Xóa vĩnh viễn/i });
    expect(confirmDeleteBtn).toBeDisabled();
  });

  it('hides salary column and management buttons for RECRUITER', async () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: {
        id: 2,
        email: 'recruiter@ats.com',
        fullName: 'Chuyên viên Tuyển dụng',
        role: 'RECRUITER',
        roles: ['RECRUITER'],
        status: 'ACTIVE',
      },
      token: 'mock-recruiter-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasRole: (r: string) => r === 'RECRUITER',
      hasAnyRole: (roles: string[]) => roles.includes('RECRUITER'),
    });

    render(
      <MemoryRouter>
        <JobTitleManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    // Salary header must not exist
    expect(screen.queryByText('Dải lương tham chiếu')).not.toBeInTheDocument();
    expect(screen.queryByText(/Thỏa thuận/i)).not.toBeInTheDocument();
    // Add button must not exist
    expect(screen.queryByRole('button', { name: /Thêm Chức danh mới/i })).not.toBeInTheDocument();
  });

  it('hides salary column and management buttons for ADMIN without HR_MANAGER role', async () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: {
        id: 3,
        email: 'admin@ats.com',
        fullName: 'System Administrator',
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
    });

    render(
      <MemoryRouter>
        <JobTitleManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    // Salary header must not exist
    expect(screen.queryByText('Dải lương tham chiếu')).not.toBeInTheDocument();
    // Add button must not exist
    expect(screen.queryByRole('button', { name: /Thêm Chức danh mới/i })).not.toBeInTheDocument();
  });

  it('validates min salary not greater than max salary', async () => {
    render(
      <MemoryRouter>
        <JobTitleManagementPage />
      </MemoryRouter>
    );

    const addBtn = await screen.findByRole('button', { name: /Thêm Chức danh mới/i });
    fireEvent.click(addBtn);

    const titleInput = screen.getByLabelText(/Tên chức danh/i);
    const codeInput = screen.getByLabelText(/Mã chức danh/i);
    const minSalaryInput = screen.getByLabelText(/Lương tối thiểu/i);
    const maxSalaryInput = screen.getByLabelText(/Lương tối đa/i);

    fireEvent.change(titleInput, { target: { value: 'Tester' } });
    fireEvent.change(codeInput, { target: { value: 'QC-TEST-01' } });
    fireEvent.change(minSalaryInput, { target: { value: '30000000' } });
    fireEvent.change(maxSalaryInput, { target: { value: '20000000' } });

    const submitBtn = screen.getByRole('button', { name: /Tạo chức danh/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Mức lương tối thiểu không được lớn hơn mức lương tối đa.')).toBeInTheDocument();
    });
  });
});
