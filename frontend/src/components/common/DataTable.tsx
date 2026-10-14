import React from 'react';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
  striped?: boolean;
  stickyHeader?: boolean;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyState,
  onRowClick,
  striped = false,
  stickyHeader = false,
  className = '',
}: DataTableProps<T>) {
  if (isLoading) {
    return <LoadingState type="table-skeleton" rows={5} />;
  }

  if (!data || data.length === 0) {
    return emptyState ? <>{emptyState}</> : <EmptyState />;
  }

  return (
    <div className={`enterprise-table-container ${stickyHeader ? 'sticky-header' : ''} ${className}`}>
      <table className={`enterprise-table ${striped ? 'table-striped' : ''}`}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width, textAlign: col.align || 'left' }}
                className={`table-th ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={keyExtractor(row, index)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`table-tr ${onRowClick ? 'is-clickable' : ''}`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{ textAlign: col.align || 'left' }}
                  className={`table-td ${col.className || ''}`}
                >
                  {col.render ? col.render(row, index) : ((row as any)[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
