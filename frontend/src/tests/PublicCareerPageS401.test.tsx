import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PublicCareerPage from '../pages/PublicCareerPage';
import jobPostingApi from '../api/jobPosting';
import { JobPostingPublic } from '../types/jobPosting';

vi.mock('../api/jobPosting', () => ({
  default: {
    listPublic: vi.fn(),
    getPublicDepartments: vi.fn(),
    getPublicLocations: vi.fn(),
  },
}));

const mockJobs: JobPostingPublic[] = [
  {
    id: 1,
    jobCode: 'JP-2026-0001',
    title: 'Kỹ sư Backend Senior Java',
    departmentId: 10,
    departmentName: 'Phòng Phát Triển Phần Mềm',
    workLocation: 'Hà Nội - Trụ sở chính',
    workingModel: 'HYBRID',
    quantity: 3,
    jobDescription: 'Tham gia xây dựng hệ thống tuyển dụng nội bộ',
    requirements: 'Tối thiểu 3 năm kinh nghiệm Java/Spring Boot',
    benefits: 'Bảo hiểm sức khỏe cao cấp',
    salaryVisible: true,
    salaryDisplay: '25,000,000 - 40,000,000 VND',
    applicationDeadline: '2026-11-30',
  },
  {
    id: 2,
    jobCode: 'JP-2026-0002',
    title: 'Chuyên viên Tuyển dụng (Recruiter)',
    departmentId: 20,
    departmentName: 'Phòng Nhân Sự',
    workLocation: 'TP. Hồ Chí Minh',
    workingModel: 'ONSITE',
    quantity: 1,
    jobDescription: 'Tìm nguồn ứng viên tài năng và điều phối phỏng vấn',
    requirements: 'Kinh nghiệm tuyển dụng IT',
    benefits: 'Thưởng hiệu quả công việc',
    salaryVisible: false,
    salaryDisplay: 'Thỏa thuận',
    applicationDeadline: '2026-12-15',
  },
];

describe('S4-01 / SCRUM-164: Cổng việc làm công khai và 3 bộ lọc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(jobPostingApi.getPublicDepartments).mockResolvedValue([
      { id: 10, name: 'Phòng Phát Triển Phần Mềm' },
      { id: 20, name: 'Phòng Nhân Sự' },
    ]);
    vi.mocked(jobPostingApi.getPublicLocations).mockResolvedValue([
      'Hà Nội - Trụ sở chính',
      'TP. Hồ Chí Minh',
    ]);
    vi.mocked(jobPostingApi.listPublic).mockResolvedValue({
      content: mockJobs,
      totalElements: 2,
      totalPages: 1,
      size: 30,
      number: 0,
    });
  });

  it('AC1: Hiển thị thanh tìm kiếm và đủ 3 bộ lọc (phòng ban, địa điểm, hình thức làm việc) mà không cần đăng nhập', async () => {
    render(
      <MemoryRouter>
        <PublicCareerPage />
      </MemoryRouter>
    );

    // Hero title & navbar
    expect(screen.getByText('CỔNG NGHỀ NGHIỆP & TUYỂN DỤNG')).toBeInTheDocument();
    expect(screen.getByText('Khám phá vị trí phù hợp với bạn')).toBeInTheDocument();

    // Search input
    expect(screen.getByPlaceholderText('Tìm kiếm công việc theo chức danh, từ khóa...')).toBeInTheDocument();

    // 3 filters
    expect(screen.getByLabelText('Lọc theo phòng ban')).toBeInTheDocument();
    expect(screen.getByLabelText('Lọc theo địa điểm')).toBeInTheDocument();
    expect(screen.getByLabelText('Lọc theo hình thức làm việc')).toBeInTheDocument();

    // Options loaded
    expect(await screen.findByRole('option', { name: 'Phòng Phát Triển Phần Mềm' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Hà Nội - Trụ sở chính' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Linh hoạt (Hybrid)' })).toBeInTheDocument();

    // Job list loaded
    expect(await screen.findByText('Kỹ sư Backend Senior Java')).toBeInTheDocument();
    expect(screen.getByText('Chuyên viên Tuyển dụng (Recruiter)')).toBeInTheDocument();
    expect(screen.getByText('Các vị trí đang mở tuyển (2)')).toBeInTheDocument();
  });

  it('AC2: Thay đổi bộ lọc phòng ban, địa điểm, hình thức làm việc và từ khóa gọi API đúng', async () => {
    render(
      <MemoryRouter>
        <PublicCareerPage />
      </MemoryRouter>
    );

    await screen.findByText('Kỹ sư Backend Senior Java');

    // 1. Nhập từ khóa
    const searchInput = screen.getByPlaceholderText('Tìm kiếm công việc theo chức danh, từ khóa...');
    fireEvent.change(searchInput, { target: { value: 'Backend' } });

    await waitFor(() => {
      expect(jobPostingApi.listPublic).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: 'Backend' })
      );
    });

    // 2. Chọn phòng ban
    fireEvent.change(screen.getByLabelText('Lọc theo phòng ban'), { target: { value: '10' } });

    await waitFor(() => {
      expect(jobPostingApi.listPublic).toHaveBeenCalledWith(
        expect.objectContaining({ departmentId: 10, keyword: 'Backend' })
      );
    });

    // 3. Chọn địa điểm
    fireEvent.change(screen.getByLabelText('Lọc theo địa điểm'), { target: { value: 'Hà Nội - Trụ sở chính' } });

    await waitFor(() => {
      expect(jobPostingApi.listPublic).toHaveBeenCalledWith(
        expect.objectContaining({
          departmentId: 10,
          workLocation: 'Hà Nội - Trụ sở chính',
          keyword: 'Backend',
        })
      );
    });

    // 4. Chọn hình thức làm việc
    fireEvent.change(screen.getByLabelText('Lọc theo hình thức làm việc'), { target: { value: 'HYBRID' } });

    await waitFor(() => {
      expect(jobPostingApi.listPublic).toHaveBeenCalledWith(
        expect.objectContaining({
          departmentId: 10,
          workLocation: 'Hà Nội - Trụ sở chính',
          workingModel: 'HYBRID',
          keyword: 'Backend',
        })
      );
    });
  });

  it('AC2: Hiển thị trạng thái đang tải (Loading state)', async () => {
    // Trả về promise chưa resolve ngay để bắt loading
    let resolvePromise: (value: any) => void;
    vi.mocked(jobPostingApi.listPublic).mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    render(
      <MemoryRouter>
        <PublicCareerPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Đang tìm kiếm cơ hội nghề nghiệp...')).toBeInTheDocument();

    // Resolve promise
    resolvePromise!({ content: [], totalElements: 0, totalPages: 0, size: 30, number: 0 });
    await waitFor(() => {
      expect(screen.queryByText('Đang tìm kiếm cơ hội nghề nghiệp...')).not.toBeInTheDocument();
    });
  });

  it('AC2: Hiển thị trạng thái không có kết quả (Empty state) và nút xóa bộ lọc', async () => {
    vi.mocked(jobPostingApi.listPublic).mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 30,
      number: 0,
    });

    render(
      <MemoryRouter>
        <PublicCareerPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Hiện chưa có vị trí phù hợp với tìm kiếm của bạn')).toBeInTheDocument();

    // Nhập từ khóa để kích hoạt nút xóa bộ lọc
    fireEvent.change(screen.getByPlaceholderText('Tìm kiếm công việc theo chức danh, từ khóa...'), {
      target: { value: 'NonexistentRole' },
    });

    const clearBtn = await screen.findByRole('button', { name: 'Xóa bộ lọc tìm kiếm' });
    expect(clearBtn).toBeInTheDocument();

    // Click xóa bộ lọc
    fireEvent.click(clearBtn);

    expect(screen.getByPlaceholderText('Tìm kiếm công việc theo chức danh, từ khóa...')).toHaveValue('');
    expect(screen.getByLabelText('Lọc theo phòng ban')).toHaveValue('ALL');
    expect(screen.getByLabelText('Lọc theo địa điểm')).toHaveValue('ALL');
    expect(screen.getByLabelText('Lọc theo hình thức làm việc')).toHaveValue('ALL');
  });

  it('AC2: Hiển thị trạng thái lỗi (Error state) và nút Thử lại (Retry)', async () => {
    vi.mocked(jobPostingApi.listPublic).mockRejectedValueOnce(new Error('Network error'));

    render(
      <MemoryRouter>
        <PublicCareerPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Đã xảy ra lỗi khi tải danh sách việc làm')).toBeInTheDocument();
    expect(
      screen.getByText('Không thể tải danh sách việc làm. Vui lòng kiểm tra kết nối mạng và thử lại.')
    ).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: 'Thử lại' });
    expect(retryBtn).toBeInTheDocument();

    // Giả lập lần thử lại thành công
    vi.mocked(jobPostingApi.listPublic).mockResolvedValueOnce({
      content: mockJobs,
      totalElements: 2,
      totalPages: 1,
      size: 30,
      number: 0,
    });

    fireEvent.click(retryBtn);

    expect(await screen.findByText('Kỹ sư Backend Senior Java')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
