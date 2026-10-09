import React from 'react';
import { FolderOpen } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = 'Không có dữ liệu',
  description = 'Hiện tại chưa có bản ghi nào phù hợp với điều kiện tìm kiếm hoặc dữ liệu chưa được khởi tạo.',
  action,
  className = '',
}) => {
  return (
    <div className={`enterprise-empty-state ${className}`}>
      <div className="empty-state-icon" aria-hidden="true">
        {icon || <FolderOpen size={40} />}
      </div>
      <h4 className="empty-state-title">{title}</h4>
      {description && <p className="empty-state-description">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
};

export default EmptyState;
