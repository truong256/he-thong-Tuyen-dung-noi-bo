import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfileHeader from '../components/profile/ProfileHeader';
import Header from '../layouts/Header';
import * as useAuthHook from '../hooks/useAuth';
import authApi from '../api/auth';
import { UserSummary } from '../types/auth';

vi.mock('../hooks/useAuth');
vi.mock('../api/auth');

describe('Avatar Upload & ProfileHeader / Header Integration (S2-03)', () => {
  const mockUpdateUser = vi.fn();
  const mockRefreshUser = vi.fn().mockResolvedValue(undefined);
  const mockOnOpenPasswordModal = vi.fn();

  const baseUser: UserSummary = {
    id: 10,
    email: 'recruiter@company.com',
    fullName: 'Nguyễn Văn Tuyển Dụng',
    role: 'RECRUITER',
    roles: ['RECRUITER'],
    status: 'ACTIVE',
  };

  const setupMockAuth = (userOverride?: Partial<UserSummary> | null) => {
    const user = userOverride === null ? null : { ...baseUser, ...userOverride };
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user,
      token: 'mock-token',
      isAuthenticated: !!user,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: mockRefreshUser,
      updateUser: mockUpdateUser,
      hasRole: (r: string) => r === 'RECRUITER',
      hasAnyRole: (roles: string[]) => roles.includes('RECRUITER'),
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url');
    global.URL.revokeObjectURL = vi.fn();
    setupMockAuth();
  });

  // 1. Không có avatar -> initials
  it('case 1: renders initials when user has no avatar', () => {
    render(
      <ProfileHeader
        user={baseUser}
        fullName={baseUser.fullName}
        isAccountActive={true}
        onOpenPasswordModal={mockOnOpenPasswordModal}
      />
    );

    expect(screen.getByText('N')).toBeInTheDocument();
    expect(screen.queryByAltText(baseUser.fullName)).not.toBeInTheDocument();
  });

  // 2. Có avatar -> ảnh
  it('case 2: renders avatar image when user has avatarUrl', () => {
    const userWithAvatar = {
      ...baseUser,
      avatarUrl: '/api/auth/avatar/user_10_pic.jpg',
    };
    setupMockAuth(userWithAvatar);

    render(
      <ProfileHeader
        user={userWithAvatar}
        fullName={userWithAvatar.fullName}
        isAccountActive={true}
        onOpenPasswordModal={mockOnOpenPasswordModal}
      />
    );

    const img = screen.getByAltText(userWithAvatar.fullName);
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/api/auth/avatar/user_10_pic.jpg');
  });

  // 3. Click đổi ảnh -> mở picker
  it('case 3: clicking avatar triggers file input click', () => {
    render(
      <ProfileHeader
        user={baseUser}
        fullName={baseUser.fullName}
        isAccountActive={true}
        onOpenPasswordModal={mockOnOpenPasswordModal}
      />
    );

    const fileInput = screen.getByTestId('avatar-file-input');
    const clickSpy = vi.spyOn(fileInput, 'click');

    const avatarBox = screen.getByTestId('profile-avatar-clickable');
    fireEvent.click(avatarBox);

    expect(clickSpy).toHaveBeenCalled();
  });

  // 4. JPG hợp lệ -> mở modal preview
  it('case 4: valid JPG opens preview modal', async () => {
    render(
      <ProfileHeader
        user={baseUser}
        fullName={baseUser.fullName}
        isAccountActive={true}
        onOpenPasswordModal={mockOnOpenPasswordModal}
      />
    );

    const fileInput = screen.getByTestId('avatar-file-input');
    const validJpg = new File(['fake-jpg-content'], 'avatar.jpg', { type: 'image/jpeg' });

    fireEvent.change(fileInput, { target: { files: [validJpg] } });

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Đổi ảnh đại diện')).toBeInTheDocument();
    expect(screen.getByText('avatar.jpg')).toBeInTheDocument();
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(validJpg);
  });

  // 5. PNG hợp lệ -> mở modal preview
  it('case 5: valid PNG opens preview modal', async () => {
    render(
      <ProfileHeader
        user={baseUser}
        fullName={baseUser.fullName}
        isAccountActive={true}
        onOpenPasswordModal={mockOnOpenPasswordModal}
      />
    );

    const fileInput = screen.getByTestId('avatar-file-input');
    const validPng = new File(['fake-png-content'], 'profile.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [validPng] } });

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Đổi ảnh đại diện')).toBeInTheDocument();
    expect(screen.getByText('profile.png')).toBeInTheDocument();
  });

  // 6. >2MB bị từ chối
  it('case 6: file larger than 2MB is rejected with Vietnamese message', async () => {
    render(
      <ProfileHeader
        user={baseUser}
        fullName={baseUser.fullName}
        isAccountActive={true}
        onOpenPasswordModal={mockOnOpenPasswordModal}
      />
    );

    const fileInput = screen.getByTestId('avatar-file-input');
    // 2.5 MB file
    const largeContent = new Uint8Array(2.5 * 1024 * 1024);
    const largeFile = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    expect(await screen.findByText('Ảnh đại diện không được vượt quá 2MB.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // 7. GIF / loại tệp khác bị từ chối
  it('case 7: invalid mime type (GIF/PDF) is rejected with Vietnamese message', async () => {
    render(
      <ProfileHeader
        user={baseUser}
        fullName={baseUser.fullName}
        isAccountActive={true}
        onOpenPasswordModal={mockOnOpenPasswordModal}
      />
    );

    const fileInput = screen.getByTestId('avatar-file-input');
    const gifFile = new File(['gif-data'], 'animation.gif', { type: 'image/gif' });

    fireEvent.change(fileInput, { target: { files: [gifFile] } });

    expect(await screen.findByText('Chỉ chấp nhận ảnh JPG hoặc PNG.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // 8. Preview xuất hiện đúng
  it('case 8: preview renders square / circular preview image with proper styling', async () => {
    render(
      <ProfileHeader
        user={baseUser}
        fullName={baseUser.fullName}
        isAccountActive={true}
        onOpenPasswordModal={mockOnOpenPasswordModal}
      />
    );

    const fileInput = screen.getByTestId('avatar-file-input');
    const file = new File(['preview-bytes'], 'me.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const previewImg = await screen.findByAltText('Xem trước ảnh đại diện');
    expect(previewImg).toBeInTheDocument();
    expect(previewImg).toHaveAttribute('src', 'blob:mock-preview-url');
  });

  // 9. Upload thành công
  it('case 9: successful upload updates AuthContext, shows success toast and closes modal', async () => {
    const uploadedUser: UserSummary = {
      ...baseUser,
      avatarUrl: '/api/auth/avatar/new_user_10.jpg',
      avatarThumbnailUrl: '/api/auth/avatar/new_user_10_thumb.jpg',
    };

    vi.spyOn(authApi, 'uploadAvatar').mockResolvedValueOnce({
      message: 'Tải lên ảnh đại diện thành công!',
      avatarUrl: '/api/auth/avatar/new_user_10.jpg',
      thumbnailUrl: '/api/auth/avatar/new_user_10_thumb.jpg',
      avatarThumbnailUrl: '/api/auth/avatar/new_user_10_thumb.jpg',
      user: uploadedUser,
    });

    render(
      <ProfileHeader
        user={baseUser}
        fullName={baseUser.fullName}
        isAccountActive={true}
        onOpenPasswordModal={mockOnOpenPasswordModal}
      />
    );

    const fileInput = screen.getByTestId('avatar-file-input');
    const file = new File(['bytes'], 'new.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const saveBtn = await screen.findByTestId('save-avatar-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(authApi.uploadAvatar).toHaveBeenCalledWith(file);
      expect(mockUpdateUser).toHaveBeenCalledWith(uploadedUser);
      expect(mockRefreshUser).toHaveBeenCalled();
    });

    expect(await screen.findByText('Cập nhật ảnh đại diện thành công.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // 10. Upload thất bại -> giữ modal và hiển thị lỗi tiếng Việt
  it('case 10: upload failure keeps modal open and displays error', async () => {
    vi.spyOn(authApi, 'uploadAvatar').mockRejectedValueOnce({
      response: {
        data: { message: 'Tệp tải lên không phải là ảnh hợp lệ hoặc đã bị lỗi.' },
      },
    });

    render(
      <ProfileHeader
        user={baseUser}
        fullName={baseUser.fullName}
        isAccountActive={true}
        onOpenPasswordModal={mockOnOpenPasswordModal}
      />
    );

    const fileInput = screen.getByTestId('avatar-file-input');
    const file = new File(['corrupt-bytes'], 'corrupt.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const saveBtn = await screen.findByTestId('save-avatar-btn');
    fireEvent.click(saveBtn);

    expect(await screen.findByText('Tệp tải lên không phải là ảnh hợp lệ hoặc đã bị lỗi.')).toBeInTheDocument();
    // Modal is still open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  // 11. Delete avatar
  it('case 11: delete avatar opens confirmation modal and clears avatar on success', async () => {
    const userWithAvatar = {
      ...baseUser,
      avatarUrl: '/api/auth/avatar/user_10_pic.jpg',
    };
    setupMockAuth(userWithAvatar);

    vi.spyOn(authApi, 'deleteAvatar').mockResolvedValueOnce({
      message: 'Đã xóa ảnh đại diện thành công!',
    });

    render(
      <ProfileHeader
        user={userWithAvatar}
        fullName={userWithAvatar.fullName}
        isAccountActive={true}
        onOpenPasswordModal={mockOnOpenPasswordModal}
      />
    );

    const deleteBtn = screen.getByTestId('delete-avatar-btn');
    fireEvent.click(deleteBtn);

    // Confirm dialog appears
    expect(screen.getByText('Xác nhận xóa ảnh')).toBeInTheDocument();
    const confirmBtn = screen.getByTestId('confirm-delete-avatar-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(authApi.deleteAvatar).toHaveBeenCalled();
      expect(mockUpdateUser).toHaveBeenCalledWith({
        ...userWithAvatar,
        avatarUrl: undefined,
        avatarThumbnailUrl: undefined,
      });
      expect(mockRefreshUser).toHaveBeenCalled();
    });

    expect(await screen.findByText('Đã xóa ảnh đại diện.')).toBeInTheDocument();
  });

  // 12. Header cập nhật sau upload (ưu tiên thumbnail)
  it('case 12: Header component prefers avatarThumbnailUrl when present', () => {
    const userWithThumb: UserSummary = {
      ...baseUser,
      avatarUrl: '/api/auth/avatar/full_pic.jpg',
      avatarThumbnailUrl: '/api/auth/avatar/thumb_pic.jpg',
    };
    setupMockAuth(userWithThumb);

    render(
      <MemoryRouter>
        <Header onChangePasswordClick={mockOnOpenPasswordModal} />
      </MemoryRouter>
    );

    const headerAvatar = screen.getByRole('button', { name: /Tài khoản cá nhân/i });
    const img = headerAvatar.querySelector('.user-avatar-img') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain('/api/auth/avatar/thumb_pic.jpg');
  });

  // 13. Header fallback initials khi không có avatar hoặc sau delete
  it('case 13: Header component falls back to initials when no avatar exists', () => {
    setupMockAuth(baseUser);

    render(
      <MemoryRouter>
        <Header onChangePasswordClick={mockOnOpenPasswordModal} />
      </MemoryRouter>
    );

    const headerAvatar = screen.getByRole('button', { name: /Tài khoản cá nhân/i });
    expect(headerAvatar.querySelector('.user-avatar-img')).toBeNull();
    expect(headerAvatar.querySelector('.user-avatar')?.textContent).toBe('N');
  });

  // 14. Prevent double upload
  it('case 14: save button disables during upload to prevent double click', async () => {
    let resolveUpload: (val: any) => void;
    const uploadPromise = new Promise((resolve) => {
      resolveUpload = resolve;
    });

    vi.spyOn(authApi, 'uploadAvatar').mockReturnValue(uploadPromise as any);

    render(
      <ProfileHeader
        user={baseUser}
        fullName={baseUser.fullName}
        isAccountActive={true}
        onOpenPasswordModal={mockOnOpenPasswordModal}
      />
    );

    const fileInput = screen.getByTestId('avatar-file-input');
    const file = new File(['bytes'], 'new.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const saveBtn = await screen.findByTestId('save-avatar-btn');
    fireEvent.click(saveBtn);

    expect(saveBtn).toBeDisabled();
    expect(screen.getByText('Đang tải ảnh...')).toBeInTheDocument();

    // Resolve upload
    resolveUpload!({
      message: 'OK',
      avatarUrl: '/api/auth/avatar/url.jpg',
      thumbnailUrl: '/api/auth/avatar/url_thumb.jpg',
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // 15. Broken image fallback
  it('case 15: broken image triggers onError and gracefully falls back to initials without loop', async () => {
    const userWithBrokenAvatar = {
      ...baseUser,
      avatarUrl: '/api/auth/avatar/broken.jpg',
    };
    setupMockAuth(userWithBrokenAvatar);

    render(
      <ProfileHeader
        user={userWithBrokenAvatar}
        fullName={userWithBrokenAvatar.fullName}
        isAccountActive={true}
        onOpenPasswordModal={mockOnOpenPasswordModal}
      />
    );

    const img = screen.getByAltText(userWithBrokenAvatar.fullName);
    expect(img).toBeInTheDocument();

    // Trigger image error
    fireEvent.error(img);

    // After error, image is replaced with initials
    await waitFor(() => {
      expect(screen.getByText('N')).toBeInTheDocument();
      expect(screen.queryByAltText(userWithBrokenAvatar.fullName)).not.toBeInTheDocument();
    });
  });
});
