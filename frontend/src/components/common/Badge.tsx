import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  dot = false,
  icon,
  children,
  className = '',
  ...props
}) => {
  const baseClass = 'enterprise-badge';
  const variantClass = `badge-${variant}`;
  const sizeClass = size === 'sm' ? 'badge-sm' : '';

  const combinedClasses = [baseClass, variantClass, sizeClass, className].filter(Boolean).join(' ');

  return (
    <span className={combinedClasses} {...props}>
      {dot && <span className="badge-dot" aria-hidden="true" />}
      {icon && <span className="badge-icon">{icon}</span>}
      <span className="badge-label">{children}</span>
    </span>
  );
};

export default Badge;
