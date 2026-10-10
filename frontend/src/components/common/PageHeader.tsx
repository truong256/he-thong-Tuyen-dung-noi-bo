import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  badge,
  actions,
  className = '',
}) => {
  return (
    <div className={`enterprise-page-header ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="enterprise-breadcrumbs" aria-label="Breadcrumb">
          <ol className="breadcrumbs-list">
            <li className="breadcrumb-item">
              <Link to="/dashboard" className="breadcrumb-link home-link" aria-label="Trang chủ">
                <Home size={14} />
              </Link>
            </li>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <li key={idx} className="breadcrumb-item">
                  <ChevronRight size={13} className="breadcrumb-separator" aria-hidden="true" />
                  {isLast || !crumb.path ? (
                    <span className="breadcrumb-current" aria-current={isLast ? 'page' : undefined}>
                      {crumb.label}
                    </span>
                  ) : (
                    <Link to={crumb.path} className="breadcrumb-link">
                      {crumb.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="page-header-main">
        <div className="page-header-titles">
          <div className="page-header-title-row">
            <h1 className="page-header-title">{title}</h1>
            {badge && <div className="page-header-badge">{badge}</div>}
          </div>
          {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
        </div>

        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
