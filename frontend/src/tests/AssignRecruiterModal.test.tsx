import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AssignRecruiterModal } from '../components/requisition/AssignRecruiterModal';
import requisitionApi from '../api/requisition';

vi.mock('../api/requisition');
const requisition = { id: 10, requisitionCode: 'S306-TEST', title: 'Phân công kiểm thử', departmentId: 1, jobTitleId: 1, quantity: 1, status: 'APPROVED' };
const recruiters = [1, 2, 3].map(id => ({ id, fullName: `Recruiter ${id}`, email: `rec${id}@test.invalid`, username: `rec${id}` }));
const assigned = { requisitionId: 10, requisitionCode: 'S306-TEST', requisitionTitle: requisition.title,
  primaryRecruiter: null, supportRecruiters: [], hiringManagers: [] };

async function open() {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  render(<AssignRecruiterModal isOpen onClose={onClose} onSuccess={onSuccess} requisition={requisition} />);
  await screen.findByText('Recruiter 1');
  return { onClose, onSuccess };
}

describe('S3-06 assignment modal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requisitionApi.getAssignableRecruiters).mockResolvedValue(recruiters);
    vi.mocked(requisitionApi.getAssignments).mockResolvedValue(assigned);
    vi.mocked(requisitionApi.getAssignmentHistory).mockResolvedValue([]);
    vi.mocked(requisitionApi.assignRecruiters).mockResolvedValue(assigned);
  });

  it('requires a primary before saving', async () => {
    await open();
    fireEvent.submit(screen.getByRole('button', { name: /Lưu phân công/ }).closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Vui lòng chỉ định một Recruiter chính');
    expect(requisitionApi.assignRecruiters).not.toHaveBeenCalled();
  });

  it('saves one primary and two supports and closes after success', async () => {
    const { onClose, onSuccess } = await open();
    fireEvent.click(screen.getAllByRole('radio')[0]);
    expect(screen.getAllByRole('checkbox')[0]).toBeDisabled();
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    fireEvent.click(screen.getAllByRole('checkbox')[2]);
    fireEvent.click(screen.getByRole('button', { name: /Lưu phân công/ }));
    await waitFor(() => expect(requisitionApi.assignRecruiters).toHaveBeenCalledWith(10, {
      primaryRecruiterId: 1, supportRecruiterIds: [2, 3], reason: undefined, notes: undefined,
    }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('requires a handover reason and removes promoted support from supports', async () => {
    vi.mocked(requisitionApi.getAssignments).mockResolvedValue({ ...assigned,
      primaryRecruiter: { userId: 1, fullName: 'Recruiter 1', email: 'rec1@test.invalid', role: 'RECRUITER', isPrimary: true },
      supportRecruiters: [{ userId: 2, fullName: 'Recruiter 2', email: 'rec2@test.invalid', role: 'RECRUITER', isPrimary: false }],
    });
    await open();
    fireEvent.click(screen.getAllByRole('radio')[1]);
    expect(screen.getAllByRole('radio')[0]).not.toBeChecked();
    expect(screen.getAllByRole('checkbox')[1]).not.toBeChecked();
    fireEvent.submit(screen.getByRole('button', { name: /Lưu phân công/ }).closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Vui lòng nhập lý do chuyển giao');
    fireEvent.change(screen.getByPlaceholderText(/Bắt buộc: Nhập lý do/), { target: { value: '  Bàn giao dự án  ' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu phân công/ }));
    await waitFor(() => expect(requisitionApi.assignRecruiters).toHaveBeenCalledWith(10, {
      primaryRecruiterId: 2, supportRecruiterIds: [], reason: 'Bàn giao dự án', notes: undefined,
    }));
  });

  it('shows an empty history and allows filtering', async () => {
    await open();
    fireEvent.change(screen.getByPlaceholderText(/Tìm recruiter/), { target: { value: 'rec2@' } });
    expect(screen.queryByText('Recruiter 1')).not.toBeInTheDocument();
    expect(screen.getByText('Recruiter 2')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Lịch sử/ }));
    expect(screen.getByText(/Chưa có lịch sử chuyển giao/)).toBeVisible();
  });
});
