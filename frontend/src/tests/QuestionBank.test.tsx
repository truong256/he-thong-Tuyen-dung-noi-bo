import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import QuestionBankPage from '../pages/QuestionBankPage';
import questionBankApi from '../api/questionBank';
import * as useAuthHook from '../hooks/useAuth';

vi.mock('../hooks/useAuth');
vi.mock('../api/questionBank');

describe('QuestionBankPage Component (S2-07 Ngân hàng Câu hỏi)', () => {
  const mockCriteria = [
    {
      id: 1,
      criterionCode: 'CRIT-BE-01',
      criterionName: 'Kiến thức Chuyên sâu Java & Spring Boot',
      active: true,
      jobTitle: 'Backend Engineer',
    },
    {
      id: 2,
      criterionCode: 'CRIT-FE-01',
      criterionName: 'Lập trình React & TypeScript',
      active: true,
      jobTitle: 'Frontend Engineer',
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
      jobTitle: 'Backend Engineer',
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
      jobTitle: 'Frontend Engineer',
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

    // Click cancel button
    fireEvent.click(screen.getByText('Hủy bỏ'));

    await waitFor(() => {
      expect(
        screen.queryByText('Tạo mới câu hỏi và gán vào khung năng lực tiêu chuẩn')
      ).not.toBeInTheDocument();
    });
  });

  it('filters questions when typing into search input', async () => {
    render(
      <MemoryRouter>
        <QuestionBankPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Tìm theo nội dung câu hỏi/i);
    fireEvent.change(searchInput, { target: { value: 'Garbage' } });

    await waitFor(() => {
      expect(questionBankApi.search).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Garbage' })
      );
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
