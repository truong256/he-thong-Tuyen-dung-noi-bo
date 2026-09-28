import React, { useState } from 'react';

interface PasswordFieldProps {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  id = 'password',
  value,
  onChange,
  disabled = false,
  required = true,
  placeholder = 'Nhập mật khẩu',
  autoComplete = 'current-password',
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const toggleShow = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="form-group password-group">
      <div className="form-label-row">
        <label htmlFor={id} className="form-label">
          Mật khẩu
        </label>
        <button
          type="button"
          className="text-toggle-btn"
          onClick={toggleShow}
          disabled={disabled}
          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {showPassword ? 'Ẩn' : 'Hiện'}
        </button>
      </div>

      <div className="input-container">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="clean-input"
        />
      </div>
    </div>
  );
};

export default PasswordField;
