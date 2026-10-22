# BÁO CÁO KIỂM THỬ TOÀN DIỆN LUỒNG TUYỂN DỤNG E2E (END-TO-END RECRUITMENT FLOW AUDIT)

> **Dự án**: Hệ thống Tuyển dụng Nội bộ (ATS Recruitment System)  
> **Người thực hiện**: Senior Full-Stack Developer & QA Automation Engineer  
> **Thời điểm kiểm định**: 23/10/2026 00:55:00 (GMT+7)  
> **Môi trường thực thi**: Windows 11, Node.js v24.19.0, OpenJDK 21.0.12.1 LTS, H2 Database (PostgreSQL Mode), React 18 + Vite, Spring Boot 3.x / 4.1.1  

---

## A. THÔNG TIN GIT VÀ MÔI TRƯỜNG KIỂM THỬ

| Thông tin | Giá trị thực tế |
| :--- | :--- |
| **Repository URL** | `https://github.com/truong256/he-thong-Tuyen-dung-noi-bo.git` |
| **Nhánh nguồn (Source Branch)** | `origin/dev` |
| **Nhánh chính (Main Branch)** | `origin/main` |
| **Nhánh kiểm thử độc lập** | `test/e2e-recruitment-flow` |
| **Commit SHA kiểm thử** | `a66190237b3409a1d2063f8147d1ffe0379a7818` |
| **Thông điệp commit gần nhất** | `Merge pull request #51 from truong256/feature/s2-09-company-profile-preview` |
| **Tình trạng khác biệt (Git Diff)** | - `origin/dev` đi trước `origin/main` **36 commits** (các tính năng Sprint 3, Sprint 4: Public careers portal, ứng tuyển, SLA, unpublish, phê duyệt tin, v.v.).<br>- `origin/main` có **6 commits** rẽ nhánh (PR #41, #38, #25, #24, #23) chưa được rebase/merge đồng bộ sang `dev`. |
| **Cơ sở dữ liệu kiểm thử** | CSDL độc lập `./data/test_recruitment_db.mv.db` (Bảo toàn 100% CSDL gốc `recruitment_db.mv.db` không bị can thiệp hay thay đổi). |
| **Cổng dịch vụ kiểm thử** | Backend: `http://localhost:8080` \| Frontend: `http://localhost:5173` |

---

## B. BẢNG TỔNG HỢP KẾT QUẢ KIỂM THỬ TỪNG BƯỚC NGHIỆP VỤ

| Test Code | Chức năng nghiệp vụ | Kết quả | Chi tiết & Nguyên nhân cốt lõi |
| :--- | :--- | :---: | :--- |
| **TC01** | **Đăng nhập & Phân quyền RBAC** | **PASS** | Đăng nhập thành công với cả 6 vai trò: Admin, HR Manager, Hiring Manager, Approver, Recruiter, Candidate. Server cấp JWT `accessToken` hợp lệ; xác thực sai mật khẩu bị chặn chuẩn `HTTP 401 Unauthorized`. |
| **TC02** | **Tạo yêu cầu tuyển dụng (Requisition)** | **PARTIAL PASS** | Hiring Manager tạo được yêu cầu tuyển dụng mới mã `REQ-202610-0003`, lưu vào CSDL và chuyển trạng thái `PENDING_APPROVAL`. Tuy nhiên, endpoint `POST /api/requisitions` tự động submit duyệt ngay thay vì giữ `DRAFT` (lưu nháp phải dùng `POST /api/requisitions/draft`), và payload thiếu `departmentId` gây lỗi `HTTP 500` do thiếu annotation validation. |
| **TC03** | **Phê duyệt yêu cầu đa cấp (Approval Flow)** | **PASS** | Quy trình phê duyệt đa cấp chạy tuần tự chính xác: Bước 1 (Hiring Manager/Trưởng bộ phận) &rarr; Bước 2 (HR Manager) &rarr; Bước 3 (Ban Giám Đốc/Approver với mức lương &ge; 30 triệu). Recruiter duyệt bị chặn `HTTP 403 Forbidden`. Sau khi đủ 3 cấp, Requisition chuyển thành công sang trạng thái `APPROVED`. |
| **TC04** | **Tạo và Xuất bản Tin tuyển dụng (Job Posting)** | **PASS (Có điều kiện)** | Vòng đời tin tuyển dụng `DRAFT &rarr; PENDING_APPROVAL &rarr; APPROVED &rarr; PUBLISHED` hoạt động hoàn chỉnh trên Backend. **Lưu ý nghiệp vụ**: Recruiter chỉ được tạo tin tuyển dụng khi đã được HR Manager phân công (`RequisitionAssignment`) phụ trách Requisition đó. |
| **TC05** | **Ứng viên xem tin và Ứng tuyển công khai** | **FAIL** | - Khách vãng lai xem được danh sách tin và chi tiết tin tại `/careers` và `/careers/:id`.<br>- **LỖI NGHIÊM TRỌNG (BUG 01)**: Giao diện nộp hồ sơ **KHÔNG upload file CV thật** lên máy chủ mà tự sinh chuỗi URL giả mạo `https://storage.local/cv/...`.<br>- **LỖI NGHIÊM TRỌNG (BUG 02)**: Backend **bỏ rơi số điện thoại, thư giới thiệu và CV**, không lưu vào thực thể `CandidateApplication` trong CSDL. |
| **TC06** | **Quản lý Hồ sơ Ứng viên & Pipeline** | **FAIL** | - **LỖI CHẶN TRUY CẬP (BUG 03)**: Recruiter đăng nhập vào hệ thống bấm vào menu *"Hồ sơ & Pipeline"* (`/recruitment/candidates`) bị màn hình **403 Forbidden** chặn lại do `App.tsx` đòi quyền `CANDIDATE_READ_ALL` thay vì `CANDIDATE_READ_ASSIGNED`.<br>- **LỖI MẤT KẾT NỐI (BUG 04)**: Trang *"Duyệt ứng viên & Offer"* (`/recruitment/approvals`) sử dụng hàm `fetch` thô không gửi Bearer JWT token nên bị **HTTP 401 Unauthorized**, bảng ứng viên hiển thị alert lỗi đỏ. |

---

## C. DANH SÁCH CHI TIẾT CÁC LỖI HỆ THỐNG PHÁT HIỆN ĐƯỢC

### 🔴 BUG 01 — Giả lập đường dẫn CV thay vì Upload tệp thực tế lên Server
- **Mã lỗi**: `BUG-E2E-01`
- **Mức độ nghiêm trọng**: **CRITICAL (Khẩn cấp - Chặn Demo & Chặn Production)**
- **Vị trí code**:
  - File: `frontend/src/pages/PublicJobDetailPage.tsx`
  - Dòng: **91 - 98** và dòng **141**
- **Cách tái hiện**:
  1. Mở trình duyệt ẩn danh, truy cập `http://localhost:5173/careers/7`.
  2. Tại khối *"Đính kèm tệp CV (PDF / DOCX)"*, chọn một tệp PDF thật từ máy tính (ví dụ: `sample_real_cv.pdf`).
  3. Bấm nút *"Nộp hồ sơ ứng tuyển"*.
  4. Mở tab Network trong DevTools hoặc kiểm tra payload gửi đi.
- **Kết quả thực tế**:
  Trình duyệt **không gửi bất kỳ request multipart/form-data nào** lên server. Code tự động gán chuỗi URL giả:
  ```typescript
  setCvFileUrl(`https://storage.local/cv/${encodeURIComponent(file.name)}`);
  // Payload gửi lên API:
  {
    "fullName": "Ứng viên Bùi Thực Tế",
    "email": "candidate.real@example.com",
    "phone": "0901234567",
    "coverLetter": "Thư ứng tuyển...",
    "cvFileUrl": "https://storage.local/cv/sample_real_cv.pdf"
  }
  ```
- **Kết quả mong đợi**:
  Tệp PDF CV phải được upload lên server qua endpoint upload tệp chuyên dụng (như `/api/public/resumes/upload`), lưu trữ an toàn trong thư mục lưu trữ tĩnh (hoặc S3/MinIO), và trả về đường dẫn tệp thực tế có thể tải về được.
- **Phân tích nguyên nhân gốc**:
  Frontend `PublicJobDetailPage.tsx` viết dở dang, sử dụng giải pháp tạm thời (mock placeholder) mà không có logic upload file qua API client. Backend cũng hoàn toàn chưa có controller nhận file upload CV ứng viên (chỉ có upload avatar và excel).
- **Đề xuất giải pháp sửa chữa**:
  1. Backend: Bổ sung endpoint `POST /api/public/cv/upload` (hoặc cấu hình multipart trong `POST /api/public/job-postings/{id}/apply`) sử dụng `MultipartFile`, lưu file vào thư mục `uploads/cv/`.
  2. Frontend: Cập nhật `handleFileChange` trong `PublicJobDetailPage.tsx` để thực hiện upload file thực tế và nhận lại URL thật trước khi submit form.

---

### 🔴 BUG 02 — Thất thoát toàn bộ dữ liệu ứng tuyển (Số điện thoại, Thư giới thiệu, CV) tại Backend
- **Mã lỗi**: `BUG-E2E-02`
- **Mức độ nghiêm trọng**: **CRITICAL (Khẩn cấp - Thất thoát dữ liệu nghiệp vụ)**
- **Vị trí code**:
  - File Entity: `backend/auth-service/src/main/java/com/example/auth_service/entity/CandidateApplication.java` (Toàn bộ class)
  - File Service: `backend/auth-service/src/main/java/com/example/auth_service/service/JobPostingService.java` (Dòng **601 - 610**)
  - File DTO: `backend/auth-service/src/main/java/com/example/auth_service/dto/PublicJobApplicationRequest.java`
- **Cách tái hiện**:
  1. Gửi request ứng tuyển với đầy đủ: `phone: "0901234567"`, `coverLetter: "Thư giới thiệu"`, `cvFileUrl: "https://example.com/cv.pdf"`.
  2. Đăng nhập HR Manager truy vấn danh sách ứng viên từ API: `GET /api/candidates`.
  3. Kiểm tra bản ghi `CandidateApplication` vừa được lưu trong CSDL.
- **Kết quả thực tế**:
  Bản ghi trong CSDL chỉ có:
  ```json
  {
    "id": 5,
    "requisitionId": 3,
    "fullName": "Ứng viên Bùi Thực Tế",
    "email": "candidate.real@example.com",
    "stage": "APPLIED",
    "rejectionReason": null
  }
  ```
  Số điện thoại, thư giới thiệu và CV bị **vứt bỏ hoàn toàn**, không được lưu trữ.
- **Kết quả mong đợi**:
  Tất cả các thông tin ứng viên đã nhập (Số điện thoại, Thư giới thiệu, Đường dẫn/Tệp CV) phải được lưu trữ nguyên vẹn vào bảng `candidate_applications` để nhà tuyển dụng liên hệ và đánh giá hồ sơ.
- **Phân tích nguyên nhân gốc**:
  Trong `CandidateApplication.java`, thực thể JPA **hoàn toàn không có các trường `phone`, `coverLetter`, `cvFileUrl` (hoặc `resumeUrl`)**. Trong `JobPostingService.java` (dòng 601-610), hàm `applyPublic` chỉ copy `fullName`, `email`, `requisitionId`, `candidateUserId` vào entity rồi lưu xuống CSDL.
- **Đề xuất giải pháp sửa chữa**:
  1. Thêm các cột vào `CandidateApplication.java`:
     ```java
     @Column(length = 25)
     private String phone;
     @Column(columnDefinition = "TEXT")
     private String coverLetter;
     @Column(name = "cv_file_url", length = 500)
     private String cvFileUrl;
     ```
  2. Trong `JobPostingService.applyPublic`, gán các giá trị từ `req.getPhone()`, `req.getCoverLetter()`, `req.getCvFileUrl()` vào đối tượng `CandidateApplication` trước khi gọi `candidateApplications.save(app)`.
  3. Cập nhật `CandidateResponse` và `CandidateDetailDto` để trả về các trường này cho frontend hiển thị.

---

### 🟠 BUG 03 — Recruiter bị chặn HTTP 403 khi truy cập màn hình Quản lý Hồ sơ Ứng viên
- **Mã lỗi**: `BUG-E2E-03`
- **Mức độ nghiêm trọng**: **HIGH (Nghiêm trọng - Gãy luồng thao tác của Recruiter)**
- **Vị trí code**:
  - File: `frontend/src/App.tsx` (Dòng **114**, **122**, **130**)
  - File: `frontend/src/components/PermissionGuard.tsx` (Dòng **42 - 48**)
  - File: `frontend/src/layouts/Sidebar.tsx` (Dòng **261 - 270**)
  - File Backend: `backend/auth-service/src/main/java/com/example/auth_service/security/RolePermissions.java` (Dòng **74**)
- **Cách tái hiện**:
  1. Đăng nhập bằng tài khoản Recruiter: `recruiter@company.com` / `Password123@`.
  2. Tại thanh điều hướng Sidebar, click vào mục *"Hồ sơ & Pipeline"* (đường dẫn `/recruitment/candidates`).
- **Kết quả thực tế**:
  Trình duyệt ngay lập tức hiển thị màn hình lỗi:
  > **403 - Không đủ quyền truy cập**  
  > *Tài khoản của bạn không có quyền truy cập vào chức năng này.*  
  (Đã chụp ảnh minh chứng: `docs/testing/screenshots/recruiter_403_reproduced.png`).
- **Kết quả mong đợi**:
  Recruiter phải truy cập được vào trang danh sách ứng viên thuộc các yêu cầu tuyển dụng mà mình được phân công (`CANDIDATE_READ_ASSIGNED`).
- **Phân tích nguyên nhân gốc**:
  Trong `App.tsx` (dòng 114):
  ```tsx
  <Route
    path="recruitment/candidates"
    element={
      <PermissionGuard requiredPermissions={["CANDIDATE_READ_ALL"]}>
        <RecruitmentCandidatesPage />
      </PermissionGuard>
    }
  />
  ```
  `PermissionGuard` mặc định yêu cầu kiểm tra `AND` (tất cả các quyền trong mảng phải có). Tài khoản Recruiter theo thiết kế Jira S1-05 và `RolePermissions.java` chỉ được cấp quyền xem theo phân công `CANDIDATE_READ_ASSIGNED`, không có `CANDIDATE_READ_ALL`. Do đó `hasAccess = false`, dẫn đến việc bị đẩy vào trang 403. Trong khi đó, Backend API `/api/candidates` hỗ trợ cả `CANDIDATE_READ_ASSIGNED` qua `CandidateScope.java`.
- **Đề xuất giải pháp sửa chữa**:
  Sửa cấu hình `PermissionGuard` trong `App.tsx`:
  ```tsx
  <Route
    path="recruitment/candidates"
    element={
      <PermissionGuard
        requiredPermissions={["CANDIDATE_READ_ALL", "CANDIDATE_READ_ASSIGNED"]}
        requireAny
      >
        <RecruitmentCandidatesPage />
      </PermissionGuard>
    }
  />
  ```

---

### 🟠 BUG 04 — Trang Duyệt ứng viên & Offer bị lỗi HTTP 401 do hàm Fetch không gửi JWT Token
- **Mã lỗi**: `BUG-E2E-04`
- **Mức độ nghiêm trọng**: **HIGH (Nghiêm trọng - Giao diện không tải được dữ liệu)**
- **Vị trí code**:
  - File: `frontend/src/pages/CandidateApprovalsPage.tsx`
  - Dòng: **29 - 31** và dòng **61 - 65**
- **Cách tái hiện**:
  1. Đăng nhập bằng tài khoản Quản trị viên hoặc HR Manager (`admin@company.com` / `hr_manager@company.com`).
  2. Truy cập trực tiếp đường dẫn `/recruitment/approvals`.
- **Kết quả thực tế**:
  Trên màn hình xuất hiện thông báo lỗi màu đỏ:
  > **Alert: Không tải được hồ sơ (401)**  
  Toàn bộ danh sách ứng viên trống trơn, nút thao tác không hoạt động (Đã chụp ảnh minh chứng: `docs/testing/screenshots/candidate_approvals_401_reproduced.png`).
- **Kết quả mong đợi**:
  Trang phải hiển thị danh sách các hồ sơ đang ở giai đoạn `APPLIED`, `SCREENING` để người quản lý duyệt hoặc từ chối.
- **Phân tích nguyên nhân gốc**:
  Trang `CandidateApprovalsPage.tsx` sử dụng hàm `fetch()` nguyên bản của trình duyệt thay vì dùng `apiClient` (`axios` instance đã có sẵn interceptor tự động đính kèm `Authorization: Bearer <token>`).
  ```typescript
  // Dòng 29:
  const response = await fetch('/api/candidates?page=0&size=100', {
    credentials: 'include', // Chỉ gửi cookie, KHÔNG GỬI Authorization Header!
  });
  ```
  Hệ thống xác thực dùng Bearer JWT Token lưu trong LocalStorage, dẫn đến Spring Security chặn request và trả về `HTTP 401 Unauthorized`.
- **Đề xuất giải pháp sửa chữa**:
  Thay thế `fetch()` bằng `apiClient.get('/api/candidates')` và `apiClient.patch(...)` từ `../api/client`, hoặc lấy token từ `localStorage.getItem('token')` đính kèm vào header:
  ```typescript
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
  }
  ```

---

### 🟡 BUG 05 — Thiếu Validation `@NotNull` trên DTO `RequisitionRequest` gây lỗi Server HTTP 500
- **Mã lỗi**: `BUG-E2E-05`
- **Mức độ nghiêm trọng**: **MEDIUM (Trung bình - Xử lý lỗi ngoại lệ chưa triệt để)**
- **Vị trí code**:
  - File: `backend/auth-service/src/main/java/com/example/auth_service/dto/RequisitionRequest.java` (Dòng 25)
  - File: `backend/auth-service/src/main/java/com/example/auth_service/service/RecruitmentRequisitionService.java`
- **Cách tái hiện**:
  Gửi request tạo yêu cầu tuyển dụng với body `{ "title": "Tuyển dụng Backend" }` (bỏ trống `departmentId`).
- **Kết quả thực tế**:
  Server trả về `HTTP 500 Internal Server Error` thay vì trả về `HTTP 400 Bad Request` kèm thông điệp lỗi trường dữ liệu bắt buộc.
- **Nguyên nhân cốt lõi**:
  Trường `departmentId` trong `RequisitionRequest.java` không có annotation `@NotNull(message = "Phòng ban không được để trống")`, dẫn đến NullPointerException trong service layer khi tra cứu cấu hình quy trình duyệt theo phòng ban.
- **Đề xuất giải pháp sửa chữa**:
  Bổ sung `@NotNull(message = "Phòng ban không được để trống")` cho trường `departmentId` trong `RequisitionRequest.java`.

---

## D. HỆ THỐNG BẰNG CHỨNG KIỂM THỬ THỰC TẾ

Tất cả các ảnh chụp màn hình kiểm thử thực tế trên các kích thước màn hình tiêu chuẩn (Desktop 1920x1080, 1440x900, 1366x768; Tablet 768x1024; Mobile 390x844) và các bằng chứng tái hiện lỗi đã được lưu trữ tập trung tại thư mục:  
`docs/testing/screenshots/`

### 1. Bằng chứng tái hiện 4 Lỗi hệ thống:
1. **BUG 01 (Upload CV giả)**:  
   - Ảnh biểu mẫu khi đính kèm PDF: `docs/testing/screenshots/05_cv_fake_upload_form.png`  
   - Payload ghi nhận trong Network: `cvFileUrl: "https://storage.local/cv/sample_real_cv.pdf"`  
2. **BUG 02 (Thất thoát dữ liệu Backend)**:  
   - Bản ghi CSDL được trả về từ `GET /api/candidates`: Hoàn toàn không có thuộc tính `phone`, `coverLetter`, `cvFileUrl`.  
3. **BUG 03 (Recruiter gặp màn hình 403)**:  
   - Ảnh chụp màn hình: `docs/testing/screenshots/recruiter_403_reproduced.png` (Hiển thị card đỏ *"403 - Không đủ quyền truy cập - Truy cập bị từ chối"*).  
4. **BUG 04 (Trang duyệt ứng viên bị 401)**:  
   - Ảnh chụp màn hình: `docs/testing/screenshots/candidate_approvals_401_reproduced.png` (Hiển thị alert đỏ *"Không tải được hồ sơ (401)"*).  

### 2. Bằng chứng kiểm thử đa kích thước hiển thị (Responsive Viewports):
- **Cổng tuyển dụng công khai (`/careers`)**:  
  - 1920x1080: `docs/testing/screenshots/careers_1920x1080.png`  
  - 1440x900: `docs/testing/screenshots/careers_1440x900.png`  
  - 1366x768: `docs/testing/screenshots/careers_1366x768.png`  
  - 768x1024: `docs/testing/screenshots/careers_768x1024.png`  
  - 390x844: `docs/testing/screenshots/careers_390x844.png`  
- **Chi tiết tin tuyển dụng & Form ứng tuyển (`/careers/:id`)**:  
  - 1920x1080: `docs/testing/screenshots/job_detail_1920x1080.png`  
  - 1440x900: `docs/testing/screenshots/job_detail_1440x900.png`  
  - 1366x768: `docs/testing/screenshots/job_detail_1366x768.png`  
  - 768x1024: `docs/testing/screenshots/job_detail_768x1024.png`  
  - 390x844: `docs/testing/screenshots/job_detail_390x844.png`  
- **Danh sách Yêu cầu tuyển dụng nội bộ (`/recruitment/requisitions`)**:  
  - 1920x1080: `docs/testing/screenshots/requisitions_1920x1080.png`  
  - 1440x900: `docs/testing/screenshots/requisitions_1440x900.png`  
  - 1366x768: `docs/testing/screenshots/requisitions_1366x768.png`  
  - 768x1024: `docs/testing/screenshots/requisitions_768x1024.png`  
  - 390x844: `docs/testing/screenshots/requisitions_390x844.png`  
- **Quản lý Tin tuyển dụng (`/recruitment/job-postings`)**:  
  - 1920x1080: `docs/testing/screenshots/job_postings_1920x1080.png`  
  - 1440x900: `docs/testing/screenshots/job_postings_1440x900.png`  
  - 1366x768: `docs/testing/screenshots/job_postings_1366x768.png`  
  - 768x1024: `docs/testing/screenshots/job_postings_768x1024.png`  
  - 390x844: `docs/testing/screenshots/job_postings_390x844.png`  
- **Quản lý Hồ sơ ứng viên (`/recruitment/candidates`)**:  
  - 1920x1080: `docs/testing/screenshots/candidates_hr_1920x1080.png`  
  - 1440x900: `docs/testing/screenshots/candidates_hr_1440x900.png`  
  - 1366x768: `docs/testing/screenshots/candidates_hr_1366x768.png`  
  - 768x1024: `docs/testing/screenshots/candidates_hr_768x1024.png`  
  - 390x844: `docs/testing/screenshots/candidates_hr_390x844.png`  

---

## E. KẾT LUẬN VÀ KHUYẾN NGHỊ ĐIỀU KIỆN MERGE

### 1. Trả lời các câu hỏi đánh giá cốt lõi:
- **Đã chạy được toàn bộ 6 bước bằng dữ liệu thật chưa?**  
  👉 **Chưa thể hoàn thành trọn vẹn 100% bằng dữ liệu thật.** Hệ thống backend và frontend kết nối được với nhau, dữ liệu tài khoản, phòng ban, chức danh, yêu cầu tuyển dụng, tin tuyển dụng và nộp hồ sơ đều chạy trên CSDL thật. Tuy nhiên, luồng ứng tuyển bị **gãy ở khâu lưu trữ CV (dùng link giả)** và **thất thoát dữ liệu liên hệ**, đồng thời vai trò Recruiter bị **chặn truy cập 403** trên màn hình quản lý ứng viên.
- **Bước nào PASS? Bước nào FAIL?**  
  - **PASS**: TC01 (Đăng nhập), TC03 (Phê duyệt yêu cầu đa cấp), TC04 (Tạo & Xuất bản tin tuyển dụng - có phân công).  
  - **PARTIAL PASS**: TC02 (Tạo yêu cầu tuyển dụng - chuyển được PENDING_APPROVAL nhưng lỗi DRAFT và thiếu validation).  
  - **FAIL**: TC05 (Ứng viên ứng tuyển - do BUG 01 & BUG 02), TC06 (Quản lý hồ sơ ứng viên - do BUG 03 & BUG 04).  
- **Lỗi nào bắt buộc sửa trước khi Demo?**  
  👉 **BẮT BUỘC SỬA CẢ 4 LỖI (BUG 01, BUG 02, BUG 03, BUG 04)** trước buổi demo:  
  1. *BUG 03*: Sửa `PermissionGuard` trong `App.tsx` cho phép Recruiter vào được `/recruitment/candidates`. Nếu không sửa, người dùng đóng vai Recruiter trong buổi demo sẽ bị đập vào mắt lỗi 403 ngay lập tức.  
  2. *BUG 04*: Sửa `fetch` thành `apiClient` trong `CandidateApprovalsPage.tsx` để không bị lỗi 401.  
  3. *BUG 02*: Thêm cột `phone`, `coverLetter`, `cvFileUrl` vào `CandidateApplication` backend để không bị mất dữ liệu ứng viên.  
  4. *BUG 01*: Thay vì fake `https://storage.local/cv/...`, cần hỗ trợ upload file thực hoặc ít nhất cho phép dán link CV online hợp lệ để nhà tuyển dụng có thể mở xem được.  
- **Nhánh `dev` hiện tại đã đủ điều kiện merge sang `main` chưa?**  
  👉 **CHƯA ĐỦ ĐIỀU KIỆN MERGE.**  
  Nhánh `dev` chứa 36 commits mới nhưng tồn tại 2 lỗi nghiêm trọng (Critical) và 2 lỗi cao (High) làm đứt gãy trải nghiệm người dùng cốt lõi của ATS. Sau khi hoàn thành việc fix 4 lỗi trên nhánh feature/fix độc lập, chạy lại toàn bộ regression test suites (Vitest 38 files, Playwright E2E suites) đạt 100% PASS, khi đó mới đủ điều kiện tạo PR merge `dev` vào `main`.

---
*Báo cáo được khởi tạo tự động dựa trên bằng chứng kiểm thử thực nghiệm tại commit `a6619023`.*
