import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import JobPostingManagementPage from '../pages/JobPostingManagementPage';
import jobPostingApi from '../api/jobPosting';
import organizationApi from '../api/organization';
import { JobPosting } from '../types/jobPosting';

vi.mock('../api/jobPosting', () => ({
  default: {
    list: vi.fn(),
    getDetail: vi.fn(),
    create: vi.fn(),
    createFromRequisition: vi.fn(),
    update: vi.fn(),
    submitApproval: vi.fn(),
    approve: vi.fn(),
    publish: vi.fn(),
    approveAndPublish: vi.fn(),
    reject: vi.fn(),
    unpublish: vi.fn(),
    getAuditLogs: vi.fn(),
    listPublic: vi.fn(),
    getPublicDetail: vi.fn(),
  },
}));

vi.mock('../api/organization', () => ({
  default: {
    getDepartments: vi.fn(),
  },
}));

// Mock useAuth hook
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 10, email: 'hr_manager@company.com', fullName: 'HR Manager' },
    hasRole: (role: string) => role === 'HR_MANAGER',
    hasAnyRole: () => true,
    hasPermission: () => true,
  }),
}));

const mockDepartments = [
  { id: 1, name: 'Phòng Kỹ Thuật', code: 'TECH', active: true, employeeCount: 10, createdAt: '' },
  { id: 2, name: 'Phòng Tuyển Dụng', code: 'HR', active: true, employeeCount: 5, createdAt: '' },
];

const mockJobPostings: JobPosting[] = [
  {
    id: 101,
    jobCode: 'JP-2026-0001',
    title: 'Senior Java Backend Engineer',
    departmentId: 1,
    departmentName: 'Phòng Kỹ Thuật',
    jobTitleId: 10,
    jobTitleName: 'Senior Java Developer',
    workLocation: 'Hà Nội',
    workingModel: 'HYBRID',
    quantity: 2,
    jobDescription: 'Thiết kế và phát triển Microservices trên Spring Boot.',
    requirements: 'Tối thiểu 4 năm kinh nghiệm làm việc với Java và Spring.',
    benefits: 'Lương tháng 13, BHXH đầy đủ, thưởng dự án.',
    salaryMin: 25000000,
    salaryMax: 40000000,
    currency: 'VND',
    salaryVisible: true,
    applicationDeadline: '2026-12-31',
    status: 'PENDING_APPROVAL',
    createdByUserId: 20,
    createdByUserName: 'Le Recruiter',
    createdAt: '2026-10-10T08:00:00Z',
    updatedAt: '2026-10-10T08:00:00Z',
    auditLogs: [
      {
        id: 1,
        jobPostingId: 101,
        userId: 20,
        userName: 'Le Recruiter',
        userEmail: 'recruiter@company.com',
        action: 'SUBMIT_APPROVAL',
        fromStatus: 'DRAFT',
        toStatus: 'PENDING_APPROVAL',
        note: 'Gửi tin chờ duyệt',
        createdAt: '2026-10-10T08:00:00Z',
      },
    ],
  },
  {
    id: 102,
    jobCode: 'JP-2026-0002',
    title: 'Frontend React Developer',
    departmentId: 1,
    departmentName: 'Phòng Kỹ Thuật',
    jobTitleId: 11,
    jobTitleName: 'React Developer',
    workLocation: 'Hồ Chí Minh',
    workingModel: 'ONSITE',
    quantity: 1,
    jobDescription: 'Phát triển giao diện React Vite và tối ưu UX.',
    requirements: 'Kinh nghiệm với TypeScript và CSS hiện đại.',
    benefits: 'Phụ cấp ăn trưa, bảo hiểm cao cấp.',
    salaryMin: 18000000,
    salaryMax: 28000000,
    currency: 'VND',
    salaryVisible: true,
    applicationDeadline: '2026-11-30',
    status: 'PUBLISHED',
    publishedByUserId: 10,
    publishedByUserName: 'HR Manager',
    publishedAt: '2026-10-11T09:00:00Z',
    createdByUserId: 20,
    createdByUserName: 'Le Recruiter',
    createdAt: '2026-10-09T08:00:00Z',
    updatedAt: '2026-10-11T09:00:00Z',
    auditLogs: [],
  },
];

describe('JobPostingManagementPage (S3-10 / SCRUM-151 / SCRUM-149 / SCRUM-150)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(organizationApi.getDepartments).mockResolvedValue(mockDepartments as any);
    vi.mocked(jobPostingApi.list).mockResolvedValue({
      content: mockJobPostings,
      totalElements: 2,
      totalPages: 1,
      size: 10,
      number: 0,
    });
    vi.mocked(jobPostingApi.getDetail).mockImplementation(async (id: number) => {
      const found = mockJobPostings.find((p) => p.id === id);
      return found || mockJobPostings[0];
    });
  });

  it('TC01 - Hiển thị tiêu đề, thẻ thống kê và danh sách tin tuyển dụng', async () => {
    render(
      <MemoryRouter>
        <JobPostingManagementPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Quản lý & Duyệt tin tuyển dụng')).toBeInTheDocument();
    expect(screen.getByText('Tổng tin tuyển dụng')).toBeInTheDocument();
    expect(screen.getByText('Chờ HR Manager duyệt')).toBeInTheDocument();
    expect(screen.getByText('Đang xuất bản công khai')).toBeInTheDocument();

    // Kiểm tra danh sách bảng
    expect(await screen.findByText('Senior Java Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('JP-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Frontend React Developer')).toBeInTheDocument();
  });

  it('TC02 (SCRUM-151 AC1 & AC2) - Mở modal xem trước tin, hiển thị toàn bộ nội dung và bản xem trước công khai', async () => {
    render(
      <MemoryRouter>
        <JobPostingManagementPage />
      </MemoryRouter>
    );

    // Bấm nút "Xem trước & Duyệt" của tin đầu tiên
    const previewBtns = await screen.findAllByText('Xem trước & Duyệt');
    fireEvent.click(previewBtns[0]);

    // Modal hiển thị
    await waitFor(() => {
      expect(jobPostingApi.getDetail).toHaveBeenCalledWith(101);
    });

    // SCRUM-151 AC2: Bản xem trước giống trang công khai
    expect(await screen.findByText(/Bản xem trước giao diện công khai/i)).toBeInTheDocument();
    expect(screen.getByText('HỆ THỐNG TUYỂN DỤNG DOANH NGHIỆP')).toBeInTheDocument();
    expect(screen.getByText('Ứng tuyển ngay (Xem trước mẫu)')).toBeInTheDocument();

    // SCRUM-151 AC1: Hiển thị toàn bộ nội dung trước khi duyệt
    expect(screen.getByText('Mô tả công việc')).toBeInTheDocument();
    expect(screen.getByText(/Thiết kế và phát triển Microservices/i)).toBeInTheDocument();
    expect(screen.getByText('Yêu cầu ứng viên')).toBeInTheDocument();
    expect(screen.getByText(/Tối thiểu 4 năm kinh nghiệm làm việc với Java/i)).toBeInTheDocument();
    expect(screen.getByText('Quyền lợi & Chế độ đãi ngộ')).toBeInTheDocument();
    expect(screen.getByText(/Lương tháng 13, BHXH đầy đủ/i)).toBeInTheDocument();
  });

  it('TC03 (SCRUM-151 AC3 & SCRUM-149) - Phê duyệt tin thành công và hiển thị thông báo rõ ràng', async () => {
    vi.mocked(jobPostingApi.approve).mockResolvedValue({
      ...mockJobPostings[0],
      status: 'APPROVED',
      approvedByUserId: 10,
      approvedAt: new Date().toISOString(),
    });

    render(
      <MemoryRouter>
        <JobPostingManagementPage />
      </MemoryRouter>
    );

    // Mở modal
    const previewBtns = await screen.findAllByText('Xem trước & Duyệt');
    fireEvent.click(previewBtns[0]);

    // Bấm nút "Phê duyệt"
    const approveBtn = await screen.findByText('Phê duyệt');
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(jobPostingApi.approve).toHaveBeenCalledWith(101, undefined);
    });

    // Thông báo rõ kết quả duyệt thành công
    expect(
      await screen.findByText(/Phê duyệt tin tuyển dụng thành công! Tin đã đủ điều kiện để xuất bản/i)
    ).toBeInTheDocument();
  });

  it('TC04 (SCRUM-149) - Duyệt & Xuất bản tin thành công trong 1 bước', async () => {
    vi.mocked(jobPostingApi.approveAndPublish).mockResolvedValue({
      ...mockJobPostings[0],
      status: 'PUBLISHED',
      publishedByUserId: 10,
      publishedAt: new Date().toISOString(),
    });

    render(
      <MemoryRouter>
        <JobPostingManagementPage />
      </MemoryRouter>
    );

    const previewBtns = await screen.findAllByText('Xem trước & Duyệt');
    fireEvent.click(previewBtns[0]);

    const approveAndPubBtn = await screen.findByText('Duyệt & Xuất bản');
    fireEvent.click(approveAndPubBtn);

    await waitFor(() => {
      expect(jobPostingApi.approveAndPublish).toHaveBeenCalledWith(101, undefined);
    });

    expect(
      await screen.findByText(/Duyệt và xuất bản tin tuyển dụng thành công! Tin hiện đã công khai/i)
    ).toBeInTheDocument();
  });

  it('TC05 (SCRUM-149 & 151) - Từ chối duyệt tin tuyển dụng kèm lý do', async () => {
    vi.mocked(jobPostingApi.reject).mockResolvedValue({
      ...mockJobPostings[0],
      status: 'REJECTED',
    });

    render(
      <MemoryRouter>
        <JobPostingManagementPage />
      </MemoryRouter>
    );

    const previewBtns = await screen.findAllByText('Xem trước & Duyệt');
    fireEvent.click(previewBtns[0]);

    // Bấm nút mở form từ chối
    const rejectBtn = await screen.findByText('Từ chối duyệt');
    fireEvent.click(rejectBtn);

    // Nhập lý do từ chối
    const textarea = screen.getByPlaceholderText(/Ví dụ: Cần điều chỉnh lại yêu cầu bằng cấp/i);
    fireEvent.change(textarea, { target: { value: 'Chưa đạt chuẩn thương hiệu của phòng ban' } });

    // Xác nhận từ chối
    const confirmRejectBtn = screen.getByText('Xác nhận Từ chối');
    fireEvent.click(confirmRejectBtn);

    await waitFor(() => {
      expect(jobPostingApi.reject).toHaveBeenCalledWith(101, 'Chưa đạt chuẩn thương hiệu của phòng ban');
    });

    expect(
      await screen.findByText(/Đã từ chối duyệt tin tuyển dụng/i)
    ).toBeInTheDocument();
  });

  it('TC06 (SCRUM-150) - Xem nhật ký kiểm toán trong modal', async () => {
    render(
      <MemoryRouter>
        <JobPostingManagementPage />
      </MemoryRouter>
    );

    const previewBtns = await screen.findAllByText('Xem trước & Duyệt');
    fireEvent.click(previewBtns[0]);

    // Chuyển sang Tab Nhật ký duyệt & xuất bản
    const auditTabBtn = await screen.findByText(/Nhật ký duyệt & xuất bản/i);
    fireEvent.click(auditTabBtn);

    // Kiểm tra hiển thị log
    expect(await screen.findByText('Nộp chờ duyệt')).toBeInTheDocument();
    expect(screen.getByText(/Le Recruiter/i)).toBeInTheDocument();
    expect(screen.getByText(/Gửi tin chờ duyệt/i)).toBeInTheDocument();
  });
});
