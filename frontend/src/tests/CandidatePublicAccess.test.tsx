import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage';
import Sidebar from '../layouts/Sidebar';
import PublicCareerPage from '../pages/PublicCareerPage';
import jobPostingApi from '../api/jobPosting';
import organizationApi from '../api/organization';
import jobTitleApi from '../api/jobTitle';
import categoryApi from '../api/category';
import questionBankApi from '../api/questionBank';

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({
  user: { email: 'candidate@company.com', roles: ['CANDIDATE'] },
  hasRole: candidateRole,
  hasAnyRole: () => false,
  hasPermission: () => false,
}) }));
const candidateRole = (role: string) => role === 'CANDIDATE';
vi.mock('../api/jobPosting', () => ({ default: {
  listPublic: vi.fn(), getPublicDepartments: vi.fn(),
} }));
vi.mock('../api/organization', () => ({ default: { getDepartments: vi.fn() } }));
vi.mock('../api/jobTitle', () => ({ default: { getJobTitles: vi.fn() } }));
vi.mock('../api/category', () => ({ default: { list: vi.fn() } }));
vi.mock('../api/questionBank', () => ({ default: { search: vi.fn() } }));

describe('Candidate public job navigation and count', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(organizationApi.getDepartments).mockResolvedValue([]);
    vi.mocked(jobPostingApi.listPublic).mockResolvedValue({
      content: [], totalElements: 42, totalPages: 42, size: 1, number: 0,
    });
  });

  it('counts public postings across pages, avoids internal catalogs, and opens careers', async () => {
    render(<MemoryRouter initialEntries={['/dashboard']}><Routes>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/careers" element={<div>Public careers destination</div>} />
    </Routes></MemoryRouter>);
    expect(await screen.findByText('Khám phá Vị trí Nghề nghiệp (42)')).toBeInTheDocument();
    expect(organizationApi.getDepartments).not.toHaveBeenCalled();
    expect(jobTitleApi.getJobTitles).not.toHaveBeenCalled();
    expect(categoryApi.list).not.toHaveBeenCalled();
    expect(questionBankApi.search).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Khám phá vị trí' }));
    expect(await screen.findByText('Public careers destination')).toBeInTheDocument();
  });

  it('refreshes the public count and displays an actual zero', async () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    await screen.findByText('Khám phá Vị trí Nghề nghiệp (42)');
    vi.mocked(jobPostingApi.listPublic).mockResolvedValue({
      content: [], totalElements: 0, totalPages: 0, size: 1, number: 0,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Làm mới dữ liệu dashboard' }));
    expect(await screen.findByText('Khám phá Vị trí Nghề nghiệp (0)')).toBeInTheDocument();
  });

  it('shows a failed count as unavailable instead of a misleading zero', async () => {
    vi.mocked(jobPostingApi.listPublic).mockRejectedValue(new Error('offline'));
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể');
    expect(screen.queryByText('Khám phá Vị trí Nghề nghiệp (0)')).not.toBeInTheDocument();
  });

  it('links the candidate sidebar to the public careers route', () => {
    render(<MemoryRouter><Sidebar /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Việc làm đang mở' })).toHaveAttribute('href', '/careers');
  });

  it('loads the public department filter without an internal catalog request', async () => {
    vi.mocked(jobPostingApi.getPublicDepartments).mockResolvedValue([{ id: 5, name: 'Kỹ thuật' }]);
    render(<MemoryRouter><PublicCareerPage /></MemoryRouter>);
    expect(await screen.findByRole('option', { name: 'Kỹ thuật' })).toBeInTheDocument();
    expect(organizationApi.getDepartments).not.toHaveBeenCalled();
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '5' } });
    await waitFor(() => expect(jobPostingApi.listPublic).toHaveBeenLastCalledWith(
      expect.objectContaining({ departmentId: 5 }),
    ));
  });
});
