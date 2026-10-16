import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApprovalTimelineModal } from '../components/requisition/ApprovalTimelineModal';
import { approvalApi } from '../api/approval';
import { RequisitionApprovalTimeline } from '../types/approval';

vi.mock('../api/approval');

const mockTimelineData: RequisitionApprovalTimeline = {
  requisitionId: 101,
  requisitionCode: 'REQ-2026-0001',
  title: 'Tuyển dụng Kỹ sư Phần mềm',
  status: 'PENDING_APPROVAL',
  currentStepOrder: 2,
  currentWaitingOn: 'Trần Trưởng Phòng (Hiring Manager)',
  totalSteps: 4,
  completedSteps: 1,
  isCompleted: false,
  isRejected: false,
  submittedAt: '2026-10-12T08:00:00Z',
  steps: [
    {
      stepOrder: 1,
      stepName: 'Khởi tạo & Đề xuất tuyển dụng',
      approverId: 10,
      approverName: 'Nguyễn Khởi Tạo',
      approverEmail: 'creator@example.com',
      approverRole: 'HIRING_MANAGER',
      action: 'SUBMIT',
      status: 'COMPLETED',
      actionAt: '2026-10-12T08:00:00Z',
      comments: 'Đã nộp yêu cầu tuyển dụng chính thức',
      isCurrentStep: false,
    },
    {
      stepOrder: 2,
      stepName: 'Trưởng bộ phận duyệt chuyên môn',
      approverId: 20,
      approverName: 'Trần Trưởng Phòng',
      approverEmail: 'deptmgr@example.com',
      approverRole: 'HIRING_MANAGER',
      action: 'PENDING',
      status: 'PENDING',
      comments: undefined,
      isCurrentStep: true,
    },
    {
      stepOrder: 3,
      stepName: 'Phòng Nhân sự thẩm định định biên & khung lương',
      approverRole: 'HR_MANAGER',
      action: 'NOT_STARTED',
      status: 'UPCOMING',
      isCurrentStep: false,
    },
    {
      stepOrder: 4,
      stepName: 'Ban Giám đốc phê duyệt chính thức',
      approverRole: 'APPROVER',
      action: 'NOT_STARTED',
      status: 'UPCOMING',
      isCurrentStep: false,
    },
  ],
};

describe('ApprovalTimelineModal Component (S3-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ApprovalTimelineModal
        requisitionId={101}
        isOpen={false}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('loads and displays approval timeline with current waiting desk and steps', async () => {
    vi.mocked(approvalApi.getTimeline).mockResolvedValueOnce(mockTimelineData);

    render(
      <ApprovalTimelineModal
        requisitionId={101}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    // Initial loading indicator
    expect(screen.getByText(/Đang tải dòng thời gian phê duyệt/i)).toBeInTheDocument();

    // After loading
    await waitFor(() => {
      expect(screen.getByText('REQ-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('Tuyển dụng Kỹ sư Phần mềm')).toBeInTheDocument();
    });

    // Check prominent waiting desk callout banner
    expect(screen.getByText(/Hồ sơ đang chờ xử lý/i)).toBeInTheDocument();
    expect(screen.getByText(/Trần Trưởng Phòng \(Hiring Manager\)/i)).toBeInTheDocument();

    // Check steps rendered
    expect(screen.getByText(/Bước 1: Khởi tạo & Đề xuất tuyển dụng/i)).toBeInTheDocument();
    expect(screen.getByText(/Bước 2: Trưởng bộ phận duyệt chuyên môn/i)).toBeInTheDocument();
    expect(screen.getByText(/Bước 3: Phòng Nhân sự thẩm định định biên & khung lương/i)).toBeInTheDocument();
    expect(screen.getByText(/Bước 4: Ban Giám đốc phê duyệt chính thức/i)).toBeInTheDocument();

    // Check status badges
    expect(screen.getByText('ĐÃ DUYỆT')).toBeInTheDocument();
    expect(screen.getByText('ĐANG CHỜ DUYỆT')).toBeInTheDocument();
    expect(screen.getAllByText('CHƯA TỚI LƯỢT')).toHaveLength(2);

    // Check immutable audit trail notice
    expect(screen.getByText(/Nhật ký phê duyệt bất biến/i)).toBeInTheDocument();
  });

  it('displays access denied when unauthorized user receives 403', async () => {
    vi.mocked(approvalApi.getTimeline).mockRejectedValueOnce({
      response: { status: 403, data: { message: 'Forbidden' } },
    });

    render(
      <ApprovalTimelineModal
        requisitionId={101}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Truy cập bị từ chối/i)).toBeInTheDocument();
      expect(screen.getByText(/Bạn không có quyền xem lịch sử phê duyệt/i)).toBeInTheDocument();
    });
  });

  it('allows approver to submit approval comment when canApprove is true', async () => {
    vi.mocked(approvalApi.getTimeline).mockResolvedValueOnce(mockTimelineData);
    const updatedMock = {
      ...mockTimelineData,
      completedSteps: 2,
      steps: [
        mockTimelineData.steps[0],
        {
          ...mockTimelineData.steps[1],
          status: 'COMPLETED' as const,
          action: 'APPROVE' as const,
          comments: 'Đồng ý duyệt chuyên môn',
          isCurrentStep: false,
        },
        {
          ...mockTimelineData.steps[2],
          status: 'PENDING' as const,
          isCurrentStep: true,
        },
        mockTimelineData.steps[3],
      ],
    };
    vi.mocked(approvalApi.approve).mockResolvedValueOnce(updatedMock);

    const onStatusChange = vi.fn();
    render(
      <ApprovalTimelineModal
        requisitionId={101}
        isOpen={true}
        onClose={vi.fn()}
        canApprove={true}
        onStatusChange={onStatusChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Thao tác phê duyệt tại bước hiện tại/i)).toBeInTheDocument();
    });

    const commentInput = screen.getByPlaceholderText(/Nhập ý kiến, ghi chú phê duyệt/i);
    fireEvent.change(commentInput, { target: { value: 'Đồng ý duyệt chuyên môn' } });

    const approveBtn = screen.getByTitle('Phê duyệt chuyển bước tiếp theo');
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(approvalApi.approve).toHaveBeenCalledWith(101, 'Đồng ý duyệt chuyên môn');
      expect(onStatusChange).toHaveBeenCalled();
    });
  });

  it('allows approver to request changes with mandatory comments (S3-02)', async () => {
    vi.mocked(approvalApi.getTimeline).mockResolvedValueOnce(mockTimelineData);
    const updatedMock = {
      ...mockTimelineData,
      status: 'DRAFT',
      steps: [
        mockTimelineData.steps[0],
        {
          ...mockTimelineData.steps[1],
          status: 'REQUEST_CHANGES' as const,
          action: 'REQUEST_CHANGES' as const,
          comments: 'Cần bổ sung JD chi tiết và mức kinh nghiệm tối thiểu',
          isCurrentStep: false,
        },
        mockTimelineData.steps[2],
        mockTimelineData.steps[3],
      ],
    };
    vi.mocked(approvalApi.requestChanges).mockResolvedValueOnce(updatedMock);

    const onStatusChange = vi.fn();
    render(
      <ApprovalTimelineModal
        requisitionId={101}
        isOpen={true}
        onClose={vi.fn()}
        canApprove={true}
        onStatusChange={onStatusChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Thao tác phê duyệt tại bước hiện tại/i)).toBeInTheDocument();
    });

    const requestChangesBtn = screen.getByTitle(/Yêu cầu bổ sung thông tin/i);
    fireEvent.click(requestChangesBtn);
    expect(screen.getByText(/Vui lòng nhập nội dung yêu cầu bổ sung/i)).toBeInTheDocument();

    const commentInput = screen.getByPlaceholderText(/Nhập ý kiến, ghi chú phê duyệt hoặc lý do từ chối/i);
    fireEvent.change(commentInput, { target: { value: 'Cần bổ sung JD chi tiết và mức kinh nghiệm tối thiểu' } });

    fireEvent.click(requestChangesBtn);

    await waitFor(() => {
      expect(approvalApi.requestChanges).toHaveBeenCalledWith(101, 'Cần bổ sung JD chi tiết và mức kinh nghiệm tối thiểu');
      expect(onStatusChange).toHaveBeenCalled();
    });
  });

  it('calls onClose when close button is clicked', async () => {
    vi.mocked(approvalApi.getTimeline).mockResolvedValueOnce(mockTimelineData);
    const onClose = vi.fn();

    render(
      <ApprovalTimelineModal
        requisitionId={101}
        isOpen={true}
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('REQ-2026-0001')).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole('button', { name: 'Đóng' });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
