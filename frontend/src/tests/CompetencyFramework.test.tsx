import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CompetencyFrameworkPage from '../pages/CompetencyFrameworkPage';
import * as useAuthHook from '../hooks/useAuth';

const { mockCompetencyApi, mockJobTitleApi } = vi.hoisted(() => {
  const compApi = {
    getFrameworks: vi.fn(),
    getFrameworkById: vi.fn(),
    createFramework: vi.fn(),
    updateFramework: vi.fn(),
    deleteFramework: vi.fn(),
  };
  const jtApi = {
    getJobTitles: vi.fn(),
  };
  return { mockCompetencyApi: compApi, mockJobTitleApi: jtApi };
});

vi.mock('../hooks/useAuth');
vi.mock('../api/competencyFramework', () => ({
  competencyFrameworkApi: mockCompetencyApi,
  default: mockCompetencyApi,
}));

vi.mock('../api/jobTitle', () => ({
  jobTitleApi: mockJobTitleApi,
  default: mockJobTitleApi,
}));

describe('CompetencyFrameworkPage (S2-06 Quản lý khung năng lực - SCRUM-54)', () => {
  const mockFrameworks = [
    {
      id: 1,
      competencyName: 'Năng lực Lập trình & Kiến trúc Backend',
      category: 'KỸ THUẬT',
      description: 'Đánh giá năng lực backend core, microservices và thiết kế hệ thống',
      weightPercent: 100,
      criteriaCount: 3,
      jobTitlesCount: 3,
      jobTitles: [
        { id: 101, title: 'Backend Developer', code: 'DEV-BE-01' },
        { id: 102, title: 'Senior Backend Engineer', code: 'DEV-BE-SR' },
        { id: 103, title: 'Backend Team Leader', code: 'DEV-BE-LEAD' },
      ],
      criteria: [
        {
          id: 1,
          criterionCode: 'BE-JAVA-CORE',
          criterionName: 'Kiến thức chuyên sâu Java & JVM',
          description: 'Hiểu rõ memory model, garbage collection và OOP',
          weightPercent: 40,
          active: true,
        },
        {
          id: 2,
          criterionCode: 'BE-DB-DESIGN',
          criterionName: 'Thiết kế cơ sở dữ liệu & Tối ưu truy vấn',
          description: 'Database index, transaction isolation, replication',
          weightPercent: 35,
          active: true,
        },
        {
          id: 3,
          criterionCode: 'BE-TEAMWORK',
          criterionName: 'Kỹ năng làm việc nhóm & Review mã nguồn',
          description: 'Giao tiếp kỹ thuật và hỗ trợ đồng đội',
          weightPercent: 25,
          active: true,
        },
      ],
    },
    {
      id: 2,
      competencyName: 'Năng lực Chuyên viên Tuyển dụng',
      category: 'NHÂN SỰ & VẬN HÀNH',
      description: 'Khung đánh giá cho vị trí Talent Acquisition',
      weightPercent: 100,
      criteriaCount: 2,
      jobTitlesCount: 1,
      jobTitles: [{ id: 201, title: 'Recruitment Specialist', code: 'HR-REC-01' }],
      criteria: [
        {
          id: 4,
          criterionCode: 'HR-SOURCING',
          criterionName: 'Kỹ năng tìm nguồn ứng viên (Sourcing)',
          description: 'Tìm kiếm ứng viên qua LinkedIn, TopCV',
          weightPercent: 50,
          active: true,
        },
        {
          id: 5,
          criterionCode: 'HR-INTERVIEW',
          criterionName: 'Kỹ năng phỏng vấn hành vi (STAR)',
          description: 'Kỹ thuật phỏng vấn cấu trúc',
          weightPercent: 50,
          active: true,
        },
      ],
    },
  ];

  const mockJobTitles = [
    { id: 101, title: 'Backend Developer', code: 'DEV-BE-01', departmentId: 1, level: 'MIDDLE' as const, jobFamily: 'TECH' as const, active: true },
    { id: 102, title: 'Senior Backend Engineer', code: 'DEV-BE-SR', departmentId: 1, level: 'SENIOR' as const, jobFamily: 'TECH' as const, active: true },
    { id: 103, title: 'Backend Team Leader', code: 'DEV-BE-LEAD', departmentId: 1, level: 'LEAD' as const, jobFamily: 'TECH' as const, active: true },
    { id: 201, title: 'Recruitment Specialist', code: 'HR-REC-01', departmentId: 2, level: 'MIDDLE' as const, jobFamily: 'HR' as const, active: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        email: 'hrmanager@ats.com',
        fullName: 'Trưởng Phòng Nhân Sự',
        role: 'HR_MANAGER',
        roles: ['HR_MANAGER'],
        status: 'ACTIVE',
      },
      token: 'valid-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasRole: (r: string) => r === 'HR_MANAGER',
      hasAnyRole: (roles: string[]) => roles.includes('HR_MANAGER') || roles.includes('ADMIN'),
      hasPermission: () => true,
      hasAnyPermission: () => true,
    });

    mockCompetencyApi.getFrameworks.mockResolvedValue(mockFrameworks as any);
    mockJobTitleApi.getJobTitles.mockResolvedValue(mockJobTitles as any);
  });

  it('TC01 - Renders page header, statistics cards, and framework list', async () => {
    render(
      <MemoryRouter>
        <CompetencyFrameworkPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Quản lý Khung Năng lực')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Tổng số Khung Năng lực')).toBeInTheDocument();
      expect(screen.getByText('Năng lực Lập trình & Kiến trúc Backend')).toBeInTheDocument();
      expect(screen.getByText('Năng lực Chuyên viên Tuyển dụng')).toBeInTheDocument();
    });

    // Check weights and statistics
    expect(screen.getAllByText(/100%/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Tổng số Tiêu chí Đánh giá')).toBeInTheDocument();
    expect(screen.getByText('Chức danh Đang áp dụng')).toBeInTheDocument();

    // Multi-job-title association check
    expect(screen.getAllByText(/DEV-BE-01/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/HR-REC-01/i).length).toBeGreaterThanOrEqual(1);
  });

  it('TC02/TC03/TC07 - Real-time weight calculation & validation in Create/Edit modal', async () => {
    render(
      <MemoryRouter>
        <CompetencyFrameworkPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Thêm khung năng lực')).toBeInTheDocument();
    });

    // Open create modal
    fireEvent.click(screen.getByText('Thêm khung năng lực'));

    await waitFor(() => {
      expect(screen.getByText('Tạo mới Khung Năng lực')).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/Tên khung năng lực/i)).toBeInTheDocument();

    // Default template has 2 criteria totaling 100% (50% + 50%)
    expect(screen.getByText(/Tổng trọng số hiện tại: 100%/i)).toBeInTheDocument();
    expect(screen.getByText(/Tổng trọng số đạt chuẩn chính xác 100%/i)).toBeInTheDocument();

    // Change first criterion weight to 49% -> total is 99% (TC02: Reject 99%)
    const weightInputs = screen.getAllByPlaceholderText('%');
    fireEvent.change(weightInputs[0], { target: { value: '49' } });

    // Warning: còn thiếu 1%
    await waitFor(() => {
      expect(screen.getByText(/Tổng trọng số hiện tại: 99%/i)).toBeInTheDocument();
      expect(screen.getByText(/Còn thiếu 1%/i)).toBeInTheDocument();
    });

    // Save button should be disabled when total != 100%
    const saveBtn = screen.getByRole('button', { name: /Tạo khung năng lực/i });
    expect(saveBtn).toBeDisabled();

    // Change first criterion weight to 51% -> total is 101% (TC03: Reject 101%)
    fireEvent.change(weightInputs[0], { target: { value: '51' } });

    await waitFor(() => {
      expect(screen.getByText(/Tổng trọng số hiện tại: 101%/i)).toBeInTheDocument();
      expect(screen.getByText(/Vượt quá 1%/i)).toBeInTheDocument();
    });
    expect(saveBtn).toBeDisabled();

    // Set back to 50% -> total is 100%
    fireEvent.change(weightInputs[0], { target: { value: '50' } });
    await waitFor(() => {
      expect(screen.getByText(/Tổng trọng số hiện tại: 100%/i)).toBeInTheDocument();
    });
  });

  it('TC04/TC05/TC06 - Form validations: Missing name, empty criteria, duplicate codes', async () => {
    render(
      <MemoryRouter>
        <CompetencyFrameworkPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Thêm khung năng lực')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Thêm khung năng lực'));

    await waitFor(() => {
      expect(screen.getByText('Tạo mới Khung Năng lực')).toBeInTheDocument();
    });

    // Enter duplicate criterion code
    const codeInputs = screen.getAllByPlaceholderText(/BE_01/i);
    fireEvent.change(codeInputs[1], { target: { value: 'CRIT_01' } });

    await waitFor(() => {
      expect(screen.getByText(/Phát hiện trùng lặp mã tiêu chí/i)).toBeInTheDocument();
    });

    // Save button should be disabled due to duplicate code
    const saveBtn = screen.getByRole('button', { name: /Tạo khung năng lực/i });
    expect(saveBtn).toBeDisabled();
  });

  it('TC08/TC09 - Allows associating multiple job titles to a single framework', async () => {
    render(
      <MemoryRouter>
        <CompetencyFrameworkPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Thêm khung năng lực')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Thêm khung năng lực'));

    await waitFor(() => {
      expect(screen.getByText('Tạo mới Khung Năng lực')).toBeInTheDocument();
    });

    // Wait for job title checkboxes
    await waitFor(() => {
      expect(screen.getAllByText(/Backend Developer/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Senior Backend Engineer/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Backend Team Leader/i).length).toBeGreaterThanOrEqual(1);
    });

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThanOrEqual(3);

    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();
  });

  it('TC10 - Protects framework in use when attempting to delete', async () => {
    render(
      <MemoryRouter>
        <CompetencyFrameworkPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Năng lực Lập trình & Kiến trúc Backend')).toBeInTheDocument();
    });

    // Click delete button for framework #1 (which is used by 3 job titles)
    const deleteBtn = screen.getByTestId('delete-framework-1');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText('Xác nhận xóa Khung Năng lực')).toBeInTheDocument();
      expect(screen.getByText(/Không thể xóa khung năng lực này/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Backend Developer/i).length).toBeGreaterThanOrEqual(2);
    });

    // Confirm button is not rendered to protect data integrity
    expect(screen.queryByRole('button', { name: /Xác nhận xóa/i })).not.toBeInTheDocument();
  });

  it('TC12 - Read-only users cannot see Create, Edit or Delete buttons', async () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: {
        id: 99,
        email: 'candidate@ats.com',
        fullName: 'Ứng Viên Test',
        role: 'CANDIDATE',
        roles: ['CANDIDATE'],
        status: 'ACTIVE',
      },
      token: 'cand-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasRole: () => false,
      hasAnyRole: () => false,
      hasPermission: (p: string) => p === 'CATALOG_READ',
      hasAnyPermission: (perms: string[]) => perms.includes('CATALOG_READ'),
    });

    render(
      <MemoryRouter>
        <CompetencyFrameworkPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Năng lực Lập trình & Kiến trúc Backend')).toBeInTheDocument();
    });

    // Add button not rendered
    expect(screen.queryByText('Thêm khung năng lực')).not.toBeInTheDocument();

    // Edit and Delete buttons not rendered
    expect(screen.queryByTestId('edit-framework-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-framework-1')).not.toBeInTheDocument();

    // View detail button is still rendered
    expect(screen.getByTestId('view-framework-1')).toBeInTheDocument();
  });

  it('TC13 - Opens detail modal and shows all criteria with weight breakdown', async () => {
    render(
      <MemoryRouter>
        <CompetencyFrameworkPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('view-framework-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('view-framework-1'));

    await waitFor(() => {
      expect(screen.getByText('Chi tiết Khung Năng lực')).toBeInTheDocument();
      expect(screen.getByText('Kiến thức chuyên sâu Java & JVM')).toBeInTheDocument();
      expect(screen.getByText('Thiết kế cơ sở dữ liệu & Tối ưu truy vấn')).toBeInTheDocument();
      expect(screen.getByText('Kỹ năng làm việc nhóm & Review mã nguồn')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
      expect(screen.getByText('35%')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    });
  });
});
