import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import QuestionBankPage from '../pages/QuestionBankPage';
import questionBankApi from '../api/questionBank';
import jobTitleApi from '../api/jobTitle';
import * as useAuthHook from '../hooks/useAuth';

vi.mock('../hooks/useAuth');
vi.mock('../api/questionBank');
vi.mock('../api/jobTitle');

describe('QuestionBankPage Component (S2-07 Ngân hàng Câu hỏi - Bộ lọc SCRUM-55)', () => {
  const mockCriteria = [
    {
      id: 1,
      criterionCode: 'CRIT-BE-01',
      criterionName: 'Kiến thức Chuyên sâu Java & Spring Boot',
      active: true,
      jobTitleId: 1,
      jobTitle: 'Backend Engineer',
    },
    {
      id: 2,
      criterionCode: 'CRIT-FE-01',
      criterionName: 'Lập trình React & TypeScript',
      active: true,
      jobTitleId: 2,
      jobTitle: 'Frontend Engineer',
    },
    {
      id: 3,
      criterionCode: 'CRIT-BE-03',
      criterionName: 'Tối ưu Hóa CSDL & PostgreSQL',
      active: true,
      jobTitleId: 1,
      jobTitle: 'Backend Engineer',
    },
  ];

  const mockJobTitles = [
    {
      id: 1,
      title: 'Senior Backend Engineer',
      code: 'BE-SR-01',
      level: 'SENIOR' as const,
      jobFamily: 'TECH' as const,
      departmentId: 1,
      standardHeadcount: 5,
      currentHeadcount: 3,
      openRequisitions: 2,
      active: true,
      createdAt: '2026-01-01',
    },
    {
      id: 2,
      title: 'Middle Frontend Developer',
      code: 'FE-MID-02',
      level: 'MIDDLE' as const,
      jobFamily: 'TECH' as const,
      departmentId: 1,
      standardHeadcount: 4,
      currentHeadcount: 2,
      openRequisitions: 1,
      active: true,
      createdAt: '2026-01-01',
    },
  ];

  const mockQuestions = [
    {
      id: 101,
      questionText: 'Giải thích cơ chế hoạt động của Garbage Collection trong JVM?',
      category: 'Java Core',
      difficultyLevel: 'HARD',
      suggestedAnswer: 'Young Gen, Old Gen, Metaspace, G1 GC, ZGC',
      active: true,
      competencyCriterionId: 1,
      criterionCode: 'CRIT-BE-01',
      criterionName: 'Kiến thức Chuyên sâu Java & Spring Boot',
      jobTitleId: 1,
      jobTitle: 'Senior Backend Engineer',
      createdAt: '2026-03-01T10:00:00Z',
    },
    {
      id: 102,
      questionText: 'Giải thích vòng đời component trong React Hooks?',
      category: 'React',
      difficultyLevel: 'MEDIUM',
      suggestedAnswer: 'useEffect vs useLayoutEffect',
      active: true,
      competencyCriterionId: 2,
      criterionCode: 'CRIT-FE-01',
      criterionName: 'Lập trình React & TypeScript',
      jobTitleId: 2,
      jobTitle: 'Middle Frontend Developer',
      createdAt: '2026-03-02T10:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        email: 'admin@ats.com',
        fullName: 'Admin Quản Trị',
        role: 'ADMIN',
        roles: ['ADMIN'],
        status: 'ACTIVE',
      },
      token: 'valid-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasRole: (r: string) => r === 'ADMIN',
      hasAnyRole: (roles: string[]) => roles.includes('ADMIN'),
    });

    vi.mocked(questionBankApi.getCriteria).mockResolvedValue(mockCriteria);
    vi.mocked(jobTitleApi.getJobTitles).mockResolvedValue(mockJobTitles as any);
    vi.mocked(questionBankApi.search).mockResolvedValue({
      content: mockQuestions,
      totalElements: 2,
      totalPages: 1,
      number: 0,
      size: 10,
      empty: false,
    });
  });

  it('renders hero banner with title, badges, and metrics cards', async () => {
    render(
      <MemoryRouter>
        <QuestionBankPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Ngân hàng Câu hỏi Phỏng vấn')).toBeInTheDocument();
    expect(screen.getByText('ATS-QUESTION-BANK')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Tổng số câu hỏi')).toBeInTheDocument();
    });

    expect(screen.getByText('Tiêu chí năng lực liên kết')).toBeInTheDocument();
  });

  it('loads and displays question list from API', async () => {
    render(
      <MemoryRouter>
        <QuestionBankPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText('Giải thích cơ chế hoạt động của Garbage Collection trong JVM?')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Giải thích vòng đời component trong React Hooks?')
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Java Core')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getAllByText('KHÓ').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('TRUNG BÌNH').length).toBeGreaterThanOrEqual(1);
  });

  it('TC01: Chọn một tiêu chí -> Gọi API với đúng criterionId', async () => {
    render(
      <MemoryRouter>
        <QuestionBankPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Lọc theo tiêu chí năng lực/i)).toBeInTheDocument();
    });

    const criterionSelect = screen.getByLabelText(/Lọc theo tiêu chí năng lực/i);
    fireEvent.change(criterionSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(questionBankApi.search).toHaveBeenCalledWith(
        expect.objectContaining({ criterionId: 1 })
      );
    });
  });

  it('TC02: Chọn Tất cả tiêu chí năng lực -> Khôi phục gọi API không truyền criterionId', async () => {
    render(
      <MemoryRouter>
        <QuestionBankPage />
      </MemoryRouter>
    );

    const criterionSelect = await screen.findByLabelText(/Lọc theo tiêu chí năng lực/i);
    // Select criterion 1 then switch back to ALL
    fireEvent.change(criterionSelect, { target: { value: '1' } });
    fireEvent.change(criterionSelect, { target: { value: 'ALL' } });

    await waitFor(() => {
      expect(questionBankApi.search).toHaveBeenCalledWith(
        expect.objectContaining({ criterionId: undefined })
      );
    });
  });

  it('TC03: Lọc Đang kích hoạt -> Gọi API với active: true', async () => {
    render(
      <MemoryRouter>
        <QuestionBankPage />
      </MemoryRouter>
    );

    const statusSelect = await screen.findByLabelText(/Lọc theo trạng thái/i);
    fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } });

    await waitFor(() => {
      expect(questionBankApi.search).toHaveBeenCalledWith(
        expect.objectContaining({ active: true })
      );
    });
  });

  it('TC04: Lọc Ngừng kích hoạt -> Gọi API với active: false', async () => {
    render(
      <MemoryRouter>
        <QuestionBankPage />
      </MemoryRouter>
    );

    const statusSelect = await screen.findByLabelText(/Lọc theo trạng thái/i);
    fireEvent.change(statusSelect, { target: { value: 'INACTIVE' } });

    await waitFor(() => {
      expect(questionBankApi.search).toHaveBeenCalledWith(
        expect.objectContaining({ active: false })
      );
    });
  });

  it('TC05: Lọc Tất cả trạng thái -> Gọi API với active: "ALL"', async () => {
    render(
      <MemoryRouter>
        <QuestionBankPage />
      </MemoryRouter>
    );

    const statusSelect = await screen.findByLabelText(/Lọc theo trạng thái/i);
    fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } });
    fireEvent.change(statusSelect, { target: { value: 'ALL' } });

    await waitFor(() => {
      expect(questionBankApi.search).toHaveBeenCalledWith(
        expect.objectContaining({ active: 'ALL' })
      );
    });
  });

  it('TC06: Lọc theo chức danh -> Gọi API với jobTitleId đúng', async () => {
    render(
      <MemoryRouter>
        <QuestionBankPage />
      </MemoryRouter>
    );

    const jobTitleSelect = await screen.findByLabelText(/Lọc theo chức danh/i);
    fireEvent.change(jobTitleSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(questionBankApi.search).toHaveBeenCalledWith(
        expect.objectContaining({ jobTitleId: 1 })
      );
    });
  });

  it('TC07: Đổi chức danh sẽ reset tiêu chí nếu không còn phù hợp', async () => {
    render(
      <MemoryRouter>
        <QuestionBankPage />
      </MemoryRouter>
    );

    const jobTitleSelect = await screen.findByLabelText(/Lọc theo chức danh/i);
    const criterionSelect = await screen.findByLabelText(/Lọc theo tiêu chí năng lực/i);

    // First select Job Title 1 (Backend) and Criterion 1 (Java - belongs to Job 1)
    fireEvent.change(jobTitleSelect, { target: { value: '1' } });
    fireEvent.change(criterionSelect, { target: { value: '1' } });

    expect(criterionSelect).toHaveValue('1');

    // Switch Job Title to 2 (Frontend) -> Criterion 1 does not belong to Job 2, so resets to ALL
    fireEvent.change(jobTitleSelect, { target: { value: '2' } });

    expect(criterionSelect).toHaveValue('ALL');
  });

  it('TC08: Kết hợp nhiều bộ lọc (AND condition) đồng thời', async () => {
    render(
      <MemoryRouter>
        <QuestionBankPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Tìm theo nội dung câu hỏi/i);
    const difficultySelect = await screen.findByLabelText(/Lọc theo độ khó/i);
    const jobTitleSelect = await screen.findByLabelText(/Lọc theo chức danh/i);
    const criterionSelect = await screen.findByLabelText(/Lọc theo tiêu chí năng lực/i);
    const statusSelect = await screen.findByLabelText(/Lọc theo trạng thái/i);

    fireEvent.change(searchInput, { target: { value: 'API' } });
    fireEvent.change(difficultySelect, { target: { value: 'MEDIUM' } });
    fireEvent.change(jobTitleSelect, { target: { value: '1' } });
    fireEvent.change(criterionSelect, { target: { value: '3' } });
    fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } });

    await waitFor(() => {
      expect(questionBankApi.search).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'API',
          difficultyLevel: 'MEDIUM',
          jobTitleId: 1,
          criterionId: 3,
          active: true,
        })
      );
    });
  });

  it('TC09: Không có kết quả -> Hiển thị trạng thái trống và nút xóa bộ lọc', async () => {
    vi.mocked(questionBankApi.search).mockResolvedValueOnce({
      content: [],
      totalElements: 0,
      totalPages: 1,
      number: 0,
      size: 10,
      empty: true,
    });

    render(
      <MemoryRouter>
        <QuestionBankPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Tìm theo nội dung câu hỏi/i);
    fireEvent.change(searchInput, { target: { value: 'KhôngTồnTại' } });

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy câu hỏi nào')).toBeInTheDocument();
      expect(
        screen.getByText(/Không có câu hỏi phỏng vấn nào phù hợp với bộ lọc hiện tại/i)
      ).toBeInTheDocument();
    });

    expect(screen.getAllByRole('button', { name: /Xóa bộ lọc/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('TC10: Nút "Xóa bộ lọc" khôi phục các lựa chọn mặc định', async () => {
    render(
      <MemoryRouter>
        <QuestionBankPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Tìm theo nội dung câu hỏi/i);
    const difficultySelect = await screen.findByLabelText(/Lọc theo độ khó/i);
    const jobTitleSelect = await screen.findByLabelText(/Lọc theo chức danh/i);
    const criterionSelect = await screen.findByLabelText(/Lọc theo tiêu chí năng lực/i);
    const statusSelect = await screen.findByLabelText(/Lọc theo trạng thái/i);

    fireEvent.change(searchInput, { target: { value: 'PostgreSQL' } });
    fireEvent.change(difficultySelect, { target: { value: 'HARD' } });
    fireEvent.change(jobTitleSelect, { target: { value: '1' } });
    fireEvent.change(criterionSelect, { target: { value: '1' } });
    fireEvent.change(statusSelect, { target: { value: 'INACTIVE' } });

    // Click "Xóa bộ lọc"
    const resetBtn = screen.getByRole('button', { name: /Xóa bộ lọc/i });
    fireEvent.click(resetBtn);

    expect(searchInput).toHaveValue('');
    expect(difficultySelect).toHaveValue('ALL');
    expect(jobTitleSelect).toHaveValue('ALL');
    expect(criterionSelect).toHaveValue('ALL');
    expect(statusSelect).toHaveValue('ALL');

    await waitFor(() => {
      expect(questionBankApi.search).toHaveBeenCalledWith(
        expect.objectContaining({
          search: undefined,
          difficultyLevel: undefined,
          jobTitleId: undefined,
          criterionId: undefined,
          active: 'ALL',
        })
      );
    });
  });

  it('opens and closes question modal when clicking "Thêm câu hỏi mới"', async () => {
    render(
      <MemoryRouter>
        <QuestionBankPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Thêm câu hỏi mới')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Thêm câu hỏi mới'));

    expect(screen.getByText('Tạo mới câu hỏi và gán vào khung năng lực tiêu chuẩn')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nội dung câu hỏi/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Hủy bỏ'));

    await waitFor(() => {
      expect(
        screen.queryByText('Tạo mới câu hỏi và gán vào khung năng lực tiêu chuẩn')
      ).not.toBeInTheDocument();
    });
  });

  it('renders error state with retry button when API fails', async () => {
    vi.mocked(questionBankApi.search).mockRejectedValueOnce(
      new Error('Mạng bị gián đoạn, không thể tải câu hỏi.')
    );

    render(
      <MemoryRouter>
        <QuestionBankPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Mạng bị gián đoạn, không thể tải câu hỏi/i)
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Thử lại')).toBeInTheDocument();
  });
});
