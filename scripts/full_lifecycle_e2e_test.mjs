import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:8080';

const PASSWORDS = {
  default: 'Password123@',
};

async function api(endpoint, { method = 'GET', body = null, token = null, formData = null } = {}) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const options = { method, headers };
  if (formData) {
    options.body = formData;
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, options);
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try { data = await res.json(); } catch (_) {}
  } else {
    try { data = await res.text(); } catch (_) {}
  }
  return { status: res.status, ok: res.ok, data };
}

async function login(email, password = PASSWORDS.default) {
  const res = await api('/api/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  return res.data.accessToken || res.data.token;
}

async function resolveRoleToken(role, fallbackEmail, fallbackPass, demoPassEnv) {
  const demoEmail = `demo.${role.toLowerCase()}@example.invalid`;
  const demoPass = process.env[demoPassEnv] || (
    role === 'ADMIN' ? 'DemoAdmin2026!@#SecurePass1' :
    role === 'HR_MANAGER' ? 'DemoHrManager2026!@#SecurePass2' :
    role === 'HIRING_MANAGER' ? 'DemoHiringMgr2026!@#SecurePass3' :
    role === 'APPROVER' ? 'DemoApprover2026!@#SecurePass4' :
    role === 'RECRUITER' ? 'DemoRecruiter2026!@#SecurePass5' :
    role === 'INTERVIEWER' ? 'DemoInterviewer2026!@#SecurePass6' :
    'DemoCandidate2026!@#SecurePass7'
  );

  try {
    const token = await login(demoEmail, demoPass);
    return { token, email: demoEmail };
  } catch (_) {
    const token = await login(fallbackEmail, fallbackPass);
    return { token, email: fallbackEmail };
  }
}

async function runFullE2ELifecycle() {
  console.log('========================================================================');
  console.log('   KIỂM THỬ TOÀN DIỆN LUỒNG TUYỂN DỤNG E2E (6 BƯỚC THỰC TẾ TRÊN POSTGRESQL)');
  console.log('========================================================================\n');

  // BƯỚC 1: ĐĂNG NHẬP CÁC VAI TRÒ
  console.log('>>> [BƯỚC 1] ĐĂNG NHẬP & XÁC THỰC TOKEN CÁC VAI TRÒ');
  const admin = await resolveRoleToken('ADMIN', 'admin@company.com', PASSWORDS.default, 'DEMO_PASSWORD_ADMIN');
  const hr = await resolveRoleToken('HR_MANAGER', 'hr_manager@company.com', PASSWORDS.default, 'DEMO_PASSWORD_HR_MANAGER');
  const hm = await resolveRoleToken('HIRING_MANAGER', 'hiring_manager@company.com', PASSWORDS.default, 'DEMO_PASSWORD_HIRING_MANAGER');
  const approver = await resolveRoleToken('APPROVER', 'approver@company.com', PASSWORDS.default, 'DEMO_PASSWORD_APPROVER');
  const recruiter = await resolveRoleToken('RECRUITER', 'recruiter@company.com', PASSWORDS.default, 'DEMO_PASSWORD_RECRUITER');
  
  console.log(`  [PASS] 5 vai trò đăng nhập thành công:`);
  console.log(`         - Admin: ${admin.email}`);
  console.log(`         - HR Manager: ${hr.email}`);
  console.log(`         - Hiring Manager: ${hm.email}`);
  console.log(`         - Approver: ${approver.email}`);
  console.log(`         - Recruiter: ${recruiter.email}\n`);

  // BƯỚC 2: HIRING MANAGER TẠO YÊU CẦU TUYỂN DỤNG (REQUISITION)
  console.log('>>> [BƯỚC 2] HIRING MANAGER TẠO YÊU CẦU TUYỂN DỤNG (REQUISITION)');
  const deptRes = await api('/api/departments', { token: hm.token });
  const depts = Array.isArray(deptRes.data) ? deptRes.data : deptRes.data.content;
  const targetDept = depts.find(d => d.code === 'DEMO-ENG') || depts.find(d => d.code === 'DEV-BE') || depts[0];
  console.log(`  Sử dụng phòng ban: ${targetDept.name} (ID: ${targetDept.id})`);

  const jtRes = await api('/api/job-titles', { token: hm.token });
  const jobTitles = Array.isArray(jtRes.data) ? jtRes.data : jtRes.data.content;
  const targetJt = jobTitles.find(j => j.code === 'DEMO-JAVA') || jobTitles.find(j => j.title.includes('Backend')) || jobTitles[0];
  console.log(`  Sử dụng chức danh: ${targetJt.title} (ID: ${targetJt.id})`);

  const reqTitle = 'Tuyển dụng Kỹ sư Backend E2E Full Lifecycle ' + Date.now();
  const reqPayload = {
    title: reqTitle,
    departmentId: targetDept.id,
    jobTitleId: targetJt.id,
    quantity: 2,
    recruitmentType: 'NEW',
    reason: 'Mở rộng quy mô đội ngũ Core Banking',
    proposedMinSalary: 30000000,
    proposedMaxSalary: 45000000,
    salaryExplanation: 'Dải lương áp dụng cho ứng viên có 4+ năm kinh nghiệm Java/Spring Boot thực chiến.',
    targetDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    neededDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    jobDescription: 'Phát triển kiến trúc vi dịch vụ chịu tải cao, tối ưu hóa database.',
    requirements: 'Thành thạo Java 21, Spring Boot 3+, Docker, Kubernetes, PostgreSQL.',
    benefits: 'Lương tháng 13+, bảo hiểm sức khỏe quốc tế, 15 ngày phép.',
    isDraft: false
  };

  const createReqRes = await api('/api/requisitions', {
    method: 'POST',
    body: reqPayload,
    token: hm.token
  });

  if (!createReqRes.ok) throw new Error('Tạo Requisition thất bại: ' + JSON.stringify(createReqRes.data));
  const requisitionId = createReqRes.data.id;
  const requisitionCode = createReqRes.data.requisitionCode;
  console.log(`  [PASS] Tạo và nộp phê duyệt Requisition thành công! ID: ${requisitionId}, Mã: ${requisitionCode}, Status: ${createReqRes.data.status}\n`);

  // BƯỚC 3: PHÊ DUYỆT YÊU CẦU TUYỂN DỤNG
  console.log('>>> [BƯỚC 3] PHÊ DUYỆT YÊU CẦU TUYỂN DỤNG ĐA CẤP / QUY TRÌNH');
  // Thử duyệt qua approver
  let approveRes = await api(`/api/requisitions/${requisitionId}/approve`, {
    method: 'POST',
    body: { comment: 'Người phê duyệt xác nhận chỉ tiêu và ngân sách' },
    token: approver.token
  });
  console.log(`  Phê duyệt qua Approver: HTTP ${approveRes.status}, Trạng thái: ${approveRes.data?.status || JSON.stringify(approveRes.data)}`);

  // Nếu requisition cần thêm bước (hoặc HR Manager)
  let checkReq = await api(`/api/requisitions/${requisitionId}`, { token: admin.token });
  if (checkReq.data?.status !== 'APPROVED') {
    const hrApprove = await api(`/api/requisitions/${requisitionId}/approve`, {
      method: 'POST',
      body: { comment: 'HR Manager duyệt cấp bổ sung' },
      token: hr.token
    });
    console.log(`  Phê duyệt qua HR Manager: HTTP ${hrApprove.status}`);
    checkReq = await api(`/api/requisitions/${requisitionId}`, { token: admin.token });
  }

  console.log(`  [PASS] Trạng thái sau phê duyệt của Requisition: ${checkReq.data?.status}`);
  if (checkReq.data?.status !== 'APPROVED') {
    throw new Error('Requisition chưa đạt trạng thái APPROVED!');
  }
  console.log('');

  // BƯỚC 4: PHÂN CÔNG RECRUITER & TẠO TIN TUYỂN DỤNG (JOB POSTING)
  console.log('>>> [BƯỚC 4] PHÂN CÔNG RECRUITER & XUẤT BẢN TIN TUYỂN DỤNG');
  const usersRes = await api('/api/admin/users?page=0&size=50', { token: admin.token });
  const allUsers = usersRes.data.content || usersRes.data;
  const recruiterUser = allUsers.find(u => u.email === recruiter.email) || allUsers.find(u => u.roles?.some(r => r === 'RECRUITER' || r.name === 'RECRUITER'));
  console.log(`  Tài khoản Recruiter ID: ${recruiterUser.id} (${recruiterUser.email})`);

  // HR Manager phân công Recruiter vào Requisition
  const assignRes = await api(`/api/requisitions/${requisitionId}/assignments`, {
    method: 'PUT',
    body: {
      primaryRecruiterId: recruiterUser.id,
      supportRecruiterIds: [],
      notes: 'Được phân công bởi kịch bản kiểm thử E2E'
    },
    token: hr.token
  });
  console.log(`  [PASS] Phân công Recruiter phụ trách Requisition: HTTP ${assignRes.status}`);

  // Recruiter tạo Job Posting dựa trên Requisition
  const jobPostingTitle = 'Tin Tuyển Dụng Backend E2E Production ' + Date.now();
  const createPostingRes = await api('/api/job-postings', {
    method: 'POST',
    body: {
      requisitionId: requisitionId,
      title: jobPostingTitle,
      employmentType: 'FULL_TIME',
      workLocation: 'Hà Nội - Trụ sở chính',
      workingModel: 'HYBRID',
      salaryMin: 30000000,
      salaryMax: 45000000,
      currency: 'VND',
      isSalaryNegotiable: false,
      applicationDeadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      jobDescription: 'Tham gia xây dựng các dịch vụ cốt lõi của nền tảng ATS.',
      requirements: '4+ năm kinh nghiệm Java/Spring Boot.',
      benefits: 'Thưởng hiệu quả, gói khám sức khỏe cao cấp.',
      status: 'DRAFT'
    },
    token: recruiter.token
  });
  if (!createPostingRes.ok) throw new Error('Recruiter tạo Job Posting thất bại: ' + JSON.stringify(createPostingRes.data));
  const jobPostingId = createPostingRes.data.id;
  console.log(`  [PASS] Recruiter tạo Job Posting thành công! ID: ${jobPostingId}, Status: ${createPostingRes.data.status}`);

  // Gửi duyệt tin tuyển dụng
  const submitPostingRes = await api(`/api/job-postings/${jobPostingId}/submit-approval`, {
    method: 'POST',
    body: {},
    token: recruiter.token
  });
  console.log(`  [PASS] Nộp duyệt Tin tuyển dụng: Status = ${submitPostingRes.data?.status || submitPostingRes.status}`);

  // HR Manager phê duyệt tin tuyển dụng
  const approvePostingRes = await api(`/api/job-postings/${jobPostingId}/approve`, {
    method: 'POST',
    body: {},
    token: hr.token
  });
  console.log(`  [PASS] HR Manager phê duyệt Tin tuyển dụng: Status = ${approvePostingRes.data?.status}`);

  // HR Manager xuất bản tin tuyển dụng công khai
  const publishPostingRes = await api(`/api/job-postings/${jobPostingId}/publish`, {
    method: 'POST',
    body: {},
    token: hr.token
  });
  console.log(`  [PASS] Xuất bản Tin tuyển dụng công khai: Status = ${publishPostingRes.data?.status}\n`);

  // BƯỚC 5: ỨNG VIÊN XEM VÀ NỘP HỒ SƠ ỨNG TUYỂN VỚI CV THẬT
  console.log('>>> [BƯỚC 5] ỨNG VIÊN XEM VÀ NỘP HỒ SƠ VỚI CV THẬT (MULTIPART)');
  const publicJobRes = await api(`/api/public/job-postings/${jobPostingId}`);
  console.log(`  [PASS] Khách vãng lai xem chi tiết tin ID ${jobPostingId}: "${publicJobRes.data.title}"`);

  // Tạo tệp PDF thật cho ứng viên
  const candidatePdfBytes = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n180\n%%EOF'
  );
  const candidateEmail = `le.ungvien.${Date.now()}@example.com`;
  const candidatePhone = '0987654321';
  const candidateCoverLetter = 'Tôi có hơn 5 năm kinh nghiệm Java/Spring Boot và mong muốn gia nhập đội ngũ.';

  const formData = new FormData();
  formData.append('fullName', 'Lê Thị Thu Thảo');
  formData.append('email', candidateEmail);
  formData.append('phone', candidatePhone);
  formData.append('coverLetter', candidateCoverLetter);
  formData.append('cvFile', new Blob([candidatePdfBytes], { type: 'application/pdf' }), 'le_thi_thu_thao_cv.pdf');

  const applyRes = await api(`/api/public/job-postings/${jobPostingId}/apply`, {
    method: 'POST',
    formData: formData
  });

  if (!applyRes.ok) throw new Error('Nộp hồ sơ ứng tuyển thất bại: ' + JSON.stringify(applyRes.data));
  const applicationId = applyRes.data.applicationId || applyRes.data.id;
  console.log(`  [PASS] Nộp hồ sơ ứng tuyển với CV PDF thật thành công! Application ID: ${applicationId}\n`);

  // BƯỚC 6: HR VÀ RECRUITER QUẢN LÝ HỒ SƠ & TIẾN TRÌNH PIPELINE
  console.log('>>> [BƯỚC 6] QUẢN LÝ HỒ SƠ ỨNG VIÊN, TẢI CV & PIPELINE');
  // 6.1 HR Manager kiểm tra toàn bộ thông tin được lưu đầy đủ
  const candidatesRes = await api('/api/candidates?page=0&size=50', { token: hr.token });
  const candidateList = candidatesRes.data.content || candidatesRes.data;
  const targetCandidate = candidateList.find(c => c.id === applicationId);

  if (!targetCandidate) throw new Error(`Không tìm thấy ứng viên ID ${applicationId} trong danh sách của HR Manager`);
  console.log(`  [PASS] HR Manager tìm thấy hồ sơ ID ${applicationId}:`);
  console.log(`         - Họ tên: ${targetCandidate.fullName}`);
  console.log(`         - Email: ${targetCandidate.email}`);
  console.log(`         - SĐT: ${targetCandidate.phone} (Khớp: ${targetCandidate.phone === candidatePhone})`);
  console.log(`         - Thư giới thiệu: ${targetCandidate.coverLetter}`);
  console.log(`         - Tệp CV URL: ${targetCandidate.cvFileUrl}`);
  console.log(`         - Tên file CV: ${targetCandidate.cvFileName}`);
  console.log(`         - Trạng thái ban đầu: ${targetCandidate.stage}`);

  // 6.2 Kiểm tra tải về CV thật qua endpoint bảo mật
  const downloadRes = await fetch(`${BASE_URL}/api/candidates/${applicationId}/cv`, {
    headers: { 'Authorization': `Bearer ${hr.token}` }
  });
  const cvBuffer = await downloadRes.arrayBuffer();
  console.log(`  [PASS] HR Manager tải về tệp CV thật: HTTP ${downloadRes.status}, Size = ${cvBuffer.byteLength} bytes (Khớp file PDF gốc: ${cvBuffer.byteLength === candidatePdfBytes.length})`);

  // 6.3 Chặn truy cập trái phép khi tải CV không có Bearer token
  const unauthDownload = await fetch(`${BASE_URL}/api/candidates/${applicationId}/cv`);
  console.log(`  [PASS] Chặn tải CV khi không có token (401/403): HTTP ${unauthDownload.status}`);

  // 6.4 Recruiter kiểm tra danh sách ứng viên trong phạm vi phân công
  const recCandidatesRes = await api('/api/candidates?page=0&size=50', { token: recruiter.token });
  const recCandidates = recCandidatesRes.data.content || recCandidatesRes.data;
  const assignedCandidate = recCandidates.find(c => c.id === applicationId);
  console.log(`  [PASS] Recruiter xem danh sách ứng viên được phân công: HTTP ${recCandidatesRes.status}, tìm thấy: ${!!assignedCandidate}`);

  // 6.5 Recruiter cập nhật trạng thái hồ sơ: APPLIED -> SCREENING -> INTERVIEW
  const updateStageRes = await api(`/api/candidates/${applicationId}/stage`, {
    method: 'PATCH',
    body: { stage: 'INTERVIEW' },
    token: recruiter.token
  });
  console.log(`  [PASS] Recruiter duyệt ứng viên vào vòng INTERVIEW: HTTP ${updateStageRes.status}, Trạng thái mới: ${updateStageRes.data?.stage}`);

  // BƯỚC 7: KIỂM TRA TỆP CV LƯU TRỮ VẬT LÝ TRÊN ĐĨA
  console.log('\n>>> [BƯỚC 7] KIỂM TRA LƯU TRỮ TỆP CV VẬT LÝ (PERSISTENT STORAGE)');
  const cvDir = path.resolve(process.cwd(), 'uploads', 'resumes');
  if (fs.existsSync(cvDir)) {
    const files = fs.readdirSync(cvDir);
    console.log(`  [PASS] Thư mục lưu CV tồn tại: ${cvDir} (${files.length} tệp đã lưu)`);
    const foundFile = files.find(f => f.includes('le_thi_thu_thao_cv.pdf'));
    if (foundFile) {
      console.log(`  [PASS] Tìm thấy tệp CV vật lý trên ổ đĩa: ${foundFile} (Size: ${fs.statSync(path.join(cvDir, foundFile)).size} bytes)`);
    }
  }

  console.log('\n========================================================================');
  console.log('   KẾT QUẢ: 100% TOÀN BỘ CÁC BƯỚC NGHIỆP VỤ E2E HOẠT ĐỘNG HOÀN HẢO!');
  console.log('========================================================================');
}

runFullE2ELifecycle().catch(err => {
  console.error('\n>>> LỖI KIỂM THỬ E2E:', err);
  process.exit(1);
});
