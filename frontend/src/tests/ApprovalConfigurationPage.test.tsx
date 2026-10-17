import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ApprovalConfigurationPage from '../pages/ApprovalConfigurationPage';
import adminApi from '../api/admin';
import organizationApi from '../api/organization';
import { approvalConfigurationApi } from '../api/approvalConfiguration';

vi.mock('../api/admin', () => ({
  default: { listUsers: vi.fn() },
}));

vi.mock('../api/organization', () => ({
  default: { getDepartments: vi.fn() },
}));

vi.mock('../api/approvalConfiguration', () => ({
  approvalConfigurationApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
  },
}));

const department = {
  id: 17,
  name: 'Phòng Công nghệ',
  code: 'TECH',
  active: true,
};

const firstApprover = {
  id: 21,
  fullName: 'Nguyễn An',
  email: 'an@example.test',
  role: 'APPROVER',
  roles: ['APPROVER'],
  status: 'ACTIVE',
};

const secondApprover = {
  id: 22,
  fullName: 'Trần Bình',
  email: 'binh@example.test',
  role: 'APPROVER',
  roles: ['APPROVER'],
  status: 'ACTIVE',
};

const activeConfiguration = {
  id: 31,
  departmentId: 17,
  departmentName: 'Phòng Công nghệ',
  version: 3,
  active: true,
  createdAt: '2026-10-01T09:00:00Z',
  deactivatedAt: null,
  steps: [
    { stepOrder: 1, minimumSalary: 0, approverUserId: 21, approverName: 'Nguyễn An' },
    { stepOrder: 2, minimumSalary: 50_000_000, approverUserId: 22, approverName: 'Trần Bình' },
  ],
};

const userPage = (content: typeof firstApprover[]) => ({ content, totalElements: content.length, totalPages: 1, size: 100, number: 0 });

describe('ApprovalConfigurationPage (S3-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(organizationApi.getDepartments).mockResolvedValue([department] as any);
    vi.mocked(adminApi.listUsers)
      .mockResolvedValueOnce(userPage([firstApprover, secondApprover]) as any)
      .mockResolvedValueOnce(userPage([]) as any);
    vi.mocked(approvalConfigurationApi.list).mockResolvedValue([activeConfiguration] as any);
  });

  const renderPage = () => render(
    <MemoryRouter>
      <ApprovalConfigurationPage />
    </MemoryRouter>,
  );

  it('shows active version, thresholds, and approvers for the selected department', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Cấu hình luồng phê duyệt' })).toBeInTheDocument();
    expect(screen.getByText('Đang áp dụng')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn An')).toBeInTheDocument();
    expect(screen.getByText('Trần Bình')).toBeInTheDocument();
    expect(screen.getAllByText('Phiên bản 3')).toHaveLength(2);
    expect(adminApi.listUsers).toHaveBeenNthCalledWith(1, undefined, 'ACTIVE', 'APPROVER', 0, 100);
  });

  it('reorders approvers by level and saves the new version without moving salary thresholds', async () => {
    vi.mocked(approvalConfigurationApi.update).mockResolvedValue({
      ...activeConfiguration,
      id: 32,
      version: 4,
      active: true,
      steps: [
        { ...activeConfiguration.steps[0], approverUserId: 22, approverName: 'Trần Bình' },
        { ...activeConfiguration.steps[1], approverUserId: 21, approverName: 'Nguyễn An' },
      ],
    } as any);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa' }));
    const approverFields = await screen.findAllByLabelText('Người phê duyệt');
    fireEvent.click(screen.getByRole('button', { name: 'Đưa cấp 2 lên' }));

    expect((approverFields[0] as HTMLSelectElement).value).toBe('22');
    expect((approverFields[1] as HTMLSelectElement).value).toBe('21');

    fireEvent.click(screen.getByRole('button', { name: 'Lưu phiên bản' }));

    await waitFor(() => expect(approvalConfigurationApi.update).toHaveBeenCalledWith(31, {
      departmentId: 17,
      steps: [
        { minimumSalary: 0, approverUserId: 22 },
        { minimumSalary: 50_000_000, approverUserId: 21 },
      ],
    }));
    expect(screen.getAllByText('Phiên bản 4')).toHaveLength(2);
  });

  it('blocks saving when salary thresholds are not strictly increasing', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa' }));
    const thresholds = screen.getAllByLabelText('Từ mức lương', { selector: 'input' });
    fireEvent.change(thresholds[1], { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu phiên bản' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ngưỡng lương cấp 2 phải cao hơn cấp trước.');
    expect(approvalConfigurationApi.update).not.toHaveBeenCalled();
  });

  it('creates the first approval configuration for a department with no active version', async () => {
    vi.mocked(approvalConfigurationApi.list).mockResolvedValue([]);
    vi.mocked(approvalConfigurationApi.create).mockResolvedValue({
      ...activeConfiguration,
      id: 40,
      version: 1,
      steps: [{ ...activeConfiguration.steps[0], approverUserId: 21 }],
    } as any);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Tạo cấu hình' }));
    fireEvent.change(await screen.findByLabelText('Người phê duyệt'), { target: { value: '21' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu phiên bản' }));

    await waitFor(() => expect(approvalConfigurationApi.create).toHaveBeenCalledWith({
      departmentId: 17,
      steps: [{ minimumSalary: 0, approverUserId: 21 }],
    }));
    expect(await screen.findByText('Đã lưu cấu hình phiên bản 1.')).toBeInTheDocument();
  });

  it('asks for confirmation before deactivating the active configuration', async () => {
    vi.mocked(approvalConfigurationApi.deactivate).mockResolvedValue(undefined);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Ngừng áp dụng' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Các yêu cầu đã gửi vẫn giữ nguyên snapshot luồng phê duyệt.')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Ngừng áp dụng' }).at(-1)!);

    await waitFor(() => expect(approvalConfigurationApi.deactivate).toHaveBeenCalledWith(31));
    expect(await screen.findByText('Đã ngừng áp dụng cấu hình.')).toBeInTheDocument();
    expect(screen.getByText('Phiên bản cũ')).toBeInTheDocument();
  });

  it('allows resuming a deactivated configuration with "Sử dụng tiếp"', async () => {
    const deactivatedConfig = {
      ...activeConfiguration,
      id: 31,
      version: 1,
      active: false,
      deactivatedAt: '2026-10-02T10:00:00Z',
    };
    vi.mocked(approvalConfigurationApi.list).mockResolvedValue([deactivatedConfig] as any);
    vi.mocked(approvalConfigurationApi.create).mockResolvedValue({
      ...deactivatedConfig,
      id: 32,
      version: 2,
      active: true,
      deactivatedAt: null,
    } as any);

    renderPage();

    const resumeBtn = await screen.findByRole('button', { name: 'Sử dụng tiếp' });
    expect(resumeBtn).toBeInTheDocument();

    fireEvent.click(resumeBtn);

    await waitFor(() => expect(approvalConfigurationApi.create).toHaveBeenCalledWith({
      departmentId: 17,
      steps: [
        { minimumSalary: 0, approverUserId: 21 },
        { minimumSalary: 50_000_000, approverUserId: 22 },
      ],
    }));
    expect(await screen.findByText('Đã kích hoạt lại cấu hình và áp dụng phiên bản 2.')).toBeInTheDocument();
  });

  it('allows rolling back to an older version with "Quay lại phiên bản này"', async () => {
    const v1Inactive = {
      ...activeConfiguration,
      id: 30,
      version: 1,
      active: false,
      steps: [
        { stepOrder: 1, minimumSalary: 0, approverUserId: 21, approverName: 'Nguyễn An' },
      ],
    };
    const v2Active = {
      ...activeConfiguration,
      id: 31,
      version: 2,
      active: true,
    };
    vi.mocked(approvalConfigurationApi.list).mockResolvedValue([v2Active, v1Inactive] as any);
    vi.mocked(approvalConfigurationApi.update).mockResolvedValue({
      ...v1Inactive,
      id: 32,
      version: 3,
      active: true,
    } as any);

    renderPage();

    // Click on Version 1 in history
    const v1Btn = await screen.findByRole('button', { name: /Phiên bản 1/i });
    fireEvent.click(v1Btn);

    // Rollback button appears
    const rollbackBtn = await screen.findByRole('button', { name: 'Quay lại phiên bản này' });
    expect(rollbackBtn).toBeInTheDocument();

    fireEvent.click(rollbackBtn);

    // Editor is populated with Version 1 steps
    expect(await screen.findByText(/Khôi phục từ phiên bản 1/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu phiên bản' }));

    await waitFor(() => expect(approvalConfigurationApi.update).toHaveBeenCalledWith(31, {
      departmentId: 17,
      steps: [{ minimumSalary: 0, approverUserId: 21 }],
    }));
    expect(await screen.findByText('Đã lưu cấu hình phiên bản 3.')).toBeInTheDocument();
  });

  it('prevents entering negative values in salary threshold', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa' }));
    const thresholds = screen.getAllByLabelText('Từ mức lương', { selector: 'input' });

    // Try pressing '-' key -> default is prevented
    const notCancelled = fireEvent.keyDown(thresholds[1], { key: '-' });
    expect(notCancelled).toBe(false);

    // If negative value is pasted or entered, negative sign is stripped and formatted cleanly
    fireEvent.change(thresholds[1], { target: { value: '-70000000' } });
    expect(thresholds[1]).toHaveValue('70,000,000');
  });

  it('allows immediately editing step 1 salary when creating a configuration', async () => {
    vi.mocked(approvalConfigurationApi.list).mockResolvedValue([]);
    vi.mocked(approvalConfigurationApi.create).mockResolvedValue({
      ...activeConfiguration,
      id: 50,
      version: 1,
      steps: [{ stepOrder: 1, minimumSalary: 10_000_000, approverUserId: 21, approverName: 'Nguyễn An' }],
    } as any);

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Tạo cấu hình' }));
    const step1Input = await screen.findByLabelText('Từ mức lương', { selector: 'input' });
    expect(step1Input).not.toBeDisabled();

    fireEvent.change(step1Input, { target: { value: '10000000' } });
    expect(step1Input).toHaveValue('10,000,000');

    fireEvent.change(screen.getByLabelText('Người phê duyệt'), { target: { value: '21' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu phiên bản' }));

    await waitFor(() => expect(approvalConfigurationApi.create).toHaveBeenCalledWith({
      departmentId: 17,
      steps: [{ minimumSalary: 10_000_000, approverUserId: 21 }],
    }));
    expect(await screen.findByText('Đã lưu cấu hình phiên bản 1.')).toBeInTheDocument();
  });
});