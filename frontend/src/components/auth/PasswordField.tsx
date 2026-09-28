import React, { useState } from 'react';

interface PasswordFieldProps {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  error?: string | null;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  id = 'password',
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
    <div className="neumorphic-form-group">
      <div className="neumorphic-input-wrap">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="neumorphic-input has-toggle"
          aria-label="Mật khẩu"
        />
        <button
          type="button"
          className="neumorphic-toggle-btn"
          onClick={toggleShow}
          disabled={disabled}
          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          tabIndex={0}
        >
          {showPassword ? 'Ẩn' : 'Hiện'}
        </button>
      </div>
      {error && <span className="field-inline-error">{error}</span>}
    </div>
  );
};

export default PasswordField;
