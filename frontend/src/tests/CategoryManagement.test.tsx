import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CategoryManagementPage from '../pages/CategoryManagementPage';
import categoryApi from '../api/category';
import * as useAuthHook from '../hooks/useAuth';

vi.mock('../hooks/useAuth');
vi.mock('../api/category');

describe('CategoryManagementPage Component (Quản lý Danh mục dùng chung)', () => {
  const mockTypes = [
    { type: 'EMPLOYMENT_TYPE', label: 'Hình thức làm việc', count: 2 },
    { type: 'WORK_LOCATION', label: 'Địa điểm làm việc', count: 1 },
  ];

  const mockCategories = [
    {
      id: 1,
      type: 'EMPLOYMENT_TYPE',
      code: 'FULL_TIME',
      name: 'Toàn thời gian (Full-time)',
      sortOrder: 1,
      active: true,
    },
    {
      id: 2,
      type: 'EMPLOYMENT_TYPE',
      code: 'PART_TIME',
      name: 'Bán thời gian (Part-time)',
      sortOrder: 2,
      active: false,
    },
    {
      id: 3,
      type: 'WORK_LOCATION',
      code: 'HN_HQ',
      name: 'Hà Nội - Trụ sở chính',
      sortOrder: 1,
      active: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        email: 'admin@company.com',
        fullName: 'Admin User',
        roles: ['ADMIN'],
        role: 'ADMIN',
        mustChangePassword: false,
      },
      hasRole: (r: string) => r === 'ADMIN',
      hasAnyRole: (roles: string[]) => roles.includes('ADMIN'),
      hasPermission: () => true,
      hasAnyPermission: () => true,
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      clearAuthSession: vi.fn(),
      updateUser: vi.fn(),
    } as any);

    vi.mocked(categoryApi.getTypes).mockResolvedValue(mockTypes);
    vi.mocked(categoryApi.list).mockResolvedValue(mockCategories);
    vi.mocked(categoryApi.create).mockResolvedValue({
      id: 4,
      type: 'EMPLOYMENT_TYPE',
      code: 'INTERN',
      name: 'Thực tập sinh',
      sortOrder: 3,
      active: true,
    });
    vi.mocked(categoryApi.setStatus).mockResolvedValue({
      id: 2,
      type: 'EMPLOYMENT_TYPE',
      code: 'PART_TIME',
      name: 'Bán thời gian (Part-time)',
      sortOrder: 2,
      active: true,
    });
    vi.mocked(categoryApi.delete).mockResolvedValue(undefined);
  });

  it('renders hero title, badges, and metrics cards correctly', async () => {
    render(
      <MemoryRouter>
        <CategoryManagementPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Quản lý Danh mục Dùng chung')).toBeInTheDocument();
    expect(screen.getByText('Master Data & Metadata')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Tổng số danh mục')).toBeInTheDocument();
      expect(screen.getByText('Nhóm phân loại')).toBeInTheDocument();
      expect(screen.getByText('Đang hoạt động')).toBeInTheDocument();
      expect(screen.getByText('Tạm ngưng sử dụng')).toBeInTheDocument();
    });
  });

  it('loads and displays categories in data table', async () => {
    render(
      <MemoryRouter>
        <CategoryManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('FULL_TIME')).toBeInTheDocument();
      expect(screen.getByText('Toàn thời gian (Full-time)')).toBeInTheDocument();
      expect(screen.getByText('HN_HQ')).toBeInTheDocument();
      expect(screen.getByText('Hà Nội - Trụ sở chính')).toBeInTheDocument();
    });
  });

  it('triggers search when typing in search box', async () => {
    render(
      <MemoryRouter>
        <CategoryManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('FULL_TIME')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Tìm theo tên hoặc mã danh mục/i);
    fireEvent.change(searchInput, { target: { value: 'Hà Nội' } });

    await waitFor(() => {
      expect(categoryApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Hà Nội' })
      );
    });
  });

  it('filters by category type when clicking type pill', async () => {
    render(
      <MemoryRouter>
        <CategoryManagementPage />
      </MemoryRouter>
    );

    const typePill = await screen.findByRole('button', { name: /Hình thức làm việc/i });
    fireEvent.click(typePill);

    await waitFor(() => {
      expect(categoryApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EMPLOYMENT_TYPE' })
      );
    });
  });

  it('opens and closes Add Category modal', async () => {
    render(
      <MemoryRouter>
        <CategoryManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Thêm danh mục mới')).toBeInTheDocument();
    });

    const addBtn = screen.getByText('Thêm danh mục mới');
    fireEvent.click(addBtn);

    expect(screen.getByRole('heading', { name: 'Thêm Danh mục Mới' })).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: 'Hủy bỏ' });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Thêm Danh mục Mới' })).not.toBeInTheDocument();
    });
  });

  it('toggles category active status on status pill click', async () => {
    render(
      <MemoryRouter>
        <CategoryManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('FULL_TIME')).toBeInTheDocument();
    });

    const activePills = screen.getAllByTitle('Nhấn để bật/tắt trạng thái');
    expect(activePills.length).toBeGreaterThan(0);

    fireEvent.click(activePills[0]);

    await waitFor(() => {
      expect(categoryApi.setStatus).toHaveBeenCalledWith(1, false);
    });
  });

  it('opens delete confirmation modal when delete button is clicked', async () => {
    render(
      <MemoryRouter>
        <CategoryManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Xóa Toàn thời gian (Full-time)')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByLabelText('Xóa Toàn thời gian (Full-time)');
    fireEvent.click(deleteBtn);

    expect(screen.getByText('Xác nhận Xóa danh mục')).toBeInTheDocument();
    expect(screen.getByText(/Bạn có chắc chắn muốn xóa danh mục/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Xác nhận xóa' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(categoryApi.delete).toHaveBeenCalledWith(1);
    });
  });

  it('allows toggling between Table, Cards, and Grouped view modes', async () => {
    render(
      <MemoryRouter>
        <CategoryManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('FULL_TIME')).toBeInTheDocument();
    });

    // Switch to Cards view
    const cardsBtn = screen.getByTitle('Xem dạng Thẻ trực quan');
    fireEvent.click(cardsBtn);
    expect(screen.getByText('Toàn thời gian (Full-time)')).toBeInTheDocument();

    // Switch to Grouped view
    const groupedBtn = screen.getByTitle('Xem dạng Phân nhóm chuyên sâu');
    fireEvent.click(groupedBtn);
    expect(screen.getByText(/EMPLOYMENT_TYPE/i)).toBeInTheDocument();

    // Switch back to Table view
    const tableBtn = screen.getByTitle('Xem dạng Bảng chi tiết');
    fireEvent.click(tableBtn);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('opens and closes CategoryDetailModal when clicking detail button', async () => {
    render(
      <MemoryRouter>
        <CategoryManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Chi tiết Toàn thời gian (Full-time)')).toBeInTheDocument();
    });

    const detailBtn = screen.getByLabelText('Chi tiết Toàn thời gian (Full-time)');
    fireEvent.click(detailBtn);

    expect(screen.getByRole('heading', { name: 'Toàn thời gian (Full-time)' })).toBeInTheDocument();
    expect(screen.getByText('Mục đích & Hướng dẫn sử dụng')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Đóng' });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Mục đích & Hướng dẫn sử dụng')).not.toBeInTheDocument();
    });
  });

  it('supports selecting rows and displaying floating bulk action bar', async () => {
    render(
      <MemoryRouter>
        <CategoryManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Chọn Toàn thời gian (Full-time)')).toBeInTheDocument();
    });

    const rowCheckbox = screen.getByLabelText('Chọn Toàn thời gian (Full-time)');
    fireEvent.click(rowCheckbox);

    // Floating bulk bar appears
    expect(screen.getByText('Đã chọn 1 danh mục')).toBeInTheDocument();
    expect(screen.getByText('Kích hoạt tất cả')).toBeInTheDocument();
    expect(screen.getByText('Tạm ngưng tất cả')).toBeInTheDocument();

    // Click "Bỏ chọn"
    const clearBtn = screen.getByText('Bỏ chọn');
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.queryByText('Đã chọn 1 danh mục')).not.toBeInTheDocument();
    });
  });
});

