import type { Requisition, RequisitionAssignments, AssignableRecruiter } from '../types/requisition';
import type { Department } from '../types/organization';
import { vietnamDay } from '../utils/requisitionDates';

export const previewDepartments: Department[] = [
  { id: 1, name: 'Phòng Công nghệ', code: 'TECH', employeeCount: 20, active: true, createdAt: '2026-01-01' },
  { id: 2, name: 'Phòng Nhân sự', code: 'HR', employeeCount: 8, active: true, createdAt: '2026-01-01' },
];
export const previewRecruiters: AssignableRecruiter[] = [
  { id: 101, fullName: 'Nguyễn An (mẫu)', email: 'an@example.com', username: 'demo-an' },
  { id: 102, fullName: 'Trần Bình (mẫu)', email: 'binh@example.com', username: 'demo-binh' },
];
function shiftedDay(offset: number) {
  return vietnamDay(new Date(Date.now() + offset * 86_400_000))!;
}
const statuses: Requisition['status'][] = ['APPROVED', 'PENDING_APPROVAL', 'DRAFT', 'REJECTED', 'CANCELLED'];
export function previewRows(): Requisition[] {
  return Array.from({ length: 26 }, (_, index) => ({
    id: index + 1, requisitionCode: `DEMO-${String(index + 1).padStart(3, '0')}`,
    title: `${index % 2 === 0 ? 'Tuyển lập trình viên' : 'Tuyển chuyên viên nhân sự'} ${index + 1}`,
    departmentId: index % 2 + 1, departmentName: previewDepartments[index % 2].name,
    jobTitleId: index % 2 + 1, jobTitleName: index % 2 === 0 ? 'Lập trình viên' : 'Chuyên viên nhân sự',
    quantity: index % 3 + 1, status: statuses[index % statuses.length], reason: 'NEW_HEADCOUNT',
    createdAt: `${shiftedDay(-index - 3)}T09:00:00+07:00`,
    targetDate: shiftedDay(index % 9 - 4), createdByName: 'Quản lý mẫu',
    jobDescription: 'Dữ liệu minh họa để kiểm tra giao diện frontend.', requirements: 'Nội dung yêu cầu mẫu.',
  }));
}
export const previewRequisitionApi = {
  async list(params: { search?: string; status?: string; departmentId?: number; recruiterId?: number;
    createdFrom?: string; createdTo?: string; page?: number; size?: number } = {}) {
    const matches = previewRows().filter((row) => {
      const day = vietnamDay(row.createdAt!)!;
      const recruiterId = previewRecruiters[(row.id - 1) % 2].id;
      const keyword = (params.search || '').toLocaleLowerCase('vi');
      return (!keyword || `${row.requisitionCode} ${row.title}`.toLocaleLowerCase('vi').includes(keyword))
        && (!params.status || row.status === params.status)
        && (!params.departmentId || row.departmentId === params.departmentId)
        && (!params.recruiterId || recruiterId === params.recruiterId)
        && (!params.createdFrom || day >= params.createdFrom)
        && (!params.createdTo || day <= params.createdTo);
    });
    const size = params.size || 10;
    const page = params.page || 0;
    return { content: matches.slice(page * size, (page + 1) * size), totalElements: matches.length,
      totalPages: Math.ceil(matches.length / size), size, number: page };
  },
  async getAssignments(id: number): Promise<RequisitionAssignments> {
    const row = previewRows().find((item) => item.id === id)!;
    const person = previewRecruiters[(id - 1) % 2];
    return { requisitionId: id, requisitionCode: row.requisitionCode, requisitionTitle: row.title,
      primaryRecruiter: { userId: person.id, fullName: person.fullName, email: person.email,
        role: 'RECRUITER', isPrimary: true }, supportRecruiters: [], hiringManagers: [] };
  },
};
