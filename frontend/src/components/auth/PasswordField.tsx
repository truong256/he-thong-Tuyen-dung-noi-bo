import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface PasswordFieldProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  error?: string | null;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  id = 'login-password',
  label,
  value,
  onChange,
  disabled = false,
  required = true,
  placeholder = 'Mật khẩu',
  autoComplete = 'current-password',
  error,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const toggleShow = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="auth-field-group">
      {label && (
        <label htmlFor={id} className="auth-field-label">
          {label} {required && <span className="auth-required-star">*</span>}
        </label>
      )}
      <div className="auth-input-wrapper">
        <Lock size={18} className="auth-input-leading-icon" aria-hidden="true" />
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`auth-text-input has-leading-icon has-toggle ${error ? 'has-error' : ''}`}
          aria-label="Mật khẩu"
        />
        <button
          type="button"
          className="auth-password-toggle-btn"
          onClick={toggleShow}
          disabled={disabled}
          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          tabIndex={0}
        >
          {showPassword ? (
            <EyeOff size={18} aria-hidden="true" />
          ) : (
            <Eye size={18} aria-hidden="true" />
          )}
        </button>
      </div>
      {error && <span className="auth-field-error" role="alert">{error}</span>}
    </div>
  );
};

export default PasswordField;
