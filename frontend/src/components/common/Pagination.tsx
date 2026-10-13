import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  itemLabel?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
  showFirstLast?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  itemLabel = 'bản ghi',
  onPageChange,
  onPageSizeChange,
  className = '',
  showFirstLast = true,
}) => {
  const effectiveTotalPages = Math.max(1, totalPages);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = totalItems === 0 ? 0 : Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis according to modern Enterprise design
  const getPageNumbers = () => {
    if (totalItems === 0) return [1];
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (effectiveTotalPages <= maxVisible + 2) {
      for (let i = 1; i <= effectiveTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(effectiveTotalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < effectiveTotalPages - 2) pages.push('...');
      pages.push(effectiveTotalPages);
    }
    return pages;
  };

  return (
    <div className={`enterprise-pagination ${className}`} data-testid="enterprise-pagination">
      <div className="pagination-info">
        <span className="pagination-record-range">
          Hiển thị <strong>{startItem}</strong>–<strong>{endItem}</strong> trong tổng số{' '}
          <strong>{totalItems.toLocaleString('vi-VN')}</strong> {itemLabel}
        </span>

        {onPageSizeChange && (
          <div className="pagination-page-size">
            <span className="page-size-label">Số dòng/trang</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="page-size-select"
              aria-label="Số bản ghi mỗi trang"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="pagination-controls" aria-label="Phân trang">
        {showFirstLast && effectiveTotalPages > 3 && (
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1 || totalItems === 0}
            className="pagination-btn pagination-first"
            title="Trang đầu"
            aria-label="Trang đầu"
          >
            <ChevronsLeft size={16} />
          </button>
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || totalItems === 0}
          className="pagination-btn pagination-prev"
          title="Trang trước"
          aria-label="Trang trước"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="pagination-numbers">
          {getPageNumbers().map((p, idx) =>
            typeof p === 'number' ? (
              <button
                key={idx}
                type="button"
                onClick={() => onPageChange(p)}
                disabled={totalItems === 0}
                className={`pagination-number ${currentPage === p ? 'is-active' : ''}`}
                aria-current={currentPage === p ? 'page' : undefined}
                aria-label={`Trang ${p}`}
              >
                {p}
              </button>
            ) : (
              <span key={idx} className="pagination-ellipsis" aria-hidden="true">
                {p}
              </span>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= effectiveTotalPages || totalItems === 0}
          className="pagination-btn pagination-next"
          title="Trang sau"
          aria-label="Trang sau"
        >
          <ChevronRight size={16} />
        </button>

        {showFirstLast && effectiveTotalPages > 3 && (
          <button
            type="button"
            onClick={() => onPageChange(effectiveTotalPages)}
            disabled={currentPage >= effectiveTotalPages || totalItems === 0}
            className="pagination-btn pagination-last"
            title="Trang cuối"
            aria-label="Trang cuối"
          >
            <ChevronsRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default Pagination;
