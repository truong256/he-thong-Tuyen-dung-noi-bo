import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PublicJobDetailPage from '../pages/PublicJobDetailPage';
import jobPostingApi from '../api/jobPosting';
import { JobPostingPublic } from '../types/jobPosting';

vi.mock('../api/jobPosting', () => ({
  default: {
    getPublicDetail: vi.fn(),
    applyPublic: vi.fn(),
  },
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
  })),
}));

const mockActiveJob: JobPostingPublic = {
  id: 10,
  jobCode: 'JP-2026-ACTIVE',
  title: 'Kỹ sư Phần mềm Senior Java',
  departmentId: 1,
  departmentName: 'Phòng Phát Triển Phần Mềm',
  workLocation: 'Hà Nội - Trụ sở chính',
  workingModel: 'HYBRID',
  quantity: 2,
  jobDescription: 'Phát triển các module hệ thống tuyển dụng nội bộ quy mô lớn.',
  requirements: 'Tối thiểu 3 năm kinh nghiệm Java Spring Boot, hiểu sâu SQL.',
  benefits: 'Lương thưởng cạnh tranh, bảo hiểm sức khỏe PTI, du lịch hàng năm.',
  salaryVisible: true,
  salaryDisplay: '25,000,000 - 40,000,000 VND',
  applicationDeadline: '2026-11-30',
  publishedAt: '2026-10-01T08:00:00Z',
  expired: false,
  canApply: true,
  status: 'PUBLISHED',
};

const mockExpiredJob: JobPostingPublic = {
  id: 20,
  jobCode: 'JP-2026-EXPIRED',
  title: 'Chuyên viên Tuyển dụng (Hết hạn)',
  departmentId: 2,
  departmentName: 'Phòng Nhân Sự',
  workLocation: 'TP. Hồ Chí Minh',
  workingModel: 'ONSITE',
  quantity: 1,
  jobDescription: 'Lọc hồ sơ và điều phối lịch phỏng vấn.',
  requirements: 'Kinh nghiệm tuyển dụng 1 năm trở lên.',
  benefits: 'Chế độ đãi ngộ tốt.',
  salaryVisible: false,
  salaryDisplay: 'Thỏa thuận',
  applicationDeadline: '2026-10-10',
  publishedAt: '2026-09-01T08:00:00Z',
  expired: true,
  canApply: false,
  status: 'EXPIRED',
  expiredMessage: 'Tin tuyển dụng này đã hết hạn nhận hồ sơ.',
};

const renderWithRouter = (initialRoute: string) => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/careers/:id" element={<PublicJobDetailPage />} />
        <Route path="/careers" element={<div data-testid="careers-list-page">Trang danh sách việc làm</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('S4-02 / SCRUM-155 / SCRUM-167: Xem chi tiết tin tuyển dụng và nộp hồ sơ responsive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC1: Hiển thị đầy đủ bốn nhóm thông tin (mô tả công việc, yêu cầu, quyền lợi, hạn nộp)', async () => {
    vi.mocked(jobPostingApi.getPublicDetail).mockResolvedValue(mockActiveJob);

    renderWithRouter('/careers/10');

    // Chờ tải dữ liệu hoàn tất
    expect(await screen.findByRole('heading', { name: 'Kỹ sư Phần mềm Senior Java' })).toBeInTheDocument();

    // 1. Nhóm Mô tả công việc
    expect(screen.getByRole('heading', { name: 'Mô tả công việc' })).toBeInTheDocument();
    expect(screen.getByText('Phát triển các module hệ thống tuyển dụng nội bộ quy mô lớn.')).toBeInTheDocument();

    // 2. Nhóm Yêu cầu công việc
    expect(screen.getByRole('heading', { name: 'Yêu cầu công việc' })).toBeInTheDocument();
    expect(screen.getByText('Tối thiểu 3 năm kinh nghiệm Java Spring Boot, hiểu sâu SQL.')).toBeInTheDocument();

    // 3. Nhóm Quyền lợi & Đãi ngộ
    expect(screen.getByRole('heading', { name: 'Quyền lợi & Đãi ngộ' })).toBeInTheDocument();
    expect(screen.getByText('Lương thưởng cạnh tranh, bảo hiểm sức khỏe PTI, du lịch hàng năm.')).toBeInTheDocument();

    // 4. Nhóm Hạn nộp hồ sơ
    expect(screen.getByRole('heading', { name: 'Hạn nộp & Ứng tuyển' })).toBeInTheDocument();
    expect(screen.getAllByText('2026-11-30').length).toBeGreaterThan(0);

    // Mức lương hiển thị
    expect(screen.getAllByText('25,000,000 - 40,000,000 VND').length).toBeGreaterThan(0);
  });

  it('AC2: Nút ứng tuyển nổi bật trong sidebar và thanh thao tác nhanh trên mobile, cuộn tới biểu mẫu', async () => {
    vi.mocked(jobPostingApi.getPublicDetail).mockResolvedValue(mockActiveJob);

    // Giả lập scrollIntoView trong jsdom
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    renderWithRouter('/careers/10');

    expect(await screen.findByRole('heading', { name: 'Kỹ sư Phần mềm Senior Java' })).toBeInTheDocument();

    // Cả nút ứng tuyển ở sidebar và nút ở mobile bar đều xuất hiện
    const applyButtons = screen.getAllByRole('button', { name: /Ứng tuyển ngay/i });
    expect(applyButtons.length).toBeGreaterThanOrEqual(2);

    fireEvent.click(applyButtons[0]);
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it('AC3: Tin đã hết hạn hiển thị thông báo thay vì biểu mẫu ứng tuyển', async () => {
    vi.mocked(jobPostingApi.getPublicDetail).mockResolvedValue(mockExpiredJob);

    renderWithRouter('/careers/20');

    // Chờ tải xong tin hết hạn
    expect(await screen.findByRole('heading', { name: 'Chuyên viên Tuyển dụng (Hết hạn)' })).toBeInTheDocument();

    // Vẫn hiển thị 4 nhóm thông tin
    expect(screen.getByRole('heading', { name: 'Mô tả công việc' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Yêu cầu công việc' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Quyền lợi & Đãi ngộ' })).toBeInTheDocument();
    expect(screen.getAllByText('2026-10-10').length).toBeGreaterThan(0);

    // Hiển thị thông báo hết hạn
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Tin tuyển dụng này đã hết hạn nhận hồ sơ/i)).toBeInTheDocument();
    expect(screen.getByText(/Khám phá các việc làm đang mở khác/i)).toBeInTheDocument();

    // Biểu mẫu ứng tuyển KHÔNG được hiển thị
    expect(screen.queryByLabelText(/Họ và tên/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Địa chỉ Email/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Nộp hồ sơ ứng tuyển$/i })).not.toBeInTheDocument();

    // Nút ứng tuyển trên sidebar được thay thế bằng thông báo hết hạn
    expect(screen.getByText(/Vị trí này đã dừng nhận hồ sơ/i)).toBeInTheDocument();
  });

  it('Cho phép điền và gửi đơn ứng tuyển trực tuyến thành công', async () => {
    vi.mocked(jobPostingApi.getPublicDetail).mockResolvedValue(mockActiveJob);
    vi.mocked(jobPostingApi.applyPublic).mockResolvedValue({
      applicationId: 88,
      jobPostingId: 10,
      jobCode: 'JP-2026-ACTIVE',
      title: 'Kỹ sư Phần mềm Senior Java',
      fullName: 'Trần Văn Test',
      email: 'tran.test@example.com',
      status: 'APPLIED',
      message: 'Nộp hồ sơ ứng tuyển thành công!',
    });

    renderWithRouter('/careers/10');

    expect(await screen.findByRole('heading', { name: 'Kỹ sư Phần mềm Senior Java' })).toBeInTheDocument();

    // Nhập thông tin biểu mẫu
    fireEvent.change(screen.getByLabelText(/Họ và tên/i), { target: { value: 'Trần Văn Test' } });
    fireEvent.change(screen.getByLabelText(/Địa chỉ Email/i), { target: { value: 'tran.test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Số điện thoại/i), { target: { value: '0987654321' } });
    fireEvent.change(screen.getByLabelText(/Thư giới thiệu/i), { target: { value: 'Rất mong muốn gia nhập công ty.' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Nộp hồ sơ ứng tuyển/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(jobPostingApi.applyPublic).toHaveBeenCalledWith(10, {
        fullName: 'Trần Văn Test',
        email: 'tran.test@example.com',
        phone: '0987654321',
        coverLetter: 'Rất mong muốn gia nhập công ty.',
        cvFileUrl: undefined,
      });
    });

    // Thông báo thành công xuất hiện
    expect(await screen.findByText(/Nộp hồ sơ ứng tuyển thành công!/i)).toBeInTheDocument();
  });

  it('Bắt lỗi validation khi gửi biểu mẫu mà chưa điền các trường bắt buộc', async () => {
    vi.mocked(jobPostingApi.getPublicDetail).mockResolvedValue(mockActiveJob);

    renderWithRouter('/careers/10');

    expect(await screen.findByRole('heading', { name: 'Kỹ sư Phần mềm Senior Java' })).toBeInTheDocument();

    // Bấm nộp khi chưa nhập họ tên
    const submitBtn = screen.getByRole('button', { name: /Nộp hồ sơ ứng tuyển/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Vui lòng nhập họ và tên của bạn/i)).toBeInTheDocument();
    expect(jobPostingApi.applyPublic).not.toHaveBeenCalled();
  });

  it('Xử lý lỗi tải dữ liệu rõ ràng khi tin không tồn tại hoặc đã bị gỡ', async () => {
    vi.mocked(jobPostingApi.getPublicDetail).mockRejectedValue({
      response: { data: { message: 'Tin tuyển dụng không tồn tại hoặc đã được gỡ xuống.' } },
    });

    renderWithRouter('/careers/999');

    expect(await screen.findByRole('heading', { name: 'Tin tuyển dụng không khả dụng' })).toBeInTheDocument();
    expect(screen.getByText('Tin tuyển dụng không tồn tại hoặc đã được gỡ xuống.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xem các việc làm đang mở khác/i })).toBeInTheDocument();
  });
});
