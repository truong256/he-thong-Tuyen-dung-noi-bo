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
    name: 'Quản trị viên',
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
    name: 'Trưởng phòng Nhân sự',
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
    name: 'Chuyên viên Tuyển dụng',
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
    name: 'Quản lý Bộ phận',
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
    name: 'Người Phỏng vấn',
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
    name: 'Người Phê duyệt',
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
    name: 'Ứng viên',
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
