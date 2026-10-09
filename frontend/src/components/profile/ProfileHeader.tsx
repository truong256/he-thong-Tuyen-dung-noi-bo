import React, { useState, useRef, useEffect } from 'react';
import { Camera, Trash2, X, Check, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { UserSummary } from '../../types/auth';
import { getRoleLabel } from '../../constants/rbac';
import { useAuth } from '../../hooks/useAuth';
import authApi from '../../api/auth';

interface ProfileHeaderProps {
  user: UserSummary | null;
  fullName: string;
  isAccountActive: boolean;
  onOpenPasswordModal: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  fullName,
  isAccountActive,
  onOpenPasswordModal,
}) => {
  const { updateUser, refreshUser } = useAuth();
  const displayName = fullName.trim() || user?.fullName || user?.email || 'Người dùng';
  const initial = displayName.charAt(0).toUpperCase();

  const userRolesList =
    user?.roles && user.roles.length > 0
      ? user.roles
      : [user?.role || 'RECRUITER'];

  const rolesSummary = userRolesList.map((r: string) => getRoleLabel(r)).join(' · ');

  // Avatar state & handlers
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const avatarUrl = user?.avatarUrl || user?.avatarThumbnailUrl;
  const hasAvatar = !!avatarUrl && !imgError;

  // Reset imgError if avatarUrl changes
  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  // Clean up object URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Auto-dismiss toasts
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (toastError) {
      const timer = setTimeout(() => setToastError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastError]);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so user can re-select the same file if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // A. Validate file type: Only accept JPG or PNG
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png'];
    const fileName = file.name.toLowerCase();
    const isJpegExt = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg');
    const isPngExt = fileName.endsWith('.png');
    const isMimeValid = validMimes.includes(file.type.toLowerCase());

    if (!isMimeValid && !isJpegExt && !isPngExt) {
      setToastError('Chỉ chấp nhận ảnh JPG hoặc PNG.');
      return;
    }

    // B. Validate file size: Maximum 2MB
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setToastError('Ảnh đại diện không được vượt quá 2MB.');
      return;
    }

    // Revoke old object URL if exists
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setModalError(null);
    setIsModalOpen(false);
  };

  const handleSaveAvatar = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setModalError(null);

    try {
      const res = await authApi.uploadAvatar(selectedFile);

      if (updateUser) {
        if (res.user) {
          updateUser(res.user);
        } else if (user) {
          updateUser({
            ...user,
            avatarUrl: res.avatarUrl,
            avatarThumbnailUrl: res.avatarThumbnailUrl || res.thumbnailUrl,
          });
        }
      }

      await refreshUser();
      handleCloseModal();
      setToastMessage('Cập nhật ảnh đại diện thành công.');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403) {
        setModalError('Bạn không có quyền cập nhật ảnh đại diện.');
      } else {
        const msg =
          err.response?.data?.message ||
          'Không thể tải lên ảnh đại diện. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.';
        setModalError(msg);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await authApi.deleteAvatar();

      if (user && updateUser) {
        updateUser({
          ...user,
          avatarUrl: undefined,
          avatarThumbnailUrl: undefined,
        });
      }

      await refreshUser();
      setIsDeleteModalOpen(false);
      setToastMessage('Đã xóa ảnh đại diện.');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403) {
        setToastError('Bạn không có quyền xóa ảnh đại diện.');
      } else {
        const msg =
          err.response?.data?.message ||
          'Không thể xóa ảnh đại diện. Vui lòng thử lại sau.';
        setToastError(msg);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <section className="profile-summary-header" aria-label="Thông tin hồ sơ quản trị viên">
      {/* Toast notifications */}
      {toastMessage && (
        <div className="profile-header-toast success" role="status">
          <Check size={16} />
          <span>{toastMessage}</span>
          <button
            type="button"
            className="toast-close-btn"
            onClick={() => setToastMessage(null)}
            aria-label="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {toastError && (
        <div className="profile-header-toast error" role="alert">
          <AlertCircle size={16} />
          <span>{toastError}</span>
          <button
            type="button"
            className="toast-close-btn"
            onClick={() => setToastError(null)}
            aria-label="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        data-testid="avatar-file-input"
        aria-hidden="true"
      />

      <div className="profile-header-main">
        {/* Avatar with Status Indicator and Actions */}
        <div className="profile-header-avatar-col">
          <div className="profile-header-avatar-box">
            <div
              className="profile-header-avatar"
              aria-label="Ảnh đại diện"
              role="button"
              tabIndex={0}
              onClick={triggerFileInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  triggerFileInput();
                }
              }}
              title="Nhấn để đổi ảnh đại diện"
              data-testid="profile-avatar-clickable"
            >
              {hasAvatar ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="profile-header-avatar-img"
                  onError={() => setImgError(true)}
                />
              ) : (
                <span className="profile-header-avatar-initial">{initial}</span>
              )}

              {/* Hover overlay with camera icon */}
              <div className="profile-avatar-hover-overlay" aria-hidden="true">
                <Camera size={18} />
                <span className="profile-avatar-overlay-text">Đổi ảnh</span>
              </div>
            </div>

            {/* Camera badge button (accessible on touchscreen / mobile) */}
            <button
              type="button"
              className="profile-avatar-badge-btn"
              onClick={triggerFileInput}
              title="Đổi ảnh đại diện"
              aria-label="Đổi ảnh đại diện"
            >
              <Camera size={14} />
            </button>

            <span
              className={`profile-header-status-dot ${isAccountActive ? 'active' : 'locked'}`}
              title={isAccountActive ? 'Đang hoạt động' : 'Tài khoản tạm khóa'}
            />
          </div>

          {/* Delete avatar button if user currently has an avatar */}
          {hasAvatar && (
            <button
              type="button"
              className="profile-btn-delete-avatar"
              onClick={() => setIsDeleteModalOpen(true)}
              title="Xóa ảnh đại diện"
              data-testid="delete-avatar-btn"
            >
              <Trash2 size={12} />
              <span>Xóa ảnh</span>
            </button>
          )}
        </div>

        {/* Identity & Metadata */}
        <div className="profile-header-info">
          <div className="profile-header-name-row">
            <h1 className="profile-header-name">{displayName}</h1>
          </div>

          <div className="profile-header-email">{user?.email || 'Chưa cập nhật email'}</div>

          <div className="profile-header-roles-text">{rolesSummary}</div>

          <div className="profile-header-status-indicator">
            <span
              className={`status-indicator-dot ${isAccountActive ? 'active' : 'locked'}`}
            />
            <span className="status-indicator-text">
              {isAccountActive ? 'Đang hoạt động' : 'Tài khoản tạm khóa'}
            </span>
          </div>
        </div>
      </div>

      {/* Action: Secondary Change Password Button */}
      <div className="profile-header-actions">
        <button
          type="button"
          className="btn btn-secondary profile-btn-change-password"
          onClick={onOpenPasswordModal}
          title="Đổi mật khẩu tài khoản"
        >
          <span>Đổi mật khẩu</span>
        </button>
      </div>

      {/* MODAL 1: Đổi ảnh đại diện (Preview & Confirmation) */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="avatar-modal-title"
        >
          <div className="modal-box avatar-modal-box">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="modal-title-icon">
                  <Camera size={20} />
                </div>
                <h3 id="avatar-modal-title">Đổi ảnh đại diện</h3>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={handleCloseModal}
                disabled={isUploading}
                aria-label="Đóng cửa sổ"
              >
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div className="alert-box error" role="alert" style={{ marginTop: '12px' }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <div className="avatar-preview-container">
              {/* Circular preview showing final avatar presentation */}
              <div className="avatar-preview-circle-wrap has-preview">
                <div className="avatar-preview-circle">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Xem trước ảnh đại diện"
                      className="avatar-preview-img"
                    />
                  )}
                </div>
              </div>

              {selectedFile && (
                <div className="avatar-preview-meta">
                  <span className="avatar-file-name">{selectedFile.name}</span>
                  <span className="avatar-file-size">
                    Dung lượng: {formatFileSize(selectedFile.size)}
                  </span>
                </div>
              )}

              <div className="avatar-guidelines-box">
                <strong>Lưu ý định dạng:</strong>
                <ul>
                  <li>Chỉ chấp nhận tệp định dạng JPG hoặc PNG.</li>
                  <li>Dung lượng tối đa 2MB.</li>
                  <li>Hệ thống tự động căn giữa và cắt vuông tỷ lệ 1:1.</li>
                </ul>
              </div>
            </div>

            <div className="avatar-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={triggerFileInput}
                disabled={isUploading}
                style={{ fontSize: '0.85rem' }}
              >
                <RefreshCw size={14} />
                <span>Chọn ảnh khác</span>
              </button>

              <div className="avatar-modal-footer-right">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                  disabled={isUploading}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveAvatar}
                  disabled={isUploading}
                  data-testid="save-avatar-btn"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={16} className="spinner-icon" />
                      <span>Đang tải ảnh...</span>
                    </>
                  ) : (
                    <span>Lưu ảnh</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Xác nhận xóa ảnh đại diện */}
      {isDeleteModalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-avatar-modal-title"
        >
          <div className="modal-box" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="modal-title-icon" style={{ color: '#ef4444', background: '#fee2e2' }}>
                  <Trash2 size={20} />
                </div>
                <h3 id="delete-avatar-modal-title">Xác nhận xóa ảnh</h3>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                aria-label="Đóng cửa sổ"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ margin: '16px 0 20px', color: '#475569', fontSize: '0.9rem', lineHeight: '1.6' }}>
              Bạn có chắc muốn xóa ảnh đại diện? Sau khi xóa, hệ thống sẽ hiển thị lại chữ cái đầu của tên bạn.
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                data-testid="confirm-delete-avatar-btn"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={15} className="spinner-icon" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <span>Xóa ảnh</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProfileHeader;
