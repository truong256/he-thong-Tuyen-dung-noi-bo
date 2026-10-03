import { RoleName } from '../types/auth';

export const ROLE_DISPLAY_LABELS: Record<RoleName, string> = {
  ADMIN: 'Quản trị viên',
  HR_MANAGER: 'Quản lý nhân sự',
  RECRUITER: 'Chuyên viên tuyển dụng',
  INTERVIEWER: 'Người phỏng vấn',
  CANDIDATE: 'Ứng viên',
  APPROVER: 'Người phê duyệt',
  HIRING_MANAGER: 'Quản lý tuyển dụng',
};

export function getRoleLabel(role?: string | null): string {
  if (!role) return '';
  if (role in ROLE_DISPLAY_LABELS) {
    return ROLE_DISPLAY_LABELS[role as RoleName];
  }
  return role;
}

export interface RoleInfo {
  code: string;
  name: string;
  badgeClass: string;
  description: string;
  permissions: {
    userManagement: boolean;
    jobPosting: boolean;
    candidateView: boolean;
    interviewEvaluation: boolean;
    offerApproval: boolean;
    candidateApply: boolean;
  };
}

export const ATS_ROLES_INFO: RoleInfo[] = [
  {
    code: 'ADMIN',
    name: ROLE_DISPLAY_LABELS.ADMIN,
    badgeClass: 'role-admin',
    description: 'Toàn quyền quản trị hệ thống, tài khoản nhân viên, cấu hình bảo mật và phân quyền vai trò.',
    permissions: {
      userManagement: true,
      jobPosting: true,
      candidateView: true,
      interviewEvaluation: true,
      offerApproval: true,
      candidateApply: false,
    },
  },
  {
    code: 'HR_MANAGER',
    name: ROLE_DISPLAY_LABELS.HR_MANAGER,
    badgeClass: 'role-hr-manager',
    description: 'Giám sát toàn bộ hoạt động tuyển dụng, duyệt yêu cầu tuyển dụng và phê duyệt đề xuất tuyển dụng (offer).',
    permissions: {
      userManagement: false,
      jobPosting: true,
      candidateView: true,
      interviewEvaluation: true,
      offerApproval: true,
      candidateApply: false,
    },
  },
  {
    code: 'RECRUITER',
    name: ROLE_DISPLAY_LABELS.RECRUITER,
    badgeClass: 'role-recruiter',
    description: 'Đăng tin tuyển dụng, lọc và tiếp nhận hồ sơ ứng viên, điều phối lịch phỏng vấn và gửi offer.',
    permissions: {
      userManagement: false,
      jobPosting: true,
      candidateView: true,
      interviewEvaluation: false,
      offerApproval: false,
      candidateApply: false,
    },
  },
  {
    code: 'HIRING_MANAGER',
    name: ROLE_DISPLAY_LABELS.HIRING_MANAGER,
    badgeClass: 'role-hiring-manager',
    description: 'Khởi tạo đề xuất tuyển dụng cho phòng ban, duyệt danh sách ứng viên và tham gia phỏng vấn chuyên môn.',
    permissions: {
      userManagement: false,
      jobPosting: false,
      candidateView: true,
      interviewEvaluation: true,
      offerApproval: true,
      candidateApply: false,
    },
  },
  {
    code: 'INTERVIEWER',
    name: ROLE_DISPLAY_LABELS.INTERVIEWER,
    badgeClass: 'role-interviewer',
    description: 'Xem thông tin ứng viên được phân công, tham gia phỏng vấn và nhập phiếu đánh giá năng lực.',
    permissions: {
      userManagement: false,
      jobPosting: false,
      candidateView: true,
      interviewEvaluation: true,
      offerApproval: false,
      candidateApply: false,
    },
  },
  {
    code: 'APPROVER',
    name: ROLE_DISPLAY_LABELS.APPROVER,
    badgeClass: 'role-approver',
    description: 'Phê duyệt các yêu cầu tuyển dụng (Requisition) và các gói đề xuất lương/offer của ứng viên.',
    permissions: {
      userManagement: false,
      jobPosting: false,
      candidateView: true,
      interviewEvaluation: false,
      offerApproval: true,
      candidateApply: false,
    },
  },
  {
    code: 'CANDIDATE',
    name: ROLE_DISPLAY_LABELS.CANDIDATE,
    badgeClass: 'role-candidate',
    description: 'Xem các vị trí công việc nội bộ đang tuyển dụng, nộp hồ sơ ứng tuyển và theo dõi kết quả.',
    permissions: {
      userManagement: false,
      jobPosting: false,
      candidateView: false,
      interviewEvaluation: false,
      offerApproval: false,
      candidateApply: true,
    },
  },
];
