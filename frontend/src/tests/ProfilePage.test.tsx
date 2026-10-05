import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from '../pages/ProfilePage';
import * as useAuthHook from '../hooks/useAuth';
import authApi from '../api/auth';

vi.mock('../hooks/useAuth');
vi.mock('../api/auth');

describe('ProfilePage Component (Personal User Profile)', () => {
  const mockRefreshUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: {
        id: 10,
        email: 'recruiter@company.com',
        fullName: 'Nguyễn Văn Tuyển Dụng',
        department: 'Tuyển dụng & Nhân sự',
        role: 'RECRUITER',
        roles: ['RECRUITER'],
        status: 'ACTIVE',
      },
      token: 'mock-jwt-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: mockRefreshUser,
      hasRole: (r: string) => r === 'RECRUITER',
      hasAnyRole: (roles: string[]) => roles.includes('RECRUITER'),
    });
  });

  it('renders user details in header banner', () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('profile-page')).toBeInTheDocument();
    expect(screen.getAllByText('Nguyễn Văn Tuyển Dụng')[0]).toBeInTheDocument();
    expect(screen.getByText('recruiter@company.com')).toBeInTheDocument();
    expect(screen.getByText('Mã tài khoản: #10')).toBeInTheDocument();
    expect(screen.getByText('Đang hoạt động')).toBeInTheDocument();
  });

  it('allows editing full name and department, then submits updateProfile', async () => {
    vi.spyOn(authApi, 'updateProfile').mockResolvedValueOnce({
      id: 10,
      email: 'recruiter@company.com',
      fullName: 'Nguyễn Văn Đã Cập Nhật',
      department: 'Kỹ thuật & Công nghệ',
      role: 'RECRUITER',
      roles: ['RECRUITER'],
      status: 'ACTIVE',
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    const nameInput = screen.getByLabelText(/Họ và tên/i);
    const deptInput = screen.getByLabelText(/Phòng ban/i);
    const saveBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });

    // Initially save button is disabled since clean
    expect(saveBtn).toBeDisabled();

    // Modify full name
    fireEvent.change(nameInput, { target: { value: 'Nguyễn Văn Đã Cập Nhật' } });
    expect(saveBtn).not.toBeDisabled();

    // Select preset chip
    const techChip = screen.getByRole('button', { name: 'Kỹ thuật & Công nghệ' });
    fireEvent.click(techChip);
    expect(deptInput).toHaveValue('Kỹ thuật & Công nghệ');

    // Submit form
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(authApi.updateProfile).toHaveBeenCalledWith({
        fullName: 'Nguyễn Văn Đã Cập Nhật',
        department: 'Kỹ thuật & Công nghệ',
      });
      expect(mockRefreshUser).toHaveBeenCalled();
    });

    expect(
      await screen.findByText('Thông tin hồ sơ cá nhân đã được cập nhật thành công!')
    ).toBeInTheDocument();
  });

  it('shows client-side validation error if full name is too short', async () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    const nameInput = screen.getByLabelText(/Họ và tên/i);
    const saveBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });

    fireEvent.change(nameInput, { target: { value: 'A' } });
    fireEvent.click(saveBtn);

    expect(await screen.findByText('Họ và tên phải có tối thiểu 2 ký tự.')).toBeInTheDocument();
    expect(authApi.updateProfile).not.toHaveBeenCalled();
  });

  it('can switch tabs to RBAC and view role permissions breakdown', () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    const rbacTabBtn = screen.getByRole('button', { name: /Vai trò & Quyền hạn/i });
    fireEvent.click(rbacTabBtn);

    expect(
      screen.getByText('Phân quyền vai trò RBAC (Role-Based Access Control)')
    ).toBeInTheDocument();
    expect(screen.getByText('Tiếp nhận & Quản lý Pipeline ứng viên')).toBeInTheDocument();
    expect(screen.getByText('Phạm vi chức năng')).toBeInTheDocument();
  });

  it('can switch tabs to Security and view token & password policies', () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    const secTabBtn = screen.getByRole('button', { name: /Bảo mật & Phiên làm việc/i });
    fireEvent.click(secTabBtn);

    expect(screen.getByText('Bảo mật tài khoản & Phiên làm việc')).toBeInTheDocument();
    expect(screen.getByText('Mật khẩu tài khoản')).toBeInTheDocument();
    expect(screen.getByText('Phiên đăng nhập & Token')).toBeInTheDocument();
    expect(screen.getByText('Khóa tự động chống brute-force:')).toBeInTheDocument();
  });

  it('opens ChangePasswordModal when clicking change password button', () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    const changePwdBtns = screen.getAllByRole('button', { name: /Đổi mật khẩu/i });
    fireEvent.click(changePwdBtns[0]);

    // Modal opens
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/Mật khẩu hiện tại/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Mật khẩu mới/i)).toBeInTheDocument();
  });
});
