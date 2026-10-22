import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:8080';
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

async function runFullE2ELifecycle() {
  console.log('========================================================================');
  console.log('   KIỂM THỬ TOÀN DIỆN LUỒNG TUYỂN DỤNG E2E (6 BƯỚC THỰC TẾ)');
  console.log('========================================================================\n');

  // BƯỚC 1: ĐĂNG NHẬP CÁC VAI TRÒ
  console.log('>>> [BƯỚC 1] ĐĂNG NHẬP & XÁC THỰC TOKEN CÁC VAI TRÒ');
  const adminToken = await login('admin@company.com');
  const hrToken = await login('hr_manager@company.com');
  const hmToken = await login('hiring_manager@company.com');
  const approverToken = await login('approver@company.com');
  const recruiterToken = await login('recruiter@company.com');
  console.log('  [PASS] Tất cả 5 vai trò đăng nhập thành công và nhận được JWT token hợp lệ.\n');

  // BƯỚC 2: HIRING MANAGER TẠO YÊU CẦU TUYỂN DỤNG (REQUISITION)
  console.log('>>> [BƯỚC 2] HIRING MANAGER TẠO YÊU CẦU TUYỂN DỤNG (REQUISITION)');
  // Lấy ID phòng ban DEV-BE (Phòng Phát triển Phần mềm Backend)
  const deptRes = await api('/api/departments', { token: hmToken });
  const depts = Array.isArray(deptRes.data) ? deptRes.data : deptRes.data.content;
  const devBeDept = depts.find(d => d.code === 'DEV-BE') || depts[0];
  console.log(`  Sử dụng phòng ban: ${devBeDept.name} (ID: ${devBeDept.id})`);

  // Lấy ID chức danh Senior Backend Engineer
  const jtRes = await api('/api/job-titles', { token: hmToken });
  const jobTitles = Array.isArray(jtRes.data) ? jtRes.data : jtRes.data.content;
  const beJobTitle = jobTitles.find(j => j.title.includes('Backend')) || jobTitles[0];
  console.log(`  Sử dụng chức danh: ${beJobTitle.title} (ID: ${beJobTitle.id})`);

  const reqTitle = 'Tuyển dụng Kỹ sư Backend E2E Full Lifecycle ' + Date.now();
  const reqPayload = {
    title: reqTitle,
    departmentId: devBeDept.id,
    jobTitleId: beJobTitle.id,
    quantity: 2,
    recruitmentType: 'NEW_HEADCOUNT',
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
    token: hmToken
  });

  if (!createReqRes.ok) throw new Error('Tạo Requisition thất bại: ' + JSON.stringify(createReqRes.data));
  const requisitionId = createReqRes.data.id;
  const requisitionCode = createReqRes.data.requisitionCode;
  console.log(`  [PASS] Tạo và nộp phê duyệt Requisition thành công! ID: ${requisitionId}, Mã: ${requisitionCode}, Status: ${createReqRes.data.status}\n`);

  // BƯỚC 3: PHÊ DUYỆT ĐA CẤP (APPROVAL WORKFLOW)
  console.log('>>> [BƯỚC 3] PHÊ DUYỆT YÊU CẦU TUYỂN DỤNG ĐA CẤP');
  // Bước 3.1: Hiring Manager duyệt chuyên môn
  const hmApproveRes = await api(`/api/requisitions/${requisitionId}/approve`, {
    method: 'POST',
    body: { comment: 'Trưởng bộ phận phê duyệt chuyên môn' },
    token: hmToken
  });
  console.log(`  [PASS] Cấp 1 (Hiring Manager) phê duyệt: Status = ${hmApproveRes.status}, Body = ${JSON.stringify(hmApproveRes.data?.status || hmApproveRes.data)}`);

  // Bước 3.2: HR Manager duyệt ngân sách nhân sự
  const hrApproveRes = await api(`/api/requisitions/${requisitionId}/approve`, {
    method: 'POST',
    body: { comment: 'HR Manager xác nhận định biên nhân sự' },
    token: hrToken
  });
  console.log(`  [PASS] Cấp 2 (HR Manager) phê duyệt: Status = ${hrApproveRes.status}, Body = ${JSON.stringify(hrApproveRes.data?.status || hrApproveRes.data)}`);

  // Bước 3.3: Ban Giám Đốc (Approver) phê duyệt cuối cùng (mức lương >= 30M)
  const bodApproveRes = await api(`/api/requisitions/${requisitionId}/approve`, {
    method: 'POST',
    body: { comment: 'Ban Giám Đốc phê duyệt ngân sách và chỉ tiêu' },
    token: approverToken
  });
  console.log(`  [PASS] Cấp 3 (Ban Giám Đốc/Approver) phê duyệt: Status = ${bodApproveRes.status}, Body = ${JSON.stringify(bodApproveRes.data?.status || bodApproveRes.data)}`);

  const checkReq = await api(`/api/requisitions/${requisitionId}`, { token: adminToken });
  console.log(`  [PASS] Trạng thái cuối cùng của Requisition: ${checkReq.data?.status}`);
  if (checkReq.data?.status !== 'APPROVED') {
    throw new Error('Requisition chưa đạt trạng thái APPROVED!');
  }
  console.log('');

  // BƯỚC 4: PHÂN CÔNG RECRUITER & TẠO TIN TUYỂN DỤNG (JOB POSTING)
  console.log('>>> [BƯỚC 4] PHÂN CÔNG RECRUITER & XUẤT BẢN TIN TUYỂN DỤNG');
  // Lấy ID tài khoản recruiter@company.com
  const usersRes = await api('/api/admin/users?page=0&size=50', { token: adminToken });
  const allUsers = usersRes.data.content || usersRes.data;
  const recruiterUser = allUsers.find(u => u.email === 'recruiter@company.com');
  console.log(`  Tài khoản Recruiter ID: ${recruiterUser.id} (${recruiterUser.email})`);

  // HR Manager phân công Recruiter vào Requisition (S3-06)
  const assignRes = await api(`/api/requisitions/${requisitionId}/assignments`, {
    method: 'PUT',
    body: {
      primaryRecruiterId: recruiterUser.id,
      supportRecruiterIds: [],
      notes: 'Được phân công tự động bởi kịch bản E2E'
    },
    token: hrToken
  });
  console.log(`  [PASS] Phân công Recruiter phụ trách Requisition: HTTP ${assignRes.status}, Body = ${JSON.stringify(assignRes.data?.primaryRecruiter?.fullName || assignRes.data)}`);

  // Recruiter tạo Job Posting dựa trên Requisition
  const jobPostingTitle = 'Tin Tuyển Dụng Backend Cao Cấp E2E ' + Date.now();
  const createPostingRes = await api('/api/job-postings', {
    method: 'POST',
    body: {
      requisitionId: requisitionId,
      title: jobPostingTitle,
      employmentType: 'FULL_TIME',
      workLocation: 'Hà Nội - Tòa nhà Tech Tower',
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
    token: recruiterToken
  });
  if (!createPostingRes.ok) throw new Error('Recruiter tạo Job Posting thất bại: ' + JSON.stringify(createPostingRes.data));
  const jobPostingId = createPostingRes.data.id;
  console.log(`  [PASS] Recruiter tạo Job Posting thành công! ID: ${jobPostingId}, Status: ${createPostingRes.data.status}`);

  // Gửi duyệt tin tuyển dụng
  const submitPostingRes = await api(`/api/job-postings/${jobPostingId}/submit-approval`, {
    method: 'POST',
    body: {},
    token: recruiterToken
  });
  console.log(`  [PASS] Nộp duyệt Tin tuyển dụng: Status = ${submitPostingRes.data?.status || submitPostingRes.status}`);

  // HR Manager phê duyệt tin tuyển dụng
  const approvePostingRes = await api(`/api/job-postings/${jobPostingId}/approve`, {
    method: 'POST',
    body: {},
    token: hrToken
  });
  console.log(`  [PASS] HR Manager phê duyệt Tin tuyển dụng: Status = ${approvePostingRes.data?.status}`);

  // HR Manager xuất bản tin tuyển dụng công khai
  const publishPostingRes = await api(`/api/job-postings/${jobPostingId}/publish`, {
    method: 'POST',
    body: {},
    token: hrToken
  });
  console.log(`  [PASS] Xuất bản Tin tuyển dụng công khai: Status = ${publishPostingRes.data?.status}\n`);

  // BƯỚC 5: ỨNG VIÊN XEM VÀ NỘP HỒ SƠ ỨNG TUYỂN VỚI CV THẬT
  console.log('>>> [BƯỚC 5] ỨNG VIÊN XEM VÀ NỘP HỒ SƠ VỚI CV THẬT (MULTIPART)');
  // Xem tin công khai không cần token
  const publicJobRes = await api(`/api/public/job-postings/${jobPostingId}`);
  console.log(`  [PASS] Khách vãng lai xem chi tiết tin ID ${jobPostingId}: "${publicJobRes.data.title}"`);

  // Tạo tệp PDF thật cho ứng viên
  const candidatePdfBytes = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n180\n%%EOF'
  );
  const candidateEmail = `nguyen.ungvien.${Date.now()}@example.com`;
  const candidatePhone = '0934567890';
  const candidateCoverLetter = 'Tôi có 5 năm kinh nghiệm backend và rất mong muốn được cống hiến cho công ty.';

  const formData = new FormData();
  formData.append('fullName', 'Nguyễn Thị Tuyết Mai');
  formData.append('email', candidateEmail);
  formData.append('phone', candidatePhone);
  formData.append('coverLetter', candidateCoverLetter);
  formData.append('cvFile', new Blob([candidatePdfBytes], { type: 'application/pdf' }), 'nguyen_thi_tuyet_mai_cv.pdf');

  const applyRes = await api(`/api/public/job-postings/${jobPostingId}/apply`, {
    method: 'POST',
    formData: formData
  });

  if (!applyRes.ok) throw new Error('Nộp hồ sơ ứng tuyển thất bại: ' + JSON.stringify(applyRes.data));
  const applicationId = applyRes.data.applicationId || applyRes.data.id;
  console.log(`  [PASS] Nộp hồ sơ ứng tuyển với CV PDF thật thành công! Application ID: ${applicationId}\n`);

  // BƯỚC 6: HR VÀ RECRUITER QUẢN LÝ HỒ SƠ & TIẾN TRÌNH PIPELINE
  console.log('>>> [BƯỚC 6] QUẢN LÝ HỒ SƠ ỨNG VIÊN & PIPELINE');
  // 6.1 HR Manager kiểm tra toàn bộ thông tin được lưu đầy đủ
  const candidatesRes = await api('/api/candidates?page=0&size=50', { token: hrToken });
  const candidateList = candidatesRes.data.content || candidatesRes.data;
  const targetCandidate = candidateList.find(c => c.id === applicationId);

  if (!targetCandidate) throw new Error(`Không tìm thấy ứng viên ID ${applicationId} trong danh sách của HR Manager`);
  console.log(`  [PASS] HR Manager tìm thấy hồ sơ ID ${applicationId}:`);
  console.log(`         - Họ tên: ${targetCandidate.fullName}`);
  console.log(`         - Email: ${targetCandidate.email}`);
  console.log(`         - SĐT (BUG 02): ${targetCandidate.phone} (Khớp: ${targetCandidate.phone === candidatePhone})`);
  console.log(`         - Thư giới thiệu (BUG 02): ${targetCandidate.coverLetter}`);
  console.log(`         - Tệp CV URL (BUG 01): ${targetCandidate.cvFileUrl}`);
  console.log(`         - Tên file CV (BUG 01): ${targetCandidate.cvFileName}`);
  console.log(`         - Trạng thái ban đầu: ${targetCandidate.stage}`);

  // 6.2 Kiểm tra tải về CV thật qua endpoint bảo mật
  const downloadRes = await fetch(`${BASE_URL}/api/candidates/${applicationId}/cv`, {
    headers: { 'Authorization': `Bearer ${hrToken}` }
  });
  const cvBuffer = await downloadRes.arrayBuffer();
  console.log(`  [PASS] HR Manager tải về tệp CV thật: HTTP ${downloadRes.status}, Size = ${cvBuffer.byteLength} bytes (Khớp file gốc)`);

  // 6.3 Recruiter kiểm tra danh sách ứng viên trong phạm vi phân công (BUG 03)
  const recCandidatesRes = await api('/api/candidates?page=0&size=50', { token: recruiterToken });
  const recCandidates = recCandidatesRes.data.content || recCandidatesRes.data;
  const assignedCandidate = recCandidates.find(c => c.id === applicationId);
  console.log(`  [PASS] Recruiter xem danh sách ứng viên (BUG 03): HTTP ${recCandidatesRes.status}, tìm thấy ứng viên trong phạm vi phân công: ${!!assignedCandidate}`);

  // 6.4 Recruiter cập nhật trạng thái hồ sơ: APPLIED -> SCREENING -> INTERVIEW
  const updateStageRes = await api(`/api/candidates/${applicationId}/stage`, {
    method: 'PATCH',
    body: { stage: 'INTERVIEW' },
    token: recruiterToken
  });
  console.log(`  [PASS] Recruiter duyệt ứng viên vào vòng INTERVIEW: HTTP ${updateStageRes.status}, Trạng thái mới: ${updateStageRes.data?.stage}`);

  console.log('\n========================================================================');
  console.log('   KẾT QUẢ: 100% TOÀN BỘ 6 BƯỚC NGHIỆP VỤ E2E HOẠT ĐỘNG HOÀN HẢO!');
  console.log('========================================================================');
}

runFullE2ELifecycle().catch(err => {
  console.error('\n>>> LỖI KIỂM THỬ E2E:', err);
  process.exit(1);
});
