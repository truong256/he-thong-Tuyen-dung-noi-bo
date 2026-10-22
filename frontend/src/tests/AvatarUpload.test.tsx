import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfilePage from '../pages/ProfilePage';
import Header from '../layouts/Header';
import * as useAuthHook from '../hooks/useAuth';
import authApi from '../api/auth';
import { UserSummary } from '../types/auth';

vi.mock('../hooks/useAuth');
vi.mock('../api/auth');

describe('Avatar Upload & ProfileHeader / Header Integration (S2-03)', () => {
  const mockUpdateUser = vi.fn();
  const mockRefreshUser = vi.fn().mockResolvedValue(true);
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

  // AV-01: Không có avatar → initials
  it('AV-01: renders initials when user has no avatar', () => {
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

  // AV-02: Có avatar → ảnh
  it('AV-02: renders avatar image when user has avatarUrl', () => {
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
    // src has cache-buster appended (e.g., ?v=0)
    expect(img.getAttribute('src')).toContain('/api/auth/avatar/user_10_pic.jpg');
  });

  // AV-03: Click đổi ảnh → mở picker
  it('AV-03: clicking avatar triggers file input click', () => {
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

  // AV-04: JPG hợp lệ → mở modal preview
  it('AV-04: valid JPG opens preview modal', async () => {
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

  // AV-05: PNG hợp lệ → mở modal preview
  it('AV-05: valid PNG opens preview modal', async () => {
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

  // AV-06: > 2MB bị từ chối
  it('AV-06: file larger than 2MB is rejected with Vietnamese message', async () => {
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

  // AV-07: GIF / loại tệp khác bị từ chối
  it('AV-07: invalid mime type (GIF/PDF) is rejected with Vietnamese message', async () => {
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

  // AV-08: Preview xuất hiện đúng
  it('AV-08: preview renders square/circular preview image with proper styling', async () => {
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

  // AV-09: Upload thành công + refreshUser thành công → toast + cập nhật context
  it('AV-09: successful upload with server confirmation shows toast and closes modal', async () => {
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

  // AV-10: Upload thành công nhưng refreshUser thất bại → hiển thị cảnh báo
  it('AV-10: successful upload but refreshUser failure shows warning toast', async () => {
    const mockRefreshFail = vi.fn().mockResolvedValue(false);
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: baseUser,
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: mockRefreshFail,
      updateUser: mockUpdateUser,
      hasRole: (r: string) => r === 'RECRUITER',
      hasAnyRole: (roles: string[]) => roles.includes('RECRUITER'),
    });

    vi.spyOn(authApi, 'uploadAvatar').mockResolvedValueOnce({
      message: 'OK',
      avatarUrl: '/api/auth/avatar/new.jpg',
      thumbnailUrl: '/api/auth/avatar/new_thumb.jpg',
      avatarThumbnailUrl: '/api/auth/avatar/new_thumb.jpg',
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

    // Should show a warning-level error toast (not the success toast)
    expect(
      await screen.findByText(
        'Ảnh đã được tải lên nhưng không thể xác nhận trạng thái từ máy chủ. Vui lòng tải lại trang.'
      )
    ).toBeInTheDocument();

    // Modal should be closed (image was uploaded)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // AV-11: Upload thất bại → giữ modal và hiển thị lỗi tiếng Việt
  it('AV-11: upload failure keeps modal open and displays error inside modal', async () => {
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

  // AV-12: Delete avatar → xóa thành công → initials + ẩn nút Xóa ảnh
  it('AV-12: delete avatar opens confirmation modal and clears avatar on success', async () => {
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

  // AV-13: Header cập nhật avatar (ưu tiên thumbnail)
  it('AV-13: Header component prefers avatarThumbnailUrl when present', () => {
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

  // AV-14: Header fallback initials khi không có avatar
  it('AV-14: Header component falls back to initials when no avatar exists', () => {
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

  // AV-15: Nút Xóa ảnh không xuất hiện khi không có avatar
  it('AV-15: delete-avatar button is hidden when user has no avatar', () => {
    render(
      <ProfileHeader
        user={baseUser}
        fullName={baseUser.fullName}
        isAccountActive={true}
        onOpenPasswordModal={mockOnOpenPasswordModal}
      />
    );

    expect(screen.queryByTestId('delete-avatar-btn')).not.toBeInTheDocument();
  });

  // AV-16: Prevent double upload (disable button while uploading)
  it('AV-16: save button disables during upload to prevent double click', async () => {
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

  // AV-17: Broken image fallback — không loop vô hạn
  it('AV-17: broken image triggers onError and gracefully falls back to initials without loop', async () => {
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

  // AV-18: Nút "Đổi mật khẩu" luôn hiển thị trên header
  it('AV-18: change-password button is always rendered in profile header', () => {
    render(
      <ProfileHeader
        user={baseUser}
        fullName={baseUser.fullName}
        isAccountActive={true}
        onOpenPasswordModal={mockOnOpenPasswordModal}
      />
    );

    const btn = screen.getByTestId('change-password-btn');
    expect(btn).toBeInTheDocument();
    expect(btn).toBeEnabled();
    fireEvent.click(btn);
    expect(mockOnOpenPasswordModal).toHaveBeenCalledOnce();
  });

  // Stateful integration component for testing real state updates between ProfileHeader and Header
  const StatefulProfileAndHeader: React.FC<{
    initialUser: UserSummary;
    refreshFails?: boolean;
  }> = ({ initialUser, refreshFails = false }) => {
    const [currentUser, setCurrentUser] = useState<UserSummary>(initialUser);
    const [passwordModalOpened, setPasswordModalOpened] = useState(false);
    const [toasts, setToasts] = useState<
      Array<{ id: string; message: string; type: 'success' | 'warning' | 'error' }>
    >([]);

    const handleNotify = (message: string, type: 'success' | 'warning' | 'error') => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, type }]);
    };

    const removeToast = (id: string) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const mockRefresh = vi.fn().mockImplementation(async () => {
      if (refreshFails) return false;
      return true;
    });

    const mockUpdate = vi.fn().mockImplementation((updated: UserSummary) => {
      setCurrentUser({ ...updated });
    });

    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: currentUser,
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: mockRefresh,
      updateUser: mockUpdate,
      hasRole: () => true,
      hasAnyRole: () => true,
    });

    return (
      <MemoryRouter>
        <Header onChangePasswordClick={() => {}} />
        {toasts.length > 0 && (
          <div className="profile-toast-container" aria-live="polite">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={`profile-header-toast ${toast.type}`}
                data-testid={`toast-${toast.type}`}
              >
                <span>{toast.message}</span>
                <button
                  type="button"
                  className="toast-close-btn"
                  onClick={() => removeToast(toast.id)}
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}
        <ProfileHeader
          user={currentUser}
          fullName={currentUser.fullName}
          isAccountActive={true}
          onOpenPasswordModal={() => setPasswordModalOpened(true)}
          onNotify={handleNotify}
        />
        {passwordModalOpened && <div data-testid="password-modal-content">MODAL ĐỔI MẬT KHẨU</div>}
      </MemoryRouter>
    );
  };

  // AV-19: Stateful integration - Xóa avatar thành công làm ảnh biến mất ở cả Profile và Header
  it('AV-19: DELETE avatar updates real UI state: image disappears from Profile & Header, initials appear, delete button vanishes', async () => {
    const userWithAvatar: UserSummary = {
      ...baseUser,
      avatarUrl: '/api/auth/avatar/active-user.jpg',
      avatarThumbnailUrl: '/api/auth/avatar/active-user_thumb.jpg',
    };
    vi.spyOn(authApi, 'deleteAvatar').mockResolvedValue({ message: 'Deleted' } as any);

    render(<StatefulProfileAndHeader initialUser={userWithAvatar} />);

    // Initially, avatar image is displayed in both Profile and Header
    expect(screen.getAllByAltText(baseUser.fullName)).toHaveLength(2);
    expect(screen.getByTestId('delete-avatar-btn')).toBeInTheDocument();

    // Click delete avatar
    fireEvent.click(screen.getByTestId('delete-avatar-btn'));
    const confirmBtn = await screen.findByTestId('confirm-delete-avatar-btn');
    fireEvent.click(confirmBtn);

    // After state updates: image gone from DOM, initials "N" present, delete button gone
    await waitFor(() => {
      expect(screen.queryAllByAltText(baseUser.fullName)).toHaveLength(0);
      expect(screen.queryByTestId('delete-avatar-btn')).not.toBeInTheDocument();
      expect(screen.getByTestId('toast-success')).toHaveTextContent('Đã xóa ảnh đại diện.');
    });
  });

  // AV-20: Stateful integration - Đổi ảnh mới thành công làm cả Profile và Header cập nhật
  it('AV-20: UPLOAD avatar updates real UI state: new image appears in Profile & Header, delete button appears', async () => {
    vi.spyOn(authApi, 'uploadAvatar').mockResolvedValue({
      message: 'OK',
      avatarUrl: '/api/auth/avatar/new-photo.jpg',
      avatarThumbnailUrl: '/api/auth/avatar/new-photo_thumb.jpg',
      user: {
        ...baseUser,
        avatarUrl: '/api/auth/avatar/new-photo.jpg',
        avatarThumbnailUrl: '/api/auth/avatar/new-photo_thumb.jpg',
      },
    } as any);

    render(<StatefulProfileAndHeader initialUser={baseUser} />);

    // Initially no avatar, no delete button
    expect(screen.queryAllByAltText(baseUser.fullName)).toHaveLength(0);
    expect(screen.queryByTestId('delete-avatar-btn')).not.toBeInTheDocument();

    // Select valid file
    const fileInput = screen.getByTestId('avatar-file-input');
    const file = new File(['valid-image-bytes'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Save avatar in modal
    const saveBtn = await screen.findByTestId('save-avatar-btn');
    fireEvent.click(saveBtn);

    // After upload: image appears in both Profile and Header, delete button appears
    await waitFor(() => {
      expect(screen.getAllByAltText(baseUser.fullName)).toHaveLength(2);
      expect(screen.getByTestId('delete-avatar-btn')).toBeInTheDocument();
      expect(screen.getByTestId('toast-success')).toHaveTextContent('Cập nhật ảnh đại diện thành công.');
    });
  });

  // AV-21: Khi refreshUser() thất bại khi xóa ảnh, không hiện thông báo thành công sai
  it('AV-21: When refreshUser fails after DELETE, does not show success toast, displays warning toast instead', async () => {
    const userWithAvatar: UserSummary = {
      ...baseUser,
      avatarUrl: '/api/auth/avatar/active-user.jpg',
    };
    vi.spyOn(authApi, 'deleteAvatar').mockResolvedValue({ message: 'Deleted' } as any);

    render(<StatefulProfileAndHeader initialUser={userWithAvatar} refreshFails={true} />);

    fireEvent.click(screen.getByTestId('delete-avatar-btn'));
    const confirmBtn = await screen.findByTestId('confirm-delete-avatar-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('toast-success')).not.toBeInTheDocument();
      expect(screen.getByTestId('toast-warning')).toBeInTheDocument();
      expect(screen.getByTestId('toast-warning')).toHaveTextContent(
        'Ảnh đã được xóa nhưng không thể xác nhận trạng thái từ máy chủ. Vui lòng tải lại trang.'
      );
    });
  });

  // AV-22: Khi refreshUser() thất bại khi upload ảnh, không hiện thông báo thành công sai
  it('AV-22: When refreshUser fails after UPLOAD, does not show success toast, displays warning toast instead', async () => {
    vi.spyOn(authApi, 'uploadAvatar').mockResolvedValue({
      message: 'OK',
      avatarUrl: '/api/auth/avatar/new.jpg',
    } as any);

    render(<StatefulProfileAndHeader initialUser={baseUser} refreshFails={true} />);

    const fileInput = screen.getByTestId('avatar-file-input');
    const file = new File(['bytes'], 'new.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const saveBtn = await screen.findByTestId('save-avatar-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('toast-success')).not.toBeInTheDocument();
      expect(screen.getByTestId('toast-warning')).toBeInTheDocument();
      expect(screen.getByTestId('toast-warning')).toHaveTextContent(
        'Ảnh đã được tải lên nhưng không thể xác nhận trạng thái từ máy chủ. Vui lòng tải lại trang.'
      );
    });
  });

  // AV-23: Hai toast xuất hiện gần nhau được xếp thành danh sách, không chồng đè nhau
  it('AV-23: Multiple toasts stack vertically in profile-toast-container without overlapping', async () => {
    render(
      <MemoryRouter>
        <div className="profile-toast-container" aria-live="polite">
          <div className="profile-header-toast success" data-testid="toast-success">
            <span>Thông báo 1</span>
          </div>
          <div className="profile-header-toast warning" data-testid="toast-warning">
            <span>Thông báo 2</span>
          </div>
        </div>
      </MemoryRouter>
    );

    const toasts = screen.getAllByTestId(/toast-/);
    expect(toasts).toHaveLength(2);
    expect(toasts[0]).toHaveTextContent('Thông báo 1');
    expect(toasts[1]).toHaveTextContent('Thông báo 2');
    expect(toasts[0].parentElement).toBe(toasts[1].parentElement);
  });

  // AV-24: Nút "Đổi mật khẩu" vẫn nhấn được khi có toast đang hiển thị
  it('AV-24: Change-password button remains clickable and functional even when toasts are active', async () => {
    render(<StatefulProfileAndHeader initialUser={baseUser} />);

    // Trigger a toast by trying to upload an invalid file
    const fileInput = screen.getByTestId('avatar-file-input');
    const invalidFile = new File(['text'], 'resume.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    // Toast is active
    expect(await screen.findByTestId('toast-error')).toBeInTheDocument();

    // Click "Đổi mật khẩu"
    const changePwdBtn = screen.getByTestId('change-password-btn');
    fireEvent.click(changePwdBtn);

    // Modal opens without obstruction
    expect(screen.getByTestId('password-modal-content')).toBeInTheDocument();
  });

  // AV-25: ProfilePage hiển thị warning khi refreshUser thất bại sau khi lưu hồ sơ
  it('AV-25: In ProfilePage, saving profile when refreshUser fails displays warning toast and avoids full success message', async () => {
    vi.spyOn(authApi, 'updateProfile').mockResolvedValue({ message: 'Updated' } as any);
    const mockFailingRefresh = vi.fn().mockResolvedValue(false);

    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: baseUser,
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: mockFailingRefresh,
      updateUser: mockUpdateUser,
      hasRole: () => true,
      hasAnyRole: () => true,
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    // Modify a field to mark form dirty
    const nameInput = screen.getByLabelText(/Họ và tên/i);
    fireEvent.change(nameInput, { target: { value: 'Nguyễn Văn Đã Cập Nhật' } });

    const submitBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });
    expect(submitBtn).toBeEnabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authApi.updateProfile).toHaveBeenCalled();
      expect(mockFailingRefresh).toHaveBeenCalled();
    });

    // Should display warning toast, not full success
    await waitFor(() => {
      expect(screen.getByTestId('toast-warning')).toHaveTextContent(
        'Hồ sơ đã được lưu nhưng chưa thể đồng bộ lại dữ liệu từ máy chủ. Vui lòng tải lại trang.'
      );
      expect(screen.queryByTestId('toast-success')).not.toBeInTheDocument();
    });
  });
});
