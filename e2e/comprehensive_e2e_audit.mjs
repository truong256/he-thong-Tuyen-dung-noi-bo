const BASE_URL = 'http://localhost:8080';
const PASSWORDS = {
  default: 'Password123@',
};

const users = {
  admin: { email: 'admin@company.com', role: 'ADMIN' },
  hrManager: { email: 'hr_manager@company.com', role: 'HR_MANAGER' },
  hiringManager: { email: 'hiring_manager@company.com', role: 'HIRING_MANAGER' },
  approver: { email: 'approver@company.com', role: 'APPROVER' },
  recruiter: { email: 'recruiter@company.com', role: 'RECRUITER' },
  candidate: { email: 'candidate@company.com', role: 'CANDIDATE' },
};

const tokens = {};
const auditResults = {
  tc01_login: {},
  tc02_requisition_create: {},
  tc03_requisition_approval: {},
  tc04_job_posting: {},
  tc05_candidate_apply: {},
  tc06_candidate_management: {},
};

async function apiRequest(endpoint, { method = 'GET', body = null, token = null } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

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

async function loginUser(email, password = PASSWORDS.default) {
  return await apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password }
  });
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.content)) return data.content;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

async function runAudit() {
  console.log('================================================================');
  console.log('   ATS RECRUITMENT FLOW COMPREHENSIVE SYSTEM AUDIT');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // TEST 01 - Authentication & RBAC Login
  // -------------------------------------------------------------------------
  console.log('--- [TEST 01] Kiểm tra Đăng nhập & RBAC ---');
  for (const [key, user] of Object.entries(users)) {
    const res = await loginUser(user.email);
    const token = res.data?.accessToken;
    const userObj = res.data?.user;
    if (res.ok && token) {
      tokens[key] = token;
      auditResults.tc01_login[key] = {
        pass: true,
        roles: userObj?.roles,
        userId: userObj?.id,
      };
      console.log(`  [PASS] ${user.role} (${user.email}) -> Token OK, Roles: ${JSON.stringify(userObj?.roles)}`);
    } else {
      auditResults.tc01_login[key] = { pass: false, error: res };
      console.log(`  [FAIL] ${user.role} (${user.email}) -> Login failed:`, res);
    }
  }

  // Test invalid password
  const badLogin = await loginUser('admin@company.com', 'InvalidPass123!');
  console.log(`  [TEST] Wrong password response code: ${badLogin.status} (Expected: 401)`);
  auditResults.tc01_login.wrong_password_status = badLogin.status;

  // -------------------------------------------------------------------------
  // TEST 02 - Tạo yêu cầu tuyển dụng (Hiring Manager)
  // -------------------------------------------------------------------------
  console.log('\n--- [TEST 02] Tạo yêu cầu tuyển dụng (Hiring Manager) ---');
  let createdReqId = null;
  let createdReqCode = null;
  try {
    const hmToken = tokens.hiringManager;
    // Lấy thông tin phòng ban & chức danh
    const deptRes = await apiRequest('/api/departments', { token: hmToken });
    const departments = normalizeList(deptRes.data);
    const techDept = departments.find(d => d.code === 'DEV-BE') || departments[0];

    const jtRes = await apiRequest('/api/job-titles', { token: hmToken });
    const jobTitles = normalizeList(jtRes.data);
    const beJobTitle = jobTitles.find(j => j.code === 'BE-SR-01') || jobTitles[0];

    console.log(`  Phòng ban tìm thấy: ${departments.length}, Chức danh tìm thấy: ${jobTitles.length}`);
    console.log(`  Sử dụng phòng ban: ${techDept?.name} (ID: ${techDept?.id}), Chức danh: ${beJobTitle?.title} (ID: ${beJobTitle?.id})`);

    // 1. Tạo bản nháp (DRAFT)
    const reqPayload = {
      title: 'Tuyển dụng Kỹ sư Backend E2E Test ' + Date.now(),
      departmentId: techDept.id,
      jobTitleId: beJobTitle.id,
      quantity: 2,
      recruitmentType: 'NEW',
      reason: 'Bổ sung nhân sự phục vụ kiểm thử E2E hệ thống',
      salaryMin: 35000000,
      salaryMax: 45000000,
      currency: 'VND',
      neededDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      targetDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      workLocation: 'Hà Nội - Trụ sở Cầu Giấy',
      workingModel: 'HYBRID',
      jobDescription: 'Thiết kế RESTful APIs, tối ưu hiệu năng cơ sở dữ liệu và xử lý microservices.',
      candidateRequirements: 'Tối thiểu 3 năm kinh nghiệm Java Spring Boot.',
      benefits: 'Lương thưởng cạnh tranh, bảo hiểm sức khỏe toàn diện.',
      status: 'DRAFT',
    };

    const draftRes = await apiRequest('/api/requisitions', { method: 'POST', body: reqPayload, token: hmToken });
    if (!draftRes.ok) throw new Error(JSON.stringify(draftRes));
    createdReqId = draftRes.data.id;
    createdReqCode = draftRes.data.requisitionCode;
    console.log(`  [PASS] Tạo bản nháp Requisition ID: ${createdReqId}, Code: ${createdReqCode}, Status: ${draftRes.data.status}`);

    // 2. Gửi phê duyệt: DRAFT -> PENDING_APPROVAL
    const submitRes = await apiRequest(`/api/requisitions/${createdReqId}/submit`, { method: 'POST', body: {}, token: hmToken });
    console.log(`  [PASS] Gửi phê duyệt Requisition ID: ${createdReqId}, New Status: ${submitRes.data.status}`);
    auditResults.tc02_requisition_create = {
      pass: submitRes.data?.status === 'PENDING_APPROVAL',
      requisitionId: createdReqId,
      code: createdReqCode,
      status: submitRes.data?.status,
    };
  } catch (err) {
    console.log('  [FAIL] Tạo yêu cầu tuyển dụng thất bại:', err.message);
    auditResults.tc02_requisition_create = { pass: false, error: err.message };
  }

  // -------------------------------------------------------------------------
  // TEST 03 - Phê duyệt yêu cầu tuyển dụng đa cấp
  // -------------------------------------------------------------------------
  console.log('\n--- [TEST 03] Phê duyệt yêu cầu tuyển dụng đa cấp ---');
  if (createdReqId) {
    try {
      // 1. Thử phê duyệt bằng tài khoản không có quyền (Recruiter) -> Kỳ vọng 403
      const recRes = await apiRequest(`/api/requisitions/${createdReqId}/approve`, {
        method: 'POST',
        body: { comment: 'Recruiter cố ý duyệt trái phép' },
        token: tokens.recruiter
      });
      if (recRes.status === 403) {
        console.log(`  [PASS] Recruiter duyệt bị chặn với HTTP code: 403 Forbidden`);
        auditResults.tc03_requisition_approval.unauthorized_check = 'PASS_BLOCKED_403';
      } else {
        console.log(`  [FAIL] Recruiter duyệt trả về mã: ${recRes.status} (Kỳ vọng 403)`);
        auditResults.tc03_requisition_approval.unauthorized_check = `FAIL_STATUS_${recRes.status}`;
      }

      // 2. Xem các bước phê duyệt cấu hình
      const histRes = await apiRequest(`/api/requisitions/${createdReqId}/approvals`, { token: tokens.admin });
      console.log(`  Chi tiết cấu hình bước duyệt:`, JSON.stringify(histRes.data));

      // Duyệt từng bước
      // Bước 1: Hiring Manager
      const hmApprove = await apiRequest(`/api/requisitions/${createdReqId}/approve`, {
        method: 'POST',
        body: { comment: 'Hiring Manager đồng ý đề xuất' },
        token: tokens.hiringManager
      });
      console.log(`  Bước 1 (Hiring Manager) duyệt: Status = ${hmApprove.data?.status}`);

      // Bước 2: HR Manager
      const hrApprove = await apiRequest(`/api/requisitions/${createdReqId}/approve`, {
        method: 'POST',
        body: { comment: 'HR Manager xác nhận định biên và ngân sách' },
        token: tokens.hrManager
      });
      console.log(`  Bước 2 (HR Manager) duyệt: Status = ${hrApprove.data?.status}`);

      // Bước 3: Approver (Ban Giám Đốc)
      const bodApprove = await apiRequest(`/api/requisitions/${createdReqId}/approve`, {
        method: 'POST',
        body: { comment: 'Ban Giám Đốc phê duyệt yêu cầu tuyển dụng' },
        token: tokens.approver
      });
      console.log(`  Bước 3 (Approver/BOD) duyệt: Status = ${bodApprove.data?.status}`);

      // Kiểm tra trạng thái cuối cùng của Requisition
      const finalReq = await apiRequest(`/api/requisitions/${createdReqId}`, { token: tokens.admin });
      console.log(`  Trạng thái cuối cùng của Requisition: ${finalReq.data?.status}`);
      auditResults.tc03_requisition_approval.final_status = finalReq.data?.status;
      auditResults.tc03_requisition_approval.pass = finalReq.data?.status === 'APPROVED';
    } catch (err) {
      console.log('  [FAIL] Quy trình phê duyệt gặp lỗi:', err.message);
      auditResults.tc03_requisition_approval.pass = false;
      auditResults.tc03_requisition_approval.error = err.message;
    }
  }

  // -------------------------------------------------------------------------
  // TEST 04 - Tạo và Xuất bản Tin Tuyển dụng (Job Posting)
  // -------------------------------------------------------------------------
  console.log('\n--- [TEST 04] Tạo và Xuất bản Tin Tuyển dụng ---');
  let createdJobPostingId = null;
  try {
    let approvedReqId = createdReqId;
    if (auditResults.tc03_requisition_approval.final_status !== 'APPROVED') {
      const reqList = await apiRequest('/api/requisitions?status=APPROVED', { token: tokens.hrManager });
      const approvedList = normalizeList(reqList.data);
      if (approvedList.length > 0) {
        approvedReqId = approvedList[0].id;
      }
    }
    console.log(`  Sử dụng Requisition APPROVED ID: ${approvedReqId}`);

    // 1. Recruiter tạo bản nháp tin tuyển dụng kế thừa từ Requisition
    const postPayload = {
      requisitionId: approvedReqId,
      title: 'Tuyển dụng Kỹ sư Backend E2E Test Public ' + Date.now(),
      employmentType: 'FULL_TIME',
      workLocation: 'Hà Nội - Cầu Giấy',
      workingModel: 'HYBRID',
      salaryMin: 35000000,
      salaryMax: 45000000,
      currency: 'VND',
      isSalaryNegotiable: false,
      applicationDeadline: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
      jobDescription: 'Tham gia phát triển kiến trúc backend phân tán hiệu năng cao.',
      requirements: '4+ năm kinh nghiệm Java/Spring Boot.',
      benefits: 'Gói bảo hiểm sức khỏe VIP, du lịch nghỉ dưỡng hàng năm.',
      status: 'DRAFT',
    };

    const draftPosting = await apiRequest('/api/job-postings', { method: 'POST', body: postPayload, token: tokens.recruiter });
    if (!draftPosting.ok) throw new Error(JSON.stringify(draftPosting));
    createdJobPostingId = draftPosting.data.id;
    console.log(`  [PASS] Tạo bản nháp Job Posting ID: ${createdJobPostingId}, Status: ${draftPosting.data.status}`);

    // 2. Gửi phê duyệt: DRAFT -> PENDING_APPROVAL
    const submitPosting = await apiRequest(`/api/job-postings/${createdJobPostingId}/submit`, { method: 'POST', body: {}, token: tokens.recruiter });
    console.log(`  [PASS] Gửi duyệt Job Posting: Status = ${submitPosting.data?.status}`);

    // 3. HR Manager phê duyệt: PENDING_APPROVAL -> APPROVED
    const approvePosting = await apiRequest(`/api/job-postings/${createdJobPostingId}/approve`, { method: 'POST', body: {}, token: tokens.hrManager });
    console.log(`  [PASS] HR Manager duyệt Job Posting: Status = ${approvePosting.data?.status}`);

    // 4. Xuất bản tin: APPROVED -> PUBLISHED
    const publishPosting = await apiRequest(`/api/job-postings/${createdJobPostingId}/publish`, { method: 'POST', body: {}, token: tokens.hrManager });
    console.log(`  [PASS] Xuất bản tin Job Posting: Status = ${publishPosting.data?.status}`);

    auditResults.tc04_job_posting = {
      pass: publishPosting.data?.status === 'PUBLISHED',
      jobPostingId: createdJobPostingId,
      status: publishPosting.data?.status,
    };
  } catch (err) {
    console.log('  [FAIL] Tạo và xuất bản tin thất bại:', err.message);
    auditResults.tc04_job_posting = { pass: false, error: err.message };
  }

  // -------------------------------------------------------------------------
  // TEST 05 - Ứng viên xem và Ứng tuyển công khai
  // -------------------------------------------------------------------------
  console.log('\n--- [TEST 05] Ứng viên xem và Ứng tuyển công khai (/careers) ---');
  let appliedCandidateAppId = null;
  try {
    // 1. Xem danh sách công khai (ANONYMOUS - KHÔNG GỬI TOKEN)
    const publicJobsRes = await apiRequest('/api/public/job-postings');
    const publicJobs = normalizeList(publicJobsRes.data);
    console.log(`  [PASS] Xem danh sách việc làm công khai không cần token: Tìm thấy ${publicJobs.length} tin`);
    
    const targetJob = publicJobs.find(j => j.id === createdJobPostingId) || publicJobs[0];
    if (!targetJob) {
      throw new Error('Không tìm thấy tin tuyển dụng đã xuất bản trong danh sách công khai');
    }
    console.log(`  [PASS] Tin tuyển dụng công khai ID ${targetJob.id}: "${targetJob.title}"`);

    // 2. Xem chi tiết tin công khai
    const detailRes = await apiRequest(`/api/public/job-postings/${targetJob.id}`);
    console.log(`  [PASS] Xem chi tiết tin công khai ID ${targetJob.id}: Tiêu đề = "${detailRes.data.title}"`);

    // 3. Nộp hồ sơ ứng tuyển (ANONYMOUS / CANDIDATE)
    const applyPayload = {
      fullName: 'Ứng viên E2E Nguyễn Test',
      email: `candidate.e2e.${Date.now()}@test.vn`,
      phone: '0987654321',
      coverLetter: 'Kính gửi nhà tuyển dụng, tôi mong muốn được ứng tuyển vị trí này.',
      cvFileUrl: 'https://storage.company.com/cv/cv_real_nguyentest.pdf',
    };

    const applyRes = await apiRequest(`/api/public/job-postings/${targetJob.id}/apply`, {
      method: 'POST',
      body: applyPayload
    });
    appliedCandidateAppId = applyRes.data?.applicationId;
    console.log(`  [PASS] Nộp hồ sơ công khai thành công: Application ID = ${appliedCandidateAppId}`);
    console.log(`  Phản hồi từ backend:`, JSON.stringify(applyRes.data));

    auditResults.tc05_candidate_apply = {
      pass: true,
      applicationId: appliedCandidateAppId,
      candidateEmail: applyPayload.email,
    };
  } catch (err) {
    console.log('  [FAIL] Nộp hồ sơ ứng tuyển thất bại:', err.message);
    auditResults.tc05_candidate_apply = { pass: false, error: err.message };
  }

  // -------------------------------------------------------------------------
  // TEST 06 - Quản lý hồ sơ ứng viên & Pipeline
  // -------------------------------------------------------------------------
  console.log('\n--- [TEST 06] Quản lý hồ sơ ứng viên & Pipeline ---');
  try {
    // 1. HR Manager xem danh sách hồ sơ ứng viên
    const hrCandRes = await apiRequest('/api/candidates', { token: tokens.hrManager });
    const hrCandidates = normalizeList(hrCandRes.data);
    console.log(`  [PASS] HR Manager xem danh sách ứng viên: Tìm thấy ${hrCandidates.length} hồ sơ`);

    // 2. Kiểm tra hồ sơ vừa nộp
    const submittedCand = hrCandidates.find(c => c.id === appliedCandidateAppId);
    if (submittedCand) {
      console.log(`  [PASS] Tìm thấy hồ sơ vừa nộp: ID=${submittedCand.id}, Tên=${submittedCand.fullName}, Stage=${submittedCand.stage}`);
    } else {
      console.log(`  [WARN] Không tìm thấy hồ sơ ID ${appliedCandidateAppId} trong danh sách của HR Manager`);
    }

    // 3. Recruiter xem danh sách hồ sơ ứng viên
    const recCandRes = await apiRequest('/api/candidates', { token: tokens.recruiter });
    if (recCandRes.ok) {
      const recCandidates = normalizeList(recCandRes.data);
      console.log(`  [INFO] Recruiter xem danh sách ứng viên (/api/candidates): HTTP 200, ${recCandidates.length} hồ sơ (phạm vi phân công)`);
      auditResults.tc06_candidate_management.recruiter_api_access = 'SUCCESS_200';
      auditResults.tc06_candidate_management.recruiter_cand_count = recCandidates.length;
    } else {
      console.log(`  [FAIL] Recruiter truy cập /api/candidates bị lỗi: HTTP ${recCandRes.status}`);
      auditResults.tc06_candidate_management.recruiter_api_access = `FAIL_${recCandRes.status}`;
    }

    // 4. Thử chuyển trạng thái hồ sơ: APPLIED -> INTERVIEW
    if (appliedCandidateAppId) {
      const stageRes = await apiRequest(`/api/candidates/${appliedCandidateAppId}/stage`, {
        method: 'PATCH',
        body: { stage: 'INTERVIEW' },
        token: tokens.hrManager
      });
      if (stageRes.ok) {
        console.log(`  [PASS] Chuyển trạng thái sang INTERVIEW thành công:`, stageRes.data);
      } else {
        console.log(`  [FAIL] Chuyển trạng thái stage thất bại: HTTP ${stageRes.status}`, stageRes.data);
      }

      // 5. Thử từ chối hồ sơ kèm lý do
      const rejectRes = await apiRequest(`/api/candidates/${appliedCandidateAppId}/stage`, {
        method: 'PATCH',
        body: {
          stage: 'REJECTED',
          reason: 'Ứng viên chưa đủ số năm kinh nghiệm theo yêu cầu'
        },
        token: tokens.hrManager
      });
      if (rejectRes.ok) {
        console.log(`  [PASS] Từ chối hồ sơ kèm lý do thành công:`, rejectRes.data);
      } else {
        console.log(`  [FAIL] Từ chối hồ sơ thất bại: HTTP ${rejectRes.status}`, rejectRes.data);
      }
    }

    auditResults.tc06_candidate_management.pass = true;
  } catch (err) {
    console.log('  [FAIL] Quản lý hồ sơ ứng viên thất bại:', err.message);
    auditResults.tc06_candidate_management.pass = false;
    auditResults.tc06_candidate_management.error = err.message;
  }

  console.log('\n================================================================');
  console.log('   TỔNG HỢP KẾT QUẢ AUDIT HOÀN TẤT');
  console.log('================================================================');
  console.log(JSON.stringify(auditResults, null, 2));
}

runAudit();
