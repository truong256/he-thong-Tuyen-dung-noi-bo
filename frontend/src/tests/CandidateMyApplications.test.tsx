import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import CandidateMyApplications from '../components/candidate/CandidateMyApplications';
import withdrawalApi from '../api/withdrawal';

vi.mock('../api/withdrawal', () => ({
  default: {
    getMyApplications: vi.fn(),
    withdrawByCandidate: vi.fn(),
  },
}));

const mockApplications = [
  {
    id: 1,
    requisitionId: 10,
    positionTitle: 'Kỹ sư Phần mềm Senior Java',
    requisitionCode: 'REQ-202610-0001',
    fullName: 'Ứng viên Nguyễn Văn A',
    email: 'candidate@company.com',
    stage: 'SCREENING',
    withdrawn: false,
  },
  {
    id: 2,
    requisitionId: 11,
    positionTitle: 'Frontend Engineer',
    requisitionCode: 'REQ-202610-0002',
    fullName: 'Ứng viên Nguyễn Văn A',
    email: 'candidate@company.com',
    stage: 'WITHDRAWN',
    withdrawn: true,
    withdrawnAt: '2026-10-19T10:00:00Z',
    withdrawalReason: 'Đã nhận việc nơi khác',
  },
];

describe('S4-06: CandidateMyApplications Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Hiển thị danh sách hồ sơ ứng tuyển của ứng viên', async () => {
    vi.mocked(withdrawalApi.getMyApplications).mockResolvedValueOnce(mockApplications as any);

    render(
      <BrowserRouter>
        <CandidateMyApplications />
      </BrowserRouter>
    );

    expect(screen.getByText('Đang tải danh sách hồ sơ ứng tuyển của bạn...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Hồ sơ ứng tuyển của tôi')).toBeInTheDocument();
      expect(screen.getByText('Kỹ sư Phần mềm Senior Java')).toBeInTheDocument();
      expect(screen.getByText('REQ-202610-0001')).toBeInTheDocument();
      expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    });

    // Check badges
    expect(screen.getByText('Đang sàng lọc')).toBeInTheDocument();
    expect(screen.getByText('Ứng viên đã rút')).toBeInTheDocument();
  });

  it('2. Mở modal xác nhận khi bấm Rút hồ sơ và hủy bỏ không làm thay đổi trạng thái', async () => {
    vi.mocked(withdrawalApi.getMyApplications).mockResolvedValueOnce(mockApplications as any);

    render(
      <BrowserRouter>
        <CandidateMyApplications />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Rút hồ sơ/i })).toBeInTheDocument();
    });

    // Click Rút hồ sơ
    fireEvent.click(screen.getByRole('button', { name: /Rút hồ sơ/i }));

    // Check modal content
    expect(screen.getByText('Xác nhận rút hồ sơ ứng tuyển')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Tôi đã nhận lời mời làm việc tại nơi khác/i)).toBeInTheDocument();

    // Click Hủy bỏ
    fireEvent.click(screen.getByRole('button', { name: /Hủy bỏ/i }));

    // Modal closed
    await waitFor(() => {
      expect(screen.queryByText('Xác nhận rút hồ sơ ứng tuyển')).not.toBeInTheDocument();
    });
  });

  it('3. Xác nhận rút hồ sơ thành công và cập nhật giao diện', async () => {
    vi.mocked(withdrawalApi.getMyApplications).mockResolvedValueOnce([mockApplications[0]] as any);
    vi.mocked(withdrawalApi.withdrawByCandidate).mockResolvedValueOnce({
      success: true,
      message: 'Rút hồ sơ thành công',
      applicationId: 1,
      stage: 'WITHDRAWN',
    });

    render(
      <BrowserRouter>
        <CandidateMyApplications />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Rút hồ sơ/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Rút hồ sơ/i }));

    const reasonInput = screen.getByPlaceholderText(/Tôi đã nhận lời mời làm việc tại nơi khác/i);
    fireEvent.change(reasonInput, { target: { value: 'Tìm được cơ hội mới phù hợp hơn' } });

    fireEvent.click(screen.getByRole('button', { name: /Xác nhận rút hồ sơ/i }));

    await waitFor(() => {
      expect(withdrawalApi.withdrawByCandidate).toHaveBeenCalledWith(1, 'Tìm được cơ hội mới phù hợp hơn');
      expect(screen.getByText(/Đã rút hồ sơ ứng tuyển vị trí "Kỹ sư Phần mềm Senior Java" thành công/i)).toBeInTheDocument();
    });
  });
});
