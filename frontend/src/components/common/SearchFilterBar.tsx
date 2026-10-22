import React from 'react';
import { Search, X, RotateCcw } from 'lucide-react';

export interface SearchFilterBarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  extraActions?: React.ReactNode;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm...',
  filters,
  extraActions,
  onClearFilters,
  hasActiveFilters = false,
  className = '',
}) => {
  return (
    <div className={`enterprise-search-filter-bar ${className}`}>
      <div className="filter-bar-main">
        {onSearchChange && (
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="search-input"
              aria-label={searchPlaceholder}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="search-clear-btn"
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {filters && <div className="filter-controls-group">{filters}</div>}

        {hasActiveFilters && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="filter-reset-btn"
            title="Đặt lại bộ lọc"
          >
            <RotateCcw size={13} />
            <span>Xóa bộ lọc</span>
          </button>
        )}
      </div>

      {extraActions && <div className="filter-bar-actions">{extraActions}</div>}
    </div>
  );
};

export default SearchFilterBar;
