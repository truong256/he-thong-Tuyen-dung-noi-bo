import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'flat' | 'hoverable';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  children,
  className = '',
  ...props
}) => {
  const baseClass = 'enterprise-card';
  const variantClass = variant !== 'default' ? `card-${variant}` : '';
  const paddingClass = padding !== 'md' ? `card-p-${padding}` : '';

  const combinedClasses = [baseClass, variantClass, paddingClass, className].filter(Boolean).join(' ');

  return (
    <div className={combinedClasses} {...props}>
      {children}
    </div>
  );
};

export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  icon,
  actions,
  badge,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`enterprise-card-header ${className}`} {...props}>
      {children ? (
        children
      ) : (
        <>
          <div className="card-header-title-group">
            {icon && <div className="card-header-icon">{icon}</div>}
            <div>
              <div className="card-header-title-row">
                {title && <h3 className="card-title">{title}</h3>}
                {badge && <div className="card-badge">{badge}</div>}
              </div>
              {subtitle && <p className="card-subtitle">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="card-header-actions">{actions}</div>}
        </>
      )}
    </div>
  );
};

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  noPadding?: boolean;
}

export const CardBody: React.FC<CardBodyProps> = ({
  children,
  noPadding = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`enterprise-card-body ${noPadding ? 'no-padding' : ''} ${className}`} {...props}>
      {children}
    </div>
  );
};

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'left' | 'center' | 'right' | 'between';
  children: React.ReactNode;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  align = 'right',
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`enterprise-card-footer footer-${align} ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
