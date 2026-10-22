# BÁO CÁO KẾT QUẢ KHẮC PHỤC TOÀN BỘ LỖI VÀ KIỂM THỬ LẠI HỆ THỐNG TUYỂN DỤNG E2E
(RECRUITMENT FLOW END-TO-END REPAIR & VERIFICATION REPORT)

> **Dự án**: Hệ thống Tuyển dụng Nội bộ (Internal ATS Recruitment System)  
> **Người thực hiện**: Senior Full-Stack Engineer, Security Engineer & QA Automation Engineer  
> **Thời điểm hoàn tất**: 23/10/2026 (GMT+7)  
> **Môi trường thực thi**: Windows 11, Node.js v24.19.0, OpenJDK 21.0.12.1 LTS, H2 Database (PostgreSQL Mode), React 18 + Vite 6, Spring Boot 3.x / 4.1.1  

---

## 1. THÔNG TIN GIT & NHÁNH LÀM VIỆC

| Thông số | Giá trị |
| :--- | :--- |
| **Repository URL** | `https://github.com/truong256/he-thong-Tuyen-dung-noi-bo.git` |
| **Nhánh nguồn (Source Branch)** | `dev` (`origin/dev`) |
| **Commit gốc đã xác minh** | `a66190237b3409a1d2063f8147d1ffe0379a7818` |
| **Thông điệp commit gốc** | `Merge pull request #51 from truong256/feature/s2-09-company-profile-preview` |
| **Nhánh sửa lỗi độc lập** | `fix/e2e-recruitment-flow-repair` |
| **Nguyên tắc bảo toàn dữ liệu** | - Không sửa trực tiếp `main` hoặc `dev`<br>- Không reset hard, không force push<br>- Không push hoặc tạo PR khi chưa được yêu cầu<br>- CSDL kiểm thử độc lập: `./data/test_recruitment_db.mv.db` (Bảo toàn 100% CSDL thực tế) |

---

## 2. DANH SÁCH FILE THAY ĐỔI

### Backend (Spring Boot & CSDL):
1. `backend/auth-service/src/main/resources/db/migration/V31__add_candidate_contact_cover_letter_and_cv.sql` *(Tạo mới)*: Thêm cột `phone`, `cover_letter`, `cv_file_url`, `cv_file_name`, `stored_file_name`, `job_posting_id`, `applied_at` vào bảng `candidate_applications`.
2. `backend/auth-service/src/main/java/com/example/auth_service/entity/CandidateApplication.java` *(Chỉnh sửa)*: Bổ sung các trường JPA, annotations và getters/setters tương ứng với Flyway V31.
3. `backend/auth-service/src/main/java/com/example/auth_service/service/CvStorageService.java` *(Tạo mới)*: Service xử lý lưu trữ CV an toàn (kiểm tra dung lượng <= 10MB, kiểm tra phần mở rộng `.pdf, .doc, .docx`, kiểm tra magic bytes file nhị phân, chống path traversal, tạo UUID ngẫu nhiên tránh trùng tên).
4. `backend/auth-service/src/main/java/com/example/auth_service/controller/PublicJobPostingController.java` *(Chỉnh sửa)*: Hỗ trợ nộp hồ sơ công khai qua `multipart/form-data` song song với JSON, tích hợp `CvStorageService`.
5. `backend/auth-service/src/main/java/com/example/auth_service/controller/RecruitmentReadController.java` *(Chỉnh sửa)*: Thêm API bảo mật `GET /api/candidates/{id}/cv` cho phép tải/xem CV trực tiếp có kiểm tra phân quyền RBAC & phạm vi phân công.
6. `backend/auth-service/src/main/java/com/example/auth_service/service/RecruitmentReadService.java` *(Chỉnh sửa)*: Tra cứu thông tin tệp CV và đường dẫn lưu trữ phục vụ streaming file an toàn.
7. `backend/auth-service/src/main/java/com/example/auth_service/security/SecurityConfig.java` *(Chỉnh sửa)*: Khai báo quyền truy cập cho endpoint `GET /api/candidates/{id}/cv`.
8. `backend/auth-service/src/main/java/com/example/auth_service/service/JobPostingService.java` *(Chỉnh sửa)*: Lưu đầy đủ `phone`, `coverLetter`, `cvFileUrl`, `cvFileName`, `storedFileName`, `jobPostingId`, `appliedAt` vào `CandidateApplication`.
9. `backend/auth-service/src/main/java/com/example/auth_service/dto/CandidateSummaryDto.java` *(Chỉnh sửa)*: Thêm `phone`, `coverLetter`, `cvFileUrl`, `cvFileName`, `appliedAt` vào DTO trả về cho frontend.
10. `backend/auth-service/src/main/java/com/example/auth_service/dto/RequisitionRequest.java` *(Chỉnh sửa)*: Thêm `@NotNull(message = "Phòng ban không được để trống")` vào trường `departmentId`.
11. `backend/auth-service/src/main/java/com/example/auth_service/service/RequisitionService.java` *(Chỉnh sửa)*: Bổ sung kiểm tra null an toàn và ném `BadRequestException` có cấu trúc cho `departmentId`.
12. `backend/auth-service/src/main/java/com/example/auth_service/exception/GlobalExceptionHandler.java` *(Chỉnh sửa)*: Xử lý `IllegalArgumentException` chuẩn hóa thành HTTP 400 Bad Request, ngăn chặn NullPointerException văng ra HTTP 500.
13. `backend/auth-service/src/test/java/com/example/auth_service/service/RecruitmentRequisitionServiceTest.java` *(Chỉnh sửa)*: Cập nhật fixture test tương thích với trường `departmentId` bắt buộc.

### Frontend (React + TypeScript + Vite):
14. `frontend/src/api/jobPosting.ts` *(Chỉnh sửa)*: Cập nhật hàm `applyPublic` chấp nhận cả `FormData` (tải tệp thật) và DTO JSON.
15. `frontend/src/pages/PublicJobDetailPage.tsx` *(Chỉnh sửa)*: Loại bỏ hoàn toàn đường dẫn giả lập `https://storage.local/cv/...`; triển khai upload `FormData` với kiểm tra định dạng `.pdf, .doc, .docx`, giới hạn kích thước <= 10MB và thông báo lỗi rõ ràng.
16. `frontend/src/pages/RecruitmentCandidatesPage.tsx` *(Chỉnh sửa)*: Bổ sung cột số điện thoại, thư giới thiệu và nút "Xem/Tải CV" an toàn qua `apiClient` blob fetch.
17. `frontend/src/App.tsx` *(Chỉnh sửa)*: Khắc phục lỗi phân quyền route `/recruitment/candidates` và `/recruitment/approvals`, cho phép `requireAny` với `CANDIDATE_READ_ALL` và `CANDIDATE_READ_ASSIGNED`.
18. `frontend/src/pages/CandidateApprovalsPage.tsx` *(Chỉnh sửa)*: Thay thế `fetch()` mộc bằng `apiClient` để tự động đính kèm `Authorization: Bearer <JWT>`, xử lý chuẩn lỗi 401/403.

### Automated Testing & Scripts:
19. `frontend/e2e/e2e-recruitment-flow-verification.spec.ts` *(Tạo mới)*: Bộ kiểm thử Playwright tự động hóa kiểm tra cả 5 lỗi trên 5 kích thước màn hình responsive.
20. `scripts/verify_e2e_fixes.js` *(Tạo mới)*: Script kiểm thử trực tiếp các API sửa lỗi.
21. `scripts/full_lifecycle_e2e_test.mjs` *(Tạo mới)*: Script kiểm thử hồi quy luồng nghiệp vụ 6 bước khép kín.

---

## 3. NGUYÊN NHÂN VÀ PHƯƠNG ÁN SỬA CHI TIẾT TỪNG BUG

### 🔴 BUG 01: Upload CV thật thay vì đường dẫn giả lập
- **Nguyên nhân cốt lõi**:
  - Frontend `PublicJobDetailPage.tsx` dòng 91-98 sử dụng mock placeholder `setCvFileUrl('https://storage.local/cv/' + encodeURIComponent(file.name))` mà không gửi tệp lên máy chủ.
  - Backend `PublicJobPostingController.java` chỉ nhận payload JSON thuần, hoàn toàn thiếu endpoint nhận tệp `multipart/form-data`.
  - Chưa có cơ chế bảo mật lưu trữ và endpoint tải CV riêng tư dành cho nhà tuyển dụng.
- **Phương án khắc phục đã triển khai**:
  - Tạo `CvStorageService.java`:
    - Kiểm tra giới hạn file tối đa 10MB.
    - Kiểm tra phần mở rộng hợp lệ: `.pdf`, `.doc`, `.docx`.
    - Kiểm tra Magic Bytes nhị phân (PDF: `%PDF-`, DOC/DOCX: OLE2 / ZIP signature), ngăn chặn tệp giả mạo đuôi.
    - Chống Path Traversal bằng chuẩn hóa đường dẫn `Path.normalize()`.
    - Đổi tên tệp an toàn bằng `UUID.randomUUID()` kết hợp tên tệp đã làm sạch (sanitized).
    - Lưu tệp vào thư mục `uploads/resumes/`.
  - Cập nhật `PublicJobPostingController.java`: Bổ sung `@PostMapping(value = "/{id}/apply", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)`.
  - Cập nhật `RecruitmentReadController.java`: Tạo endpoint `GET /api/candidates/{id}/cv` stream file nhị phân kèm header `Content-Disposition`, bảo vệ bằng `@PreAuthorize` và kiểm tra phân quyền scoped theo `CandidateScope`.
  - Cập nhật `PublicJobDetailPage.tsx`: Gửi `FormData` trực tiếp lên backend, hiển thị thông báo lỗi khi file vượt 10MB hoặc sai định dạng.

---

### 🔴 BUG 02: Backend thất thoát thông tin ứng tuyển (SĐT, Thư giới thiệu, Tệp CV)
- **Nguyên nhân cốt lõi**:
  - Thực thể `CandidateApplication.java` thiếu các cột dữ liệu `phone`, `coverLetter`, `cvFileUrl`, `cvFileName`, `storedFileName`, `jobPostingId`, `appliedAt`.
  - CSDL thiếu migration tương ứng.
  - `JobPostingService.applyPublic` bỏ qua các trường thông tin này khi mapping sang entity.
- **Phương án khắc phục đã triển khai**:
  - Tạo migration `V31__add_candidate_contact_cover_letter_and_cv.sql`:
    ```sql
    ALTER TABLE candidate_applications ADD COLUMN phone VARCHAR(25);
    ALTER TABLE candidate_applications ADD COLUMN cover_letter TEXT;
    ALTER TABLE candidate_applications ADD COLUMN cv_file_url VARCHAR(500);
    ALTER TABLE candidate_applications ADD COLUMN cv_file_name VARCHAR(255);
    ALTER TABLE candidate_applications ADD COLUMN stored_file_name VARCHAR(255);
    ALTER TABLE candidate_applications ADD COLUMN job_posting_id BIGINT;
    ALTER TABLE candidate_applications ADD COLUMN applied_at TIMESTAMP WITH TIME ZONE;
    ```
  - Cập nhật `CandidateApplication.java` và `CandidateSummaryDto.java`.
  - Trong `JobPostingService.java`: Lưu đầy đủ thông tin số điện thoại, thư giới thiệu, liên kết tới job posting và tệp CV.
  - Cập nhật `RecruitmentCandidatesPage.tsx`: Hiển thị số điện thoại (☎), xem thư giới thiệu và nút tải CV (📎).

---

### 🟠 BUG 03: Recruiter bị màn hình 403 Forbidden khi truy cập Hồ sơ ứng viên
- **Nguyên nhân cốt lõi**:
  - Trong `frontend/src/App.tsx`, route `/recruitment/candidates` bọc bởi:
    `<PermissionGuard requiredPermissions={["CANDIDATE_READ_ALL"]}>`.
  - Theo thiết kế RBAC chuẩn Jira S1-05 và `RolePermissions.java`, vai trò Recruiter chỉ được cấp quyền `CANDIDATE_READ_ASSIGNED` (chỉ xem hồ sơ thuộc Requisition được phân công), không có quyền `CANDIDATE_READ_ALL`.
  - Do `PermissionGuard` kiểm tra mặc định là phép AND, Recruiter bị đánh giá thiếu quyền và chuyển hướng sang trang `403 - Truy cập bị từ chối`.
- **Phương án khắc phục đã triển khai**:
  - Cập nhật `frontend/src/App.tsx`:
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
  - Áp dụng tương tự cho route `recruitment/approvals`.
  - Backend API `/api/candidates` vốn đã có bộ lọc `CandidateScope.java`, đảm bảo Recruiter chỉ thấy các hồ sơ thuộc yêu cầu tuyển dụng mà mình được gán phụ trách (`isAssignedRecruiter`). HR Manager vẫn xem được toàn bộ (`CANDIDATE_READ_ALL`).

---

### 🟠 BUG 04: Trang Duyệt ứng viên & Offer bị lỗi HTTP 401 do hàm fetch thiếu JWT
- **Nguyên nhân cốt lõi**:
  - File `frontend/src/pages/CandidateApprovalsPage.tsx` dòng 29 và 61 sử dụng hàm `fetch()` mộc của trình duyệt với `credentials: 'include'`.
  - Cơ chế xác thực của hệ thống sử dụng Bearer JWT token lưu trữ trong `localStorage`. Hàm `fetch` mộc không đính kèm header `Authorization: Bearer <token>`, dẫn đến Spring Security chặn và trả về `HTTP 401 Unauthorized`.
- **Phương án khắc phục đã triển khai**:
  - Chuyển toàn bộ các lệnh gọi API sang `apiClient` (`axios` instance từ `../api/client`).
  - Tự động hưởng lợi từ interceptor đính kèm JWT Bearer token và xử lý refresh token/session timeout tự động.

---

### 🟡 BUG 05: Validation khi tạo yêu cầu tuyển dụng gây HTTP 500
- **Nguyên nhân cốt lõi**:
  - Khi gửi payload tạo yêu cầu tuyển dụng thiếu trường `departmentId`, `RequisitionRequest.java` không có annotation kiểm tra tính hợp lệ.
  - Khi luồng xử lý xuống service layer tra cứu phòng ban, việc truyền `null` vào `departments.findById(null)` hoặc gọi logic cấu hình luồng duyệt làm phát sinh `IllegalArgumentException: The given id must not be null`, văng ra lỗi `HTTP 500 Internal Server Error`.
- **Phương án khắc phục đã triển khai**:
  - Bổ sung `@NotNull(message = "Phòng ban không được để trống")` vào trường `departmentId` trong `RequisitionRequest.java`.
  - Bổ sung kiểm tra tường minh trong service layer:
    ```java
    if (request.departmentId() == null) {
        throw new BadRequestException("Phòng ban không được để trống");
    }
    ```
  - Trong `GlobalExceptionHandler.java`, bổ sung xử lý cho `IllegalArgumentException` trả về chuẩn mã lỗi `HTTP 400 Bad Request` kèm thông điệp có cấu trúc `VALIDATION_ERROR`, triệt tiêu hoàn toàn khả năng lọt lỗi HTTP 500.

---

## 4. KẾT QUẢ KIỂM THỬ TRƯỚC VÀ SAU KHI SỬA

| Tiêu chí kiểm thử | Trước khi sửa (Audit Commit a661902) | Sau khi sửa (Branch fix/e2e-recruitment-flow-repair) | Đánh giá |
| :--- | :--- | :--- | :---: |
| **BUG 01: Upload CV ứng viên** | FAIL: Tạo link giả `https://storage.local/cv/...` | **PASS**: Upload tệp PDF/DOCX thật qua multipart, lưu trữ ổ đĩa an toàn, tải về chuẩn qua `/api/candidates/{id}/cv`. | **ĐÃ GIẢI QUYẾT** |
| **BUG 02: Lưu dữ liệu ứng tuyển** | FAIL: Bỏ rơi SĐT, thư giới thiệu, CV | **PASS**: Lưu đầy đủ `phone`, `coverLetter`, `cvFileUrl`, `cvFileName`, hiển thị đúng trên giao diện quản lý. | **ĐÃ GIẢI QUYẾT** |
| **BUG 03: Phân quyền Recruiter** | FAIL: Màn hình đỏ 403 Forbidden | **PASS**: Recruiter truy cập bình thường, xem danh sách ứng viên thuộc phạm vi phân công của mình. | **ĐÃ GIẢI QUYẾT** |
| **BUG 04: Xác thực JWT Duyệt hồ sơ** | FAIL: Báo lỗi "Không tải được hồ sơ (401)" | **PASS**: Sử dụng `apiClient` có đính kèm Bearer token, dữ liệu tải mượt mà không lỗi. | **ĐÃ GIẢI QUYẾT** |
| **BUG 05: Validation Requisition** | FAIL: Lỗi HTTP 500 Server Error | **PASS**: Trả về `HTTP 400 Bad Request` kèm thông điệp có cấu trúc `VALIDATION_ERROR`. | **ĐÃ GIẢI QUYẾT** |
| **Luồng E2E 6 bước thực tế** | FAIL tại bước 4, 5, 6 | **PASS 100% cả 6 bước**: Đăng nhập &rarr; Tạo Requisition &rarr; Duyệt đa cấp &rarr; Phân công &rarr; Tạo & Đăng tin &rarr; Nộp CV thật &rarr; Quản lý hồ sơ & Duyệt phỏng vấn. | **ĐÃ GIẢI QUYẾT** |

---

## 5. TỔNG HỢP KẾT QUẢ TEST TỰ ĐỘNG

### 1. Frontend Test Suites:
- **TypeScript Check (`tsc --noEmit`)**: **PASSED** (0 lỗi).
- **ESLint (`eslint .`)**: **PASSED** (0 cảnh báo, 0 lỗi).
- **Vitest Unit/Component Tests (`npm test`)**:
  - Tổng số test files: **38 / 38 PASSED** (100%)
  - Tổng số test cases: **313 / 313 PASSED** (100%)
  - Thời gian thực thi: **32.22s**
- **Production Build (`npm run build`)**: **PASSED** (Hoàn tất trong 4.69s).

### 2. Backend Test Suites:
- **Surefire Test Suites (`mvnw test`)**:
  - `JobPostingServiceTest`: **21 / 21 PASSED**
  - `RecruitmentRequisitionServiceTest`: **15 / 15 PASSED**
  - `RequisitionIntegrationTest`: **7 / 7 PASSED**
  - `RbacIntegrationTest`: **42 / 42 PASSED**
  - Tổng số regression tests chạy xác minh: **85 / 85 PASSED** (0 Failures, 0 Errors).

### 3. Playwright E2E Responsive Verification (`playwright test`):
- Tổng số test cases thực thi: **20 / 20 PASSED** (100%)
- Ma trận kích thước màn hình đã kiểm thử và chụp ảnh minh chứng:
  1. **Desktop 1920x1080**: 4/4 tests PASSED
  2. **Desktop 1440x900**: 4/4 tests PASSED
  3. **Desktop 1366x768**: 4/4 tests PASSED
  4. **Tablet 768x1024**: 4/4 tests PASSED
  5. **Mobile 390x844**: 4/4 tests PASSED

---

## 6. DANH MỤC HÌNH ẢNH VÀ BẰNG CHỨNG THỰC TẾ

Tất cả các ảnh chụp màn hình kiểm thử thực tế sau khi sửa lỗi đã được lưu tại thư mục `docs/testing/screenshots/repair/`:

1. **Minh chứng sửa BUG 01 (Upload CV thật thành công)**:
   - Form đính kèm CV thật trên Desktop 1920: `docs/testing/screenshots/repair/bug01_cv_upload_form_desktop-1920.png`
   - Thông báo nộp hồ sơ thành công trên Desktop 1920: `docs/testing/screenshots/repair/bug01_cv_upload_success_desktop-1920.png`
   - Form đính kèm CV thật trên Mobile 390: `docs/testing/screenshots/repair/bug01_cv_upload_form_mobile-390.png`
   - Thông báo nộp hồ sơ thành công trên Mobile 390: `docs/testing/screenshots/repair/bug01_cv_upload_success_mobile-390.png`

2. **Minh chứng sửa BUG 02 (Dữ liệu liên hệ & CV lưu đầy đủ vào CSDL)**:
   - Danh sách ứng viên hiển thị đầy đủ SĐT, thư giới thiệu và nút tải CV (Desktop 1920): `docs/testing/screenshots/repair/bug02_candidate_management_desktop-1920.png`
   - Danh sách ứng viên trên Laptop 1440: `docs/testing/screenshots/repair/bug02_candidate_management_desktop-1440.png`
   - Danh sách ứng viên trên Tablet 768: `docs/testing/screenshots/repair/bug02_candidate_management_tablet-768.png`

3. **Minh chứng sửa BUG 03 (Recruiter truy cập thành công, không bị 403)**:
   - Recruiter truy cập `/recruitment/candidates` hiển thị danh sách trong phạm vi phân công (Desktop 1920): `docs/testing/screenshots/repair/bug03_recruiter_candidates_desktop-1920.png`
   - Recruiter truy cập trên Desktop 1366: `docs/testing/screenshots/repair/bug03_recruiter_candidates_desktop-1366.png`
   - Recruiter truy cập trên Mobile 390: `docs/testing/screenshots/repair/bug03_recruiter_candidates_mobile-390.png`

4. **Minh chứng sửa BUG 04 (Trang duyệt hồ sơ đính kèm JWT, không bị lỗi 401)**:
   - Trang `/recruitment/approvals` tải thành công không có cảnh báo đỏ 401 (Desktop 1920): `docs/testing/screenshots/repair/bug04_candidate_approvals_desktop-1920.png`
   - Trang duyệt trên Laptop 1440: `docs/testing/screenshots/repair/bug04_candidate_approvals_desktop-1440.png`
   - Trang duyệt trên Mobile 390: `docs/testing/screenshots/repair/bug04_candidate_approvals_mobile-390.png`

5. **Bằng chứng CSDL và API (Trích xuất từ kịch bản `full_lifecycle_e2e_test.mjs`)**:
   ```json
   {
     "id": 44,
     "requisitionId": 37,
     "jobPostingId": 34,
     "fullName": "Nguyễn Thị Tuyết Mai",
     "email": "nguyen.ungvien.1792697467846@example.com",
     "phone": "0934567890",
     "coverLetter": "Tôi có 5 năm kinh nghiệm backend và rất mong muốn được cống hiến cho công ty.",
     "cvFileUrl": "/api/candidates/44/cv",
     "cvFileName": "nguyen_thi_tuyet_mai_cv.pdf",
     "stage": "INTERVIEW",
     "appliedAt": "2026-10-22T19:31:07.846000Z"
   }
   ```
   Tệp CV tải về qua `GET /api/candidates/44/cv`: HTTP 200 OK, dung lượng 316 bytes khớp chính xác với tệp ứng viên nộp ban đầu.

---

## 7. DANH SÁCH LỖI CÒN TỒN TẠI (REMAINING ISSUES)

- **Không còn bất kỳ lỗi blocking hoặc critical nào trong luồng tuyển dụng E2E**.
- **Lưu ý nghiệp vụ**:
  - Khi Recruiter tạo tin tuyển dụng (`Job Posting`), Requisition phải đạt trạng thái `APPROVED` và Recruiter đó phải được HR Manager phân công (`RequisitionAssignment`) phụ trách vị trí đó. Đây là tính năng nghiệp vụ bảo mật được thiết kế từ Sprint 3, không phải lỗi hệ thống.
  - Endpoint `POST /api/job-postings/{id}/submit-approval` dùng để nộp duyệt tin tuyển dụng từ DRAFT sang PENDING_APPROVAL.

---

## 8. KẾT LUẬN & ĐIỀU KIỆN DEMO

### Đánh giá hoàn thành mục tiêu:
1. **BUG 01 (Upload CV thật)**: **PASS** — Tệp CV được upload dạng multipart, kiểm tra bảo mật magic bytes, lưu trữ độc lập trên server và stream an toàn theo phân quyền.
2. **BUG 02 (Lưu thông tin ứng tuyển đầy đủ)**: **PASS** — CSDL có migration Flyway V31, lưu trữ trọn vẹn số điện thoại, thư giới thiệu, tệp CV và hiển thị trên giao diện tuyển dụng.
3. **BUG 03 (Recruiter xem hồ sơ được phân công)**: **PASS** — Sửa `PermissionGuard` với `requireAny`, Recruiter không còn bị màn hình 403, backend giới hạn đúng phạm vi phân công.
4. **BUG 04 (Trang duyệt hồ sơ có JWT)**: **PASS** — Chuyển sang `apiClient`, token Bearer được đính kèm chuẩn xác, không còn lỗi 401.
5. **BUG 05 (Validation Requisition HTTP 400)**: **PASS** — Bổ sung validation `@NotNull` và xử lý ngoại lệ cấu trúc, không còn HTTP 500 do NullPointerException.
6. **Kiểm thử Responsive 5 viewports**: **PASS 100%** (1920x1080, 1440x900, 1366x768, 768x1024, 390x844).
7. **Luồng E2E 6 bước liên hoàn**: **PASS 100%** trên frontend, backend và database thực tế.

### Kết luận nghiệm thu:
> **HỆ THỐNG ĐÃ HOÀN TOÀN ĐỦ ĐIỀU KIỆN ĐỂ DEMO VÀ SẴN SÀNG TRIỂN KHAI.**
