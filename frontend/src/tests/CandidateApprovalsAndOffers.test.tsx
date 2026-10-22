import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CandidateApprovalsPage from '../pages/CandidateApprovalsPage';
import OffersPage from '../pages/OffersPage';
import apiClient from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

describe('Candidate Approvals & Offers Integration (PR #55 & RBAC)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CandidateApprovalsPage', () => {
    it('loads candidates and filters by APPLIED, SCREENING, EVALUATED stages', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: [
          { id: 1, requisitionId: 101, fullName: 'Nguyen Van A', email: 'a@ats.com', stage: 'APPLIED' },
          { id: 2, requisitionId: 101, fullName: 'Tran Thi B', email: 'b@ats.com', stage: 'SCREENING' },
          { id: 3, requisitionId: 102, fullName: 'Le Van C', email: 'c@ats.com', stage: 'EVALUATED' },
          { id: 4, requisitionId: 102, fullName: 'Pham Van D', email: 'd@ats.com', stage: 'HIRED' }, // should be filtered out
        ],
      } as any);

      render(
        <MemoryRouter>
          <CandidateApprovalsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
        expect(screen.getByText('Tran Thi B')).toBeInTheDocument();
        expect(screen.getByText('Le Van C')).toBeInTheDocument();
        expect(screen.queryByText('Pham Van D')).not.toBeInTheDocument();
      });
    });

    it('updates candidate stage to SHORTLISTED via apiClient.patch', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: [
          { id: 1, requisitionId: 101, fullName: 'Nguyen Van A', email: 'a@ats.com', stage: 'APPLIED' },
        ],
      } as any);
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { success: true } } as any);
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <MemoryRouter>
          <CandidateApprovalsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
      });

      const approveBtn = screen.getByRole('button', { name: 'Duyệt' });
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith('/api/candidates/1/stage', {
          stage: 'SHORTLISTED',
        });
      });
    });

    it('displays error message when candidate fetch fails with 403', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce({
        response: { status: 403, data: { message: 'Forbidden' } },
      });

      render(
        <MemoryRouter>
          <CandidateApprovalsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Tài khoản không đủ quyền xem danh sách duyệt ứng viên/i)).toBeInTheDocument();
      });
    });
  });

  describe('OffersPage', () => {
    it('loads eligible candidates for offers (SHORTLISTED, INTERVIEW, OFFER)', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: [
          { id: 10, requisitionId: 201, fullName: 'Hoang Van E', email: 'e@ats.com', stage: 'SHORTLISTED' },
          { id: 11, requisitionId: 201, fullName: 'Vu Thi F', email: 'f@ats.com', stage: 'INTERVIEW' },
          { id: 12, requisitionId: 202, fullName: 'Do Van G', email: 'g@ats.com', stage: 'OFFER' },
          { id: 13, requisitionId: 202, fullName: 'Bui Van H', email: 'h@ats.com', stage: 'APPLIED' }, // filtered out
        ],
      } as any);

      render(
        <MemoryRouter>
          <OffersPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Hoang Van E')).toBeInTheDocument();
        expect(screen.getByText('Vu Thi F')).toBeInTheDocument();
        expect(screen.getByText('Do Van G')).toBeInTheDocument();
        expect(screen.queryByText('Bui Van H')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Offer – Đề nghị tuyển dụng')).toBeInTheDocument();
      expect(screen.getByText(/Backend Offer riêng chưa được xác nhận trong dự án/i)).toBeInTheDocument();
    });

    it('shows error notice when apiClient fails to fetch candidates on OffersPage', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce({
        response: { data: { message: 'Lỗi máy chủ nội bộ' } },
      });

      render(
        <MemoryRouter>
          <OffersPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Lỗi máy chủ nội bộ')).toBeInTheDocument();
      });
    });
  });
});
