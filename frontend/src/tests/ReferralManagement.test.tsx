import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReferralManagementPage from '../pages/ReferralManagementPage';
import referralApi from '../api/referral';
import { Referral } from '../types/referral';

vi.mock('../api/referral', () => ({
  default: {
    submit: vi.fn(),
    getMyReferrals: vi.fn(),
    getAllReferrals: vi.fn(),
    getDetail: vi.fn(),
    updateGeneralStatus: vi.fn(),
    getActivePositions: vi.fn(),
  },
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 100, email: 'interviewer@company.com', fullName: 'Nguyễn Kỹ Thuật' },
    hasRole: (role: string) => role === 'INTERVIEWER',
    hasAnyRole: (roles: string[]) => roles.includes('INTERVIEWER'),
    hasPermission: () => false,
  }),
}));

const mockReferrals: Referral[] = [
  {
    id: 1,
    candidateApplicationId: 10,
    jobPostingId: 50,
    jobPostingCode: 'JP-2026-0001',
    jobTitle: 'Senior Java Backend Engineer',
    departmentId: 1,
    departmentName: 'Phòng Kỹ Thuật',
    candidateName: 'Trần Văn Ứng Viên',
    candidateEmail: 'ungvien@gmail.com',
    candidatePhone: '0901234567',
    relationship: 'Đồng nghiệp cũ',
    referralNotes: 'Kỹ năng backend vững, tư duy tốt.',
    referrerUserId: 100,
    referrerName: 'Nguyễn Kỹ Thuật',
    referrerEmail: 'interviewer@company.com',
    source: 'INTERNAL_REFERRAL',
    generalStatus: 'SUBMITTED',
    generalStatusLabel: 'Đã tiếp nhận hồ sơ',
    createdAt: '2026-10-19T10:00:00Z',
    updatedAt: '2026-10-19T10:00:00Z',
  },
  {
    id: 2,
    candidateApplicationId: 11,
    jobPostingId: 51,
    jobPostingCode: 'JP-2026-0002',
    jobTitle: 'Frontend React Developer',
    departmentId: 1,
    departmentName: 'Phòng Kỹ Thuật',
    candidateName: 'Lê Thị Thu',
    candidateEmail: 'lethu@gmail.com',
    relationship: 'Bạn đại học',
    referralNotes: 'Chuyên làm React, TypeScript.',
    referrerUserId: 100,
    referrerName: 'Nguyễn Kỹ Thuật',
    source: 'INTERNAL_REFERRAL',
    generalStatus: 'INTERVIEW',
    generalStatusLabel: 'Đang phỏng vấn',
    createdAt: '2026-10-18T09:00:00Z',
    updatedAt: '2026-10-19T11:00:00Z',
  },
];

describe('ReferralManagementPage (S4-07 / SCRUM-185)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(referralApi.getMyReferrals).mockResolvedValue({
      content: mockReferrals,
      totalElements: 2,
      totalPages: 1,
      size: 10,
      number: 0,
    });
    vi.mocked(referralApi.getActivePositions).mockResolvedValue([
      {
        jobPostingId: 50,
        title: 'Senior Java Backend Engineer',
        jobCode: 'JP-2026-0001',
        departmentName: 'Phòng Kỹ Thuật',
      },
    ]);
  });

  it('Hiển thị tiêu đề và các thẻ thống kê tổng quan', async () => {
    render(
      <MemoryRouter>
        <ReferralManagementPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Giới thiệu ứng viên nội bộ')).toBeInTheDocument();
    expect(screen.getByText('Giới thiệu ứng viên ngay')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Trần Văn Ứng Viên')).toBeInTheDocument();
      expect(screen.getByText('Lê Thị Thu')).toBeInTheDocument();
    });
  });

  it('Gắn nhãn nguồn "Giới thiệu nội bộ" trên từng hồ sơ', async () => {
    render(
      <MemoryRouter>
        <ReferralManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      const sourceBadges = screen.getAllByText('Giới thiệu nội bộ');
      expect(sourceBadges.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('Hiển thị đúng trạng thái ở mức tổng quát', async () => {
    render(
      <MemoryRouter>
        <ReferralManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Đã tiếp nhận hồ sơ')).toBeInTheDocument();
      expect(screen.getByText('Đang phỏng vấn')).toBeInTheDocument();
    });
  });

  it('Mở biểu mẫu giới thiệu ứng viên khi bấm nút "Giới thiệu ứng viên ngay"', async () => {
    render(
      <MemoryRouter>
        <ReferralManagementPage />
      </MemoryRouter>
    );

    const createBtn = screen.getByText('Giới thiệu ứng viên ngay');
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByLabelText(/Họ và tên ứng viên/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email ứng viên/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Ghi chú giới thiệu/i)).toBeInTheDocument();
    });
  });

  it('Mở modal xem chi tiết hồ sơ khi bấm nút "Chi tiết"', async () => {
    render(
      <MemoryRouter>
        <ReferralManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Trần Văn Ứng Viên')).toBeInTheDocument();
    });

    const detailButtons = screen.getAllByText('Chi tiết');
    fireEvent.click(detailButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Chi tiết hồ sơ giới thiệu #1/i)).toBeInTheDocument();
      expect(screen.getByText('Tiến trình xử lý hồ sơ (Tổng quát)')).toBeInTheDocument();
      expect(screen.getByText('Kỹ năng backend vững, tư duy tốt.')).toBeInTheDocument();
    });
  });
});
