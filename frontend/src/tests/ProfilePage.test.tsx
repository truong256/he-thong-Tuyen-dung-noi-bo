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

  it('updates name, Vietnamese phone and display title without submitting protected fields', async () => {
    vi.spyOn(authApi, 'updateProfile').mockResolvedValueOnce({
      id: 10,
      email: 'recruiter@company.com',
      fullName: 'Nguyễn Văn Đã Cập Nhật',
      department: 'Tuyển dụng & Nhân sự',
      phone: '0912345678',
      displayName: 'Chuyên viên tuyển dụng',
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
    const phoneInput = screen.getByLabelText(/Số điện thoại/i);
    const titleInput = screen.getByLabelText(/Chức danh hiển thị/i);
    const saveBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });

    // Initially save button is disabled since clean
    expect(saveBtn).toBeDisabled();

    // Modify full name
    fireEvent.change(nameInput, { target: { value: 'Nguyễn Văn Đã Cập Nhật' } });
    expect(saveBtn).not.toBeDisabled();

    fireEvent.change(phoneInput, { target: { value: '0912345678' } });
    fireEvent.change(titleInput, { target: { value: 'Chuyên viên tuyển dụng' } });
    expect(screen.getByLabelText(/^Phòng ban$/i)).toBeDisabled();

    // Submit form
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(authApi.updateProfile).toHaveBeenCalledWith({
        fullName: 'Nguyễn Văn Đã Cập Nhật',
        phone: '0912345678',
        displayName: 'Chuyên viên tuyển dụng',
      });
      expect(mockRefreshUser).toHaveBeenCalled();
    });

    expect(
      await screen.findByText('Thông tin hồ sơ cá nhân đã được cập nhật thành công!')
    ).toBeInTheDocument();
  });

  it('rejects invalid Vietnamese phone before sending the profile update', async () => {
    render(<MemoryRouter><ProfilePage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/Số điện thoại/i), { target: { value: '12345' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));
    expect(await screen.findByText('Số điện thoại không đúng định dạng Việt Nam.')).toBeInTheDocument();
    expect(authApi.updateProfile).not.toHaveBeenCalled();
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

  it('displays login email as read-only and allows user to update their recovery email', async () => {
    vi.spyOn(authApi, 'updateProfile').mockResolvedValueOnce({
      id: 10,
      email: 'recruiter@company.com',
      recoveryEmail: 'recruiter.personal@gmail.com',
      fullName: 'Nguyễn Văn Tuyển Dụng',
      department: 'Tuyển dụng & Nhân sự',
      role: 'RECRUITER',
      roles: ['RECRUITER'],
      status: 'ACTIVE',
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    const loginEmailInput = screen.getByLabelText(/Email đăng nhập/i);
    expect(loginEmailInput).toBeDisabled();
    expect(loginEmailInput).toHaveValue('recruiter@company.com');

    const recoveryEmailInput = screen.getByLabelText(/Email khôi phục/i);
    expect(recoveryEmailInput).not.toBeDisabled();

    fireEvent.change(recoveryEmailInput, { target: { value: 'recruiter.personal@gmail.com' } });
    const saveBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });
    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(authApi.updateProfile).toHaveBeenCalledWith({
        fullName: 'Nguyễn Văn Tuyển Dụng',
        department: 'Tuyển dụng & Nhân sự',
        recoveryEmail: 'recruiter.personal@gmail.com',
      });
    });
  });

  it('rejects invalid recovery email format on profile submit', async () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    const recoveryEmailInput = screen.getByLabelText(/Email khôi phục/i);
    fireEvent.change(recoveryEmailInput, { target: { value: 'invalid-email-format' } });
    const saveBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });
    fireEvent.click(saveBtn);

    expect(await screen.findByText('Email khôi phục không đúng định dạng.')).toBeInTheDocument();
    expect(authApi.updateProfile).not.toHaveBeenCalled();
  });
});
