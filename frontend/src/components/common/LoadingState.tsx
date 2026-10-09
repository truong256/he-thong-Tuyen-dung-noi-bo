import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  type?: 'spinner' | 'table-skeleton' | 'card-skeleton';
  rows?: number;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Đang tải dữ liệu...',
  type = 'spinner',
  rows = 5,
  className = '',
}) => {
  if (type === 'table-skeleton') {
    return (
      <div className={`enterprise-skeleton-table ${className}`} aria-busy="true">
        <div className="skeleton-header"></div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton-row">
            <div className="skeleton-cell w-20"></div>
            <div className="skeleton-cell w-40"></div>
            <div className="skeleton-cell w-25"></div>
            <div className="skeleton-cell w-15"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'card-skeleton') {
    return (
      <div className={`enterprise-skeleton-cards ${className}`} aria-busy="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-line w-50"></div>
            <div className="skeleton-line w-80"></div>
            <div className="skeleton-line w-30"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`enterprise-loading-state ${className}`} role="status">
      <Loader2 size={32} className="loading-spinner animate-spin" />
      <span className="loading-message">{message}</span>
    </div>
  );
};

export default LoadingState;
