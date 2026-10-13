import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Pagination } from '../components/common/Pagination';

describe('Pagination Component (Chuẩn hóa Modern Enterprise Dashboard)', () => {
  it('TC01: Hiển thị đúng khoảng bản ghi 11-15 trong tổng số 15 mục khi ở trang 2 với size 10', () => {
    const handlePageChange = vi.fn();
    const handlePageSizeChange = vi.fn();

    const { container } = render(
      <Pagination
        currentPage={2}
        totalPages={2}
        totalItems={15}
        pageSize={10}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        itemLabel="tài khoản"
      />
    );

    // Kiểm tra dòng text dải hiển thị: "Hiển thị 11–15 trong tổng số 15 tài khoản"
    const infoText = container.querySelector('.pagination-record-range')?.textContent || '';
    expect(infoText).toContain('Hiển thị 11–15 trong tổng số 15 tài khoản');

    // Nút Trang sau (Next) phải bị disabled vì đang ở trang cuối (2/2)
    const nextBtn = screen.getByLabelText(/Trang sau/i);
    expect(nextBtn).toBeDisabled();

    // Nút Trang trước (Prev) phải enable
    const prevBtn = screen.getByLabelText(/Trang trước/i);
    expect(prevBtn).not.toBeDisabled();
  });

  it('TC02: Click chuyển trang từ trang 1 sang trang 2 và ngược lại', () => {
    const handlePageChange = vi.fn();

    const { rerender } = render(
      <Pagination
        currentPage={1}
        totalPages={3}
        totalItems={25}
        pageSize={10}
        onPageChange={handlePageChange}
        itemLabel="mục"
      />
    );

    // Nút Trang trước phải disabled khi ở trang 1
    const prevBtn = screen.getByLabelText(/Trang trước/i);
    expect(prevBtn).toBeDisabled();

    // Click nút số trang 2
    const page2Btn = screen.getByLabelText('Trang 2');
    fireEvent.click(page2Btn);
    expect(handlePageChange).toHaveBeenCalledWith(2);

    // Click nút Trang sau
    const nextBtn = screen.getByLabelText(/Trang sau/i);
    fireEvent.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(2);

    // Rerender ở trang 2
    rerender(
      <Pagination
        currentPage={2}
        totalPages={3}
        totalItems={25}
        pageSize={10}
        onPageChange={handlePageChange}
        itemLabel="mục"
      />
    );

    // Click nút Trang trước để về trang 1
    const prevBtnPage2 = screen.getByLabelText(/Trang trước/i);
    fireEvent.click(prevBtnPage2);
    expect(handlePageChange).toHaveBeenCalledWith(1);
  });

  it('TC03: Thay đổi số dòng trên trang (10 -> 20 -> 50)', () => {
    const handlePageChange = vi.fn();
    const handlePageSizeChange = vi.fn();

    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={50}
        pageSize={10}
        pageSizeOptions={[10, 20, 50]}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    );

    const select = screen.getByRole('combobox', { name: /Số bản ghi mỗi trang/i });
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('10');

    // Đổi sang 20
    fireEvent.change(select, { target: { value: '20' } });
    expect(handlePageSizeChange).toHaveBeenCalledWith(20);

    // Đổi sang 50
    fireEvent.change(select, { target: { value: '50' } });
    expect(handlePageSizeChange).toHaveBeenCalledWith(50);
  });

  it('TC04: Xử lý 0 bản ghi (empty state)', () => {
    const { container } = render(
      <Pagination
        currentPage={1}
        totalPages={1}
        totalItems={0}
        pageSize={10}
        onPageChange={vi.fn()}
        itemLabel="ứng viên"
      />
    );

    const infoText = container.querySelector('.pagination-record-range')?.textContent || '';
    expect(infoText).toContain('Hiển thị 0–0 trong tổng số 0 ứng viên');
    expect(screen.getByLabelText(/Trang trước/i)).toBeDisabled();
    expect(screen.getByLabelText(/Trang sau/i)).toBeDisabled();
  });

  it('TC05: Rút gọn bằng dấu ... khi có nhiều trang', () => {
    render(
      <Pagination
        currentPage={5}
        totalPages={10}
        totalItems={100}
        pageSize={10}
        onPageChange={vi.fn()}
      />
    );

    // Phải có nút trang 1, nút trang 10 và các nút lân cận trang 5
    expect(screen.getByLabelText('Trang 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Trang 5')).toBeInTheDocument();
    expect(screen.getByLabelText('Trang 10')).toBeInTheDocument();

    // Phải có dấu ellipsis "..."
    const ellipses = screen.getAllByText('...');
    expect(ellipses.length).toBeGreaterThanOrEqual(1);
  });
});
