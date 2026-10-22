import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CandidateUnifiedProfilePage from '../pages/CandidateUnifiedProfilePage';
import candidateApi, { CandidateUnifiedProfile } from '../api/candidate';

vi.mock('../api/candidate', () => ({
  default: {
    getUnifiedProfile: vi.fn(),
    getCvBlob: vi.fn(),
    addNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    addTag: vi.fn(),
    deleteTag: vi.fn(),
    uploadCv: vi.fn(),
  },
}));

// Mock window.confirm
vi.stubGlobal('confirm', vi.fn(() => true));

const mockProfile: CandidateUnifiedProfile = {
  id: 101,
  candidateUserId: 50,
  fullName: 'Nguyen Thi Mai',
  email: 'mai.nguyen@test.com',
  phone: '0912345678',
  avatarUrl: null,

  currentRequisitionId: 1,
  currentPositionTitle: 'Lead Product Designer',
  currentRequisitionCode: 'REQ-DES-001',
  currentDepartmentName: 'Khối Thiết Kế Sản Phẩm',
  currentStage: 'INTERVIEW',
  appliedAt: '2026-10-15T08:00:00Z',
  coverLetter: 'Tôi có hơn 5 năm kinh nghiệm thiết kế UI/UX...',
  withdrawn: false,
  withdrawnAt: null,
  withdrawalReason: null,
  rejectionReason: null,

  cvFileUrl: '/api/candidates/101/cv',
  cvFileName: 'Mai_Nguyen_CV.pdf',
  cvFileSize: 102400,
  cvContentType: 'application/pdf',

  applicationHistory: [
    {
      applicationId: 101,
      requisitionId: 1,
      positionTitle: 'Lead Product Designer',
      requisitionCode: 'REQ-DES-001',
      departmentName: 'Khối Thiết Kế Sản Phẩm',
      stage: 'INTERVIEW',
      appliedAt: '2026-10-15T08:00:00Z',
      cvFileUrl: '/api/candidates/101/cv',
      cvFileName: 'Mai_Nguyen_CV.pdf',
      current: true,
      withdrawn: false,
    },
    {
      applicationId: 92,
      requisitionId: 4,
      positionTitle: 'Senior UX Researcher',
      requisitionCode: 'REQ-RES-004',
      departmentName: 'Khối Nghiên Cứu',
      stage: 'APPLIED',
      appliedAt: '2026-09-10T14:30:00Z',
      cvFileUrl: null,
      cvFileName: null,
      current: false,
      withdrawn: false,
    },
  ],

  tags: [
    {
      id: 1,
      applicationId: 101,
      tagName: 'Figma Pro',
      createdByUserId: 10,
      createdByName: 'Recruiter Mai',
      createdAt: '2026-10-16T09:00:00Z',
    },
  ],

  notes: [
    {
      id: 1,
      applicationId: 101,
      authorId: 10,
      authorName: 'Recruiter Mai',
      content: 'Portfolio rất ấn tượng, kỹ năng phỏng vấn tốt.',
      createdAt: '2026-10-16T09:15:00Z',
      updatedAt: null,
      canEdit: true,
      canDelete: true,
    },
  ],

  permissions: {
    canView: true,
    canEditStage: true,
    canManageTags: true,
    canAddNotes: true,
    canDeleteNotes: true,
    canViewCv: true,
    canUploadCv: true,
  },
};

describe('S4-09: CandidateUnifiedProfilePage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    // Mock blob and URL
    vi.mocked(candidateApi.getCvBlob).mockResolvedValue({
      blob: new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }),
      fileName: 'Mai_Nguyen_CV.pdf',
    });
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:http://localhost:3000/mock-cv-uuid'),
      revokeObjectURL: vi.fn(),
    });
  });

  const renderComponent = (id = '101') => {
    return render(
      <MemoryRouter initialEntries={[`/recruitment/candidates/${id}/profile`]}>
        <Routes>
          <Route
            path="/recruitment/candidates/:id/profile"
            element={<CandidateUnifiedProfilePage />}
          />
        </Routes>
      </MemoryRouter>
    );
  };

  it('1. Hiển thị thông tin cá nhân và đơn ứng tuyển hợp nhất của ứng viên', async () => {
    vi.mocked(candidateApi.getUnifiedProfile).mockResolvedValueOnce(mockProfile);

    renderComponent();

    expect(screen.getByText('Đang tải hồ sơ hợp nhất...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Nguyen Thi Mai' })).toBeInTheDocument();
      expect(screen.getAllByText('mai.nguyen@test.com').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/0912345678/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Lead Product Designer/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Phỏng vấn').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('2. Hiển thị lịch sử ứng tuyển hợp nhất với đánh dấu vị trí hiện tại', async () => {
    vi.mocked(candidateApi.getUnifiedProfile).mockResolvedValueOnce(mockProfile);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Lịch sử ứng tuyển hợp nhất/)).toBeInTheDocument();
      expect(screen.getByText('Hồ sơ hiện tại')).toBeInTheDocument();
      expect(screen.getByText('Senior UX Researcher (REQ-RES-004)')).toBeInTheDocument();
      expect(screen.getByText('Xem chi tiết đợt ứng tuyển này →')).toBeInTheDocument();
    });
  });

  it('3. Thao tác thêm và xóa nhãn kỹ năng khi có quyền', async () => {
    vi.mocked(candidateApi.getUnifiedProfile).mockResolvedValueOnce(mockProfile);
    vi.mocked(candidateApi.addTag).mockResolvedValueOnce({
      id: 2,
      applicationId: 101,
      tagName: 'Design System',
      createdByUserId: 10,
      createdByName: 'Recruiter Mai',
      createdAt: '2026-10-22T10:00:00Z',
    });
    vi.mocked(candidateApi.deleteTag).mockResolvedValueOnce();

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Figma Pro')).toBeInTheDocument();
    });

    // Thêm nhãn
    const tagInput = screen.getByPlaceholderText(/Thêm nhãn mới/);
    fireEvent.change(tagInput, { target: { value: 'Design System' } });
    const addTagBtn = screen.getByText('Thêm nhãn');
    fireEvent.click(addTagBtn);

    await waitFor(() => {
      expect(candidateApi.addTag).toHaveBeenCalledWith(101, 'Design System');
      expect(screen.getByText('Design System')).toBeInTheDocument();
    });

    // Xóa nhãn
    const deleteBtn = screen.getAllByText('×')[0];
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(candidateApi.deleteTag).toHaveBeenCalledWith(101, 1);
    });
  });

  it('4. Thao tác thêm và xóa ghi chú nội bộ tuyển dụng', async () => {
    vi.mocked(candidateApi.getUnifiedProfile).mockResolvedValueOnce(mockProfile);
    vi.mocked(candidateApi.addNote).mockResolvedValueOnce({
      id: 2,
      applicationId: 101,
      authorId: 10,
      authorName: 'Recruiter Mai',
      content: 'Ứng viên sẵn sàng onboard vào tháng sau.',
      createdAt: '2026-10-22T10:30:00Z',
      updatedAt: null,
      canEdit: true,
      canDelete: true,
    });
    vi.mocked(candidateApi.deleteNote).mockResolvedValueOnce();

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Portfolio rất ấn tượng, kỹ năng phỏng vấn tốt.')).toBeInTheDocument();
    });

    // Thêm ghi chú
    const noteTextarea = screen.getByPlaceholderText(/Thêm ghi chú đánh giá/);
    fireEvent.change(noteTextarea, { target: { value: 'Ứng viên sẵn sàng onboard vào tháng sau.' } });
    const addNoteBtn = screen.getByText('Thêm ghi chú');
    fireEvent.click(addNoteBtn);

    await waitFor(() => {
      expect(candidateApi.addNote).toHaveBeenCalledWith(101, 'Ứng viên sẵn sàng onboard vào tháng sau.');
      expect(screen.getByText('Ứng viên sẵn sàng onboard vào tháng sau.')).toBeInTheDocument();
    });

    // Xóa ghi chú vừa thêm (id = 2)
    const deleteLink = screen.getAllByText('Xóa')[0];
    fireEvent.click(deleteLink);

    await waitFor(() => {
      expect(candidateApi.deleteNote).toHaveBeenCalledWith(101, 2);
    });
  });

  it('5. Chế độ chỉ xem (Hiring Manager) ẩn biểu mẫu thêm nhãn và thêm ghi chú', async () => {
    const readOnlyProfile: CandidateUnifiedProfile = {
      ...mockProfile,
      permissions: {
        ...mockProfile.permissions,
        canManageTags: false,
        canAddNotes: false,
        canUploadCv: false,
      },
    };
    vi.mocked(candidateApi.getUnifiedProfile).mockResolvedValueOnce(readOnlyProfile);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Nguyen Thi Mai')).toBeInTheDocument();
      expect(screen.getAllByText('(Chỉ xem)')).toHaveLength(2);
      expect(screen.queryByPlaceholderText(/Thêm nhãn mới/)).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/Thêm ghi chú đánh giá/)).not.toBeInTheDocument();
      expect(screen.queryByText('↑ Cập nhật CV')).not.toBeInTheDocument();
    });
  });

  it('6. Hiển thị thông báo lỗi 403 Forbidden khi truy cập hồ sơ ngoài phạm vi', async () => {
    const error403 = {
      response: {
        status: 403,
        data: { message: 'Bạn không có quyền truy cập hồ sơ ứng viên này.' },
      },
    };
    vi.mocked(candidateApi.getUnifiedProfile).mockRejectedValueOnce(error403);

    renderComponent('999');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Bạn không có quyền xem hồ sơ ứng viên này hoặc vị trí nằm ngoài phạm vi phụ trách.'
      );
    });
  });

  it('7. Xem trước CV và nút Tải xuống CV hoạt động đúng', async () => {
    vi.mocked(candidateApi.getUnifiedProfile).mockResolvedValueOnce(mockProfile);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTitle('Xem trước CV')).toBeInTheDocument();
      expect(screen.getByText('↓ Tải xuống CV')).toBeInTheDocument();
    });

    const downloadBtn = screen.getByText('↓ Tải xuống CV');
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(candidateApi.getCvBlob).toHaveBeenCalledWith(101);
    });
  });
});
