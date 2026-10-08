import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import authApi from '../api/auth';
import ChangePasswordModal from '../components/auth/ChangePasswordModal';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileTabs, { ProfileTabType } from '../components/profile/ProfileTabs';
import PersonalInfoTab, { ProfileFieldErrors } from '../components/profile/PersonalInfoTab';
import RolesPermissionsTab from '../components/profile/RolesPermissionsTab';
import SecuritySessionsTab from '../components/profile/SecuritySessionsTab';
import '../styles/profile.css';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<ProfileTabType>('info');

  // Form states
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [recoveryEmail, setRecoveryEmail] = useState(user?.recoveryEmail || '');

  // UI status states
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  // Password Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Synchronize state when user context updates from backend
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
      setDisplayName(user.displayName || '');
      setDepartment(user.department || '');
      setRecoveryEmail(user.recoveryEmail || '');
    }
  }, [user]);

  const handleReset = () => {
    setFullName(user?.fullName || '');
    setPhone(user?.phone || '');
    setDisplayName(user?.displayName || '');
    setDepartment(user?.department || '');
    setRecoveryEmail(user?.recoveryEmail || '');
    setFieldErrors({});
    setValidationError(null);
    setErrorMsg(null);
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    setFieldErrors((prev) => ({ ...prev, phone: undefined }));
    if (validationError) setValidationError(null);
    if (errorMsg) setErrorMsg(null);
  };

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    setFieldErrors((prev) => ({ ...prev, displayName: undefined }));
    if (validationError) setValidationError(null);
    if (errorMsg) setErrorMsg(null);
  };

  const handleFullNameChange = (name: string) => {
    setFullName(name);
    setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
    if (validationError) setValidationError(null);
    if (errorMsg) setErrorMsg(null);
  };

  const handleRecoveryEmailChange = (emailVal: string) => {
    setRecoveryEmail(emailVal);
    setFieldErrors((prev) => ({ ...prev, recoveryEmail: undefined }));
    if (validationError) setValidationError(null);
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setValidationError(null);
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedDisplayName = displayName.trim();
    const trimmedRecovery = recoveryEmail.trim();

    const errors: ProfileFieldErrors = {};

    if (!trimmedName || trimmedName.length < 2) {
      errors.fullName = 'Họ và tên phải có tối thiểu 2 ký tự.';
    } else if (trimmedName.length > 100) {
      errors.fullName = 'Họ và tên không được vượt quá 100 ký tự.';
    }

    if (trimmedPhone && !/^(0|\+84)[35789]\d{8}$/.test(trimmedPhone)) {
      errors.phone = 'Số điện thoại không đúng định dạng Việt Nam.';
    }

    if (trimmedDisplayName.length > 150) {
      errors.displayName = 'Chức danh hiển thị tối đa 150 ký tự.';
    }

    if (trimmedRecovery) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedRecovery)) {
        errors.recoveryEmail = 'Email khôi phục không đúng định dạng.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstError = errors.fullName || errors.phone || errors.displayName || errors.recoveryEmail || null;
      setValidationError(firstError);
      return;
    }

    setIsSaving(true);
    try {
      const payload: {
        fullName: string;
        phone?: string;
        displayName?: string;
        recoveryEmail?: string;
      } = {
        fullName: trimmedName,
      };
      if (trimmedPhone) payload.phone = trimmedPhone;
      if (trimmedDisplayName) payload.displayName = trimmedDisplayName;
      if (trimmedRecovery) {
        payload.recoveryEmail = trimmedRecovery;
      } else if (user?.recoveryEmail) {
        payload.recoveryEmail = '';
      }

      await authApi.updateProfile(payload);

      // Refresh current user data across context and localStorage
      await refreshUser();

      setSuccessMsg('Thông tin hồ sơ cá nhân đã được cập nhật thành công!');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      const apiValidation = err.response?.data?.validationErrors;
      if (apiValidation && typeof apiValidation === 'object') {
        const mappedErrors: ProfileFieldErrors = {};
        if (apiValidation.fullName) mappedErrors.fullName = apiValidation.fullName;
        if (apiValidation.phone) mappedErrors.phone = apiValidation.phone;
        if (apiValidation.displayName) mappedErrors.displayName = apiValidation.displayName;
        if (apiValidation.recoveryEmail) mappedErrors.recoveryEmail = apiValidation.recoveryEmail;
        setFieldErrors(mappedErrors);
      }

      const msg =
        err.response?.data?.message ||
        apiValidation?.fullName ||
        apiValidation?.phone ||
        apiValidation?.displayName ||
        apiValidation?.recoveryEmail ||
        'Không thể cập nhật hồ sơ cá nhân. Vui lòng thử lại sau.';
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const isAccountActive = user?.status === 'ACTIVE';

  return (
    <div className="profile-page-clean-container" data-testid="profile-page">
      {/* 1. Profile Summary Card (Clean, compact, no huge gradients) */}
      <ProfileHeader
        user={user}
        fullName={fullName}
        isAccountActive={isAccountActive}
        onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
      />

      {/* 2. Navigation Tabs (Clean underline highlight, responsive scroll) */}
      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 3. Tab Contents */}
      <main className="profile-tab-content-area">
        {activeTab === 'info' && (
          <PersonalInfoTab
            user={user}
            fullName={fullName}
            department={department}
            phone={phone}
            displayName={displayName}
            recoveryEmail={recoveryEmail}
            isSaving={isSaving}
            fieldErrors={fieldErrors}
            validationError={validationError}
            errorMsg={errorMsg}
            successMsg={successMsg}
            onFullNameChange={handleFullNameChange}
            onPhoneChange={handlePhoneChange}
            onDisplayNameChange={handleDisplayNameChange}
            onRecoveryEmailChange={handleRecoveryEmailChange}
            onSubmit={handleSubmit}
            onReset={handleReset}
          />
        )}

        {activeTab === 'rbac' && <RolesPermissionsTab user={user} />}

        {activeTab === 'security' && (
          <SecuritySessionsTab onOpenPasswordModal={() => setIsPasswordModalOpen(true)} />
        )}
      </main>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={() => {
          setSuccessMsg('Mật khẩu của bạn đã được thay đổi thành công!');
          setTimeout(() => setSuccessMsg(null), 5000);
        }}
      />
    </div>
  );
};

export default ProfilePage;
