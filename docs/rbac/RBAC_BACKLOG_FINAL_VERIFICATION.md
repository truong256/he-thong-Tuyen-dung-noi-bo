# BÁO CÁO HOÀN THIỆN RBAC – ĐỐI CHIẾU PRODUCT BACKLOG VÀ JIRA

**Dự án:** Hệ thống Tuyển dụng Nội bộ (ATS)  
**Tài liệu đặc tả đối chiếu:**  
- File Excel: `HỆ THỐNG TUYỂN DỤNG NỘI BỘ-TTCS_T926_K5S6(20261008-101410).xlsx`  
  - Sheet `2. User Roles`: Ma trận phân quyền 7 vai trò  
  - Sheet `4. Product Backlog`: User Stories và Acceptance Criteria  
- Jira Stories liên quan: S1-05 (SCRUM-10), S1-06 (SCRUM-11), S1-07 (SCRUM-12), S1-08 (SCRUM-13), S1-09 (SCRUM-14), S1-10 (SCRUM-15), S2-05 (SCRUM-53).  
**Nhánh thực hiện:** `feature/s2-03-avatar-ui-completion`  
**Ngày báo cáo:** 08/10/2026  

---

## A. MA TRẬN PHÂN QUYỀN 7 VAI TRÒ (ROLE → MODULE → PERMISSION → DATA SCOPE)

> Ký hiệu phân quyền trong đặc tả gốc:  
> - **F (Full):** Toàn quyền trong module.  
> - **W (Write scoped):** Ghi/quản lý trong phạm vi được phân công.  
> - **W\*:** Tạo và chỉnh sửa dữ liệu do chính mình tạo / vị trí mình sở hữu.  
> - **R (Read-only):** Chỉ xem toàn bộ.  
> - **R\*:** Chỉ xem dữ liệu do chính mình tạo / thuộc vòng phỏng vấn hoặc vị trí phụ trách.  
> - **– (None):** Không có quyền truy cập.

| Role | Module | Permission Enum | Ký hiệu Backlog | Data Scope & Ràng buộc thực thi |
| :--- | :--- | :--- | :---: | :--- |
| **CANDIDATE** | Hồ sơ cá nhân | `PROFILE_READ`, `PROFILE_UPDATE` | F | Chỉ tài khoản của chính mình |
| | Hồ sơ ứng viên | `APPLICATION_CREATE`, `CANDIDATE_READ_OWN` | R* | Chỉ hồ sơ ứng tuyển của chính mình (`candidateUserId == currentUser.id`) |
| | Offer tuyển dụng | `OFFER_READ_OWN`, `OFFER_RESPOND` | R* | Chỉ offer gửi trực tiếp cho mình, phản hồi chấp nhận/từ chối |
| | Thông báo | `NOTIFICATION_READ_OWN` | R* | Chỉ thông báo gửi cho chính mình |
| **RECRUITER** | Hồ sơ cá nhân | `PROFILE_READ`, `PROFILE_UPDATE` | F | Chỉ tài khoản của chính mình |
| | Danh mục & Vị trí | `CATALOG_READ` | R | Xem danh mục, cơ cấu tổ chức, chức danh, câu hỏi |
| | Tin tuyển dụng | `JOB_MANAGE` | W | Tạo, sửa, đăng tin tuyển dụng |
| | Hồ sơ & Pipeline | `CANDIDATE_READ_ASSIGNED`, `PIPELINE_MANAGE` | W | **GAP 01 Fixed:** Chỉ xem và chuyển stage pipeline cho ứng viên thuộc Requisition được phân công (`RequisitionAssignment` có `role = RECRUITER` và `userId = currentUser.id`). Không xem/sửa ngoài phạm vi. |
| | Lịch phỏng vấn | `INTERVIEW_MANAGE` | F | Quản lý, sắp xếp lịch phỏng vấn |
| | Phiếu đánh giá | `EVALUATION_READ` | R | Xem kết quả đánh giá ứng viên trong phạm vi |
| | Offer & Onboarding | `OFFER_MANAGE`, `ONBOARDING_MANAGE` | W | Soạn thảo và quản lý quy trình offer/onboarding |
| | Email & Thông báo | `NOTIFICATION_MANAGE` | F | Gửi thông báo và email hệ thống |
| | Báo cáo & Dashboard | `REPORT_READ` | R* | Xem báo cáo hoạt động tuyển dụng phụ trách |
| | **Dải lương chuẩn** | *(Bị thu hồi - GAP 02)* | – | **Không có quyền xem dải lương chuẩn** (Jira S2-05: Chỉ HR_MANAGER) |
| **HIRING_MANAGER** | Hồ sơ cá nhân | `PROFILE_READ`, `PROFILE_UPDATE` | F | Chỉ tài khoản của chính mình |
| | Danh mục & Vị trí | `CATALOG_READ` | R | Xem danh mục và cơ cấu tổ chức |
| | Yêu cầu tuyển dụng | `REQUISITION_CREATE`, `REQUISITION_READ_OWN` | W* | Tạo và xem yêu cầu tuyển dụng do phòng ban/bản thân phụ trách |
| | Hồ sơ ứng viên | `CANDIDATE_READ_ASSIGNED` | R* | Xem ứng viên thuộc vị trí tuyển dụng phụ trách |
| | Lịch phỏng vấn | `INTERVIEW_READ_ASSIGNED` | R* | Xem lịch phỏng vấn của các vị trí thuộc bộ phận |
| | Phiếu đánh giá | `EVALUATION_READ` | R* | **GAP 03 Fixed:** Chỉ xem kết quả đánh giá (R*). **Không có quyền gửi phiếu đánh giá** (`EVALUATION_SUBMIT` đã bị loại bỏ). |
| | Offer tuyển dụng | `OFFER_READ_OWN` | R* | Xem trạng thái offer của ứng viên thuộc bộ phận mình |
| | Báo cáo & Dashboard | `REPORT_READ` | R* | Xem báo cáo tuyển dụng của bộ phận |
| | **Dải lương chuẩn** | *(Bị thu hồi - GAP 02)* | – | **Không có quyền xem dải lương chuẩn** (Jira S2-05: Chỉ HR_MANAGER) |
| **INTERVIEWER** | Hồ sơ cá nhân | `PROFILE_READ`, `PROFILE_UPDATE` | F | Chỉ tài khoản của chính mình |
| | Danh mục & Vị trí | `CATALOG_READ` | R | Xem thông tin chức danh phục vụ phỏng vấn |
| | Hồ sơ ứng viên | `CANDIDATE_READ_ASSIGNED` | R* | Xem CV của ứng viên thuộc vòng phỏng vấn được phân công (`interviewerUserId == currentUser.id`) |
| | Lịch phỏng vấn | `INTERVIEW_READ_ASSIGNED` | R* | Xem lịch phỏng vấn của chính mình |
| | Phiếu đánh giá | `EVALUATION_SUBMIT`, `EVALUATION_READ` | W* | Gửi phiếu đánh giá cho ứng viên được phân công (`POST /api/evaluations`) |
| | Thông báo | `NOTIFICATION_READ_OWN` | R* | Nhận thông báo mời phỏng vấn |
| **APPROVER** | Hồ sơ cá nhân | `PROFILE_READ`, `PROFILE_UPDATE` | F | Chỉ tài khoản của chính mình |
| | Danh mục & Vị trí | `CATALOG_READ` | R | Xem danh mục và cơ cấu tổ chức |
| | Yêu cầu tuyển dụng | `REQUISITION_APPROVE` | W* | Phê duyệt yêu cầu tuyển dụng trong thẩm quyền/được phân công |
| | Hồ sơ ứng viên | `CANDIDATE_READ_ALL` | R | Xem tổng quan danh sách ứng viên (chỉ đọc) |
| | Phiếu đánh giá | `EVALUATION_READ` | R | Xem phiếu đánh giá phục vụ xét duyệt |
| | Offer tuyển dụng | `OFFER_APPROVE` | W* | Phê duyệt offer theo thẩm quyền |
| | Báo cáo | `REPORT_READ` | R | Xem báo cáo tổng quan tuyển dụng |
| | **Dải lương chuẩn** | *(Bị thu hồi - GAP 02)* | – | **Không có quyền xem dải lương chuẩn** (Jira S2-05: Chỉ HR_MANAGER) |
| **HR_MANAGER** | Hồ sơ cá nhân | `PROFILE_READ`, `PROFILE_UPDATE` | F | Chỉ tài khoản của chính mình |
| | Cơ cấu & Chức danh | `DEPARTMENT_MANAGE`, `CATALOG_READ`, `CATALOG_MANAGE` | F | Quản lý phòng ban, chức danh, danh mục dùng chung |
| | Dải lương chuẩn | `SALARY_READ`, `SALARY_MANAGE` | F | **Duy nhất HR_MANAGER sở hữu:** Xem và quản lý dải lương chuẩn ngạch bậc (S2-05) |
| | Yêu cầu tuyển dụng | `REQUISITION_CREATE`, `REQUISITION_READ_ALL`, `REQUISITION_APPROVE`, `RECRUITER_ASSIGN` | F | Toàn quyền tạo, duyệt, phân công Recruiter cho vị trí |
| | Tin tuyển dụng | `JOB_MANAGE` | F | Toàn quyền quản lý tin đăng tuyển dụng |
| | Hồ sơ & Pipeline | `CANDIDATE_READ_ALL`, `PIPELINE_MANAGE` | F | Toàn hệ thống, không bị giới hạn assignment |
| | Lịch phỏng vấn | `INTERVIEW_MANAGE` | F | Toàn quyền quản lý lịch phỏng vấn toàn công ty |
| | Phiếu đánh giá | `EVALUATION_READ`, `EVALUATION_SUBMIT` | F | Toàn quyền xem và gửi đánh giá nếu cần |
| | Offer & Onboarding | `OFFER_MANAGE`, `OFFER_APPROVE`, `ONBOARDING_MANAGE` | F | Toàn quyền quản lý offer và tiếp nhận nhân sự mới |
| | Email & Thông báo | `NOTIFICATION_MANAGE` | F | Toàn quyền cấu hình thông báo và mẫu email |
| | Báo cáo | `REPORT_READ` | F | Toàn quyền xem báo cáo tuyển dụng toàn doanh nghiệp |
| | Người dùng & Nhật ký | `USER_READ`, `ROLE_READ`, `AUDIT_READ` | R | **GAP 05 Preserved:** Chỉ xem danh sách người dùng, vai trò, nhật ký audit. **Không có quyền tạo, sửa, khóa, xóa tài khoản hay gán vai trò** (`USER_MANAGE`, `ROLE_MANAGE`). |
| **ADMIN** | Người dùng & Nhật ký | `USER_READ`, `USER_MANAGE`, `ROLE_READ`, `ROLE_MANAGE`, `AUDIT_READ` | F | Toàn quyền quản lý tài khoản, gán vai trò, khóa/mở khóa, nhập Excel. **Có cơ chế bảo vệ tự thu hồi và bảo vệ Admin cuối cùng.** |
| | Cơ cấu & Danh mục | `DEPARTMENT_MANAGE`, `CATALOG_READ`, `CATALOG_MANAGE` | F | Quản lý cơ cấu phòng ban và danh mục dùng chung |
| | Yêu cầu tuyển dụng | `REQUISITION_CREATE`, `REQUISITION_READ_ALL`, `REQUISITION_APPROVE`, `RECRUITER_ASSIGN` | F | Toàn quyền module tuyển dụng |
| | Tin tuyển dụng | `JOB_MANAGE` | F | Quản trị tin tuyển dụng |
| | Hồ sơ & Pipeline | `CANDIDATE_READ_ALL`, `PIPELINE_MANAGE` | F | Toàn quyền quản lý hồ sơ ứng viên và pipeline |
| | Lịch phỏng vấn | `INTERVIEW_MANAGE` | F | Quản trị lịch phỏng vấn |
| | Phiếu đánh giá | `EVALUATION_READ` | R | Xem phiếu đánh giá của hệ thống |
| | Offer & Onboarding | `OFFER_MANAGE`, `OFFER_APPROVE`, `ONBOARDING_MANAGE` | F | Toàn quyền quản trị offer và onboarding |
| | Email & Thông báo | `NOTIFICATION_MANAGE` | F | Quản trị thông báo |
| | Báo cáo | `REPORT_READ` | F | Xem báo cáo hệ thống |
| | **Dải lương chuẩn** | *(Bị hạn chế - GAP 02 / Spec Conflict)* | – | **SPEC CONFLICT – NEEDS PO DECISION:** Backlog ghi chú Admin toàn quyền mọi module, nhưng S2-05 quy định chỉ HR_MANAGER xem dải lương. **Giữ chính sách hạn chế: Không cấp SALARY_READ/SALARY_MANAGE cho Admin.** |

---

## B. ĐỐI CHIẾU PRODUCT BACKLOG VÀ KHẮC PHỤC SAI LỆCH (GAPS 01 - 05)

| Vai trò | Quyền Backlog / Jira | Quyền trước sửa | Quyền sau sửa | Kết quả đối chiếu & Biện pháp kỹ thuật |
| :--- | :--- | :--- | :--- | :--- |
| **RECRUITER** (GAP 01) | S1-05: Giới hạn ứng viên theo vị trí phụ trách (W scoped) | `CANDIDATE_READ_ALL`, `SALARY_READ` | `CANDIDATE_READ_ASSIGNED`, `PIPELINE_MANAGE`, `EVALUATION_READ` *(Bỏ CANDIDATE_READ_ALL, Bỏ SALARY_READ)* | **KHẮC PHỤC HOÀN TOÀN GAP 01:** Thay `CANDIDATE_READ_ALL` bằng `CANDIDATE_READ_ASSIGNED`. `CandidateScope` SQL subquery chặn triệt để: Recruiter chỉ thấy ứng viên thuộc vị trí được phân công (`RequisitionAssignment`). Thao tác sửa stage pipeline `/api/candidates/{id}/pipeline-stage` cũng kiểm tra ownership qua `CandidateScope`. Ứng viên ngoài phạm vi trả về 403. |
| **RECRUITER, HIRING_MANAGER, APPROVER, ADMIN** (GAP 02) | Jira S2-05 (SCRUM-53): Chỉ HR_MANAGER được xem dải lương chuẩn ngạch bậc | Cả 4 vai trò đều có `SALARY_READ` (Admin có cả `SALARY_MANAGE`) | **Chỉ duy nhất HR_MANAGER giữ `SALARY_READ` và `SALARY_MANAGE`**. Bỏ quyền này khỏi 4 vai trò còn lại. | **KHẮC PHỤC HOÀN TOÀN GAP 02:** Thu hồi `SALARY_READ` khỏi RECRUITER, HIRING_MANAGER, APPROVER, ADMIN. Endpoint `/api/salary-ranges` trả về 403 Forbidden cho tất cả vai trò khác. `/api/job-titles` che dải lương nếu không phải HR_MANAGER. ADMIN ghi rõ mâu thuẫn đặc tả: SPEC CONFLICT – NEEDS PO DECISION, giữ chính sách hạn chế. |
| **HIRING_MANAGER** (GAP 03) | Sheet 2: Phiếu đánh giá của Hiring Manager là **R\*** (chỉ xem vị trí mình phụ trách, không gửi) | Có `EVALUATION_SUBMIT` | Đổi sang `EVALUATION_READ`, thu hồi `EVALUATION_SUBMIT` | **KHẮC PHỤC HOÀN TOÀN GAP 03:** Loại bỏ `EVALUATION_SUBMIT` khỏi Hiring Manager. Endpoint `POST /api/evaluations` yêu cầu `EVALUATION_SUBMIT`, chặn Hiring Manager với 403. Chỉ Interviewer được phân công (`interviewerUserId == user.id`) hoặc HR_MANAGER mới được gửi đánh giá. Hiring Manager xem đánh giá ứng viên vị trí mình qua `GET /api/evaluations/{candidateId}` (200). |
| **ADMIN** (GAP 04) | Sheet 2: Ghi chú "Admin có toàn quyền trên mọi module" | Thiếu hầu hết module nghiệp vụ (`DEPARTMENT_MANAGE`, `PIPELINE_MANAGE`, `INTERVIEW_MANAGE`, `REQUISITION_CREATE`, `OFFER_MANAGE`, v.v.) | Bổ sung đầy đủ permissions quản trị theo Sheet 2. Giữ nguyên hạn chế dải lương (GAP 02). | **KHẮC PHỤC HOÀN TOÀN GAP 04:** Bổ sung đầy đủ permissions cho Admin theo ma trận Sheet 2. Bổ sung cơ chế bảo vệ: (1) Admin không tự thu hồi quyền ADMIN của mình (403), (2) Bảo vệ tài khoản Admin duy nhất đang hoạt động: Không cho khóa, xóa hoặc thu hồi role ADMIN nếu `activeAdminCount <= 1` (400 Bad Request). |
| **HR_MANAGER** (GAP 05) | Sheet 2: Người dùng & nhật ký là **R** (chỉ đọc). S1-08 / S1-09: Chỉ ADMIN có quyền quản lý người dùng | Có `USER_READ`, `ROLE_READ`, `AUDIT_READ`. Không có `USER_MANAGE`, `ROLE_MANAGE`. | Giữ nguyên quyền chỉ đọc backend. Điều chỉnh nhãn giao diện FE thành "Danh sách tài khoản". | **KHẮC PHỤC HOÀN TOÀN GAP 05:** Backend chặn mọi API ghi tài khoản với 403 (POST/PUT/PATCH/DELETE). Frontend: Sidebar và tiêu đề trang User Management tự động đổi thành "Danh sách tài khoản" khi người dùng chỉ có `USER_READ` mà không có `USER_MANAGE`. Ẩn các nút Thêm tài khoản, Nhập Excel. |

---

## C. DANH SÁCH ENDPOINTS, PERMISSION, SCOPE VÀ KIỂM TRA BẢO MẬT

| Endpoint | HTTP Method | Required Permission | Data Scope Ràng Buộc | Role Được Phép | Kết Quả Kiểm Thử Thực Tế |
| :--- | :---: | :--- | :--- | :--- | :---: |
| `/api/candidates` | GET | `CANDIDATE_READ_ALL` hoặc `_ASSIGNED` hoặc `_OWN` | Lọc tự động theo SQL subquery: Candidate xem hồ sơ của mình; Recruiter/Hiring Manager xem vị trí được giao; Interviewer xem vòng của mình; HR/Approver/Admin xem tất cả | All authenticated | **PASS** (Filter chuẩn tại DB, không lộ dữ liệu) |
| `/api/candidates/{id}` | GET | Tương tự | Ứng viên ngoài phạm vi trả về 403 | Assigned roles / HR | **PASS** (Recruiter/HM ngoài phạm vi -> 403) |
| `/api/candidates/{id}/pipeline-stage` | PATCH | `PIPELINE_MANAGE` | Recruiter chỉ sửa được stage ứng viên thuộc requisition được phân công. HR_MANAGER / ADMIN sửa toàn bộ. | RECRUITER, HR_MANAGER, ADMIN | **PASS** (Trong phạm vi -> 200, ngoài phạm vi -> 403) |
| `/api/salary-ranges` | GET | `SALARY_READ` | Dải lương chuẩn ngạch bậc công ty | **Chỉ HR_MANAGER** | **PASS** (HR -> 200; Admin, Recruiter, HM, Approver -> 403) |
| `/api/salary-ranges/{id}` | GET | `SALARY_READ` | Chi tiết dải lương chuẩn | **Chỉ HR_MANAGER** | **PASS** (Các role khác nhận 403 với thông báo tiếng Việt) |
| `/api/job-titles` | GET | `CATALOG_READ` | Ẩn trường dải lương nếu không phải HR_MANAGER | Catalog Readers | **PASS** (HR thấy min/max salary, role khác bị che) |
| `/api/evaluations` | POST | `EVALUATION_SUBMIT` | Chỉ Interviewer được phân công cho ứng viên mới được nộp. Hiring Manager bị chặn. | INTERVIEWER, HR_MANAGER | **PASS** (Interviewer được giao -> 201; HM / Interviewer khác -> 403) |
| `/api/evaluations/{candidateId}` | GET | `EVALUATION_READ` | Chỉ xem được nếu ứng viên nằm trong scope của người dùng (vị trí phụ trách) | HM, Recruiter, Approver, HR, Admin | **PASS** (HM xem vị trí mình -> 200, vị trí khác -> 403) |
| `/api/requisitions/{id}/approve` | PUT | `REQUISITION_APPROVE` | Approver chỉ duyệt được requisition được phân công; HR/Admin duyệt toàn bộ. | APPROVER, HR_MANAGER, ADMIN | **PASS** (Được giao -> 200, ngoài phạm vi -> 403) |
| `/api/admin/users` | GET | `USER_READ` | Danh sách tài khoản hệ thống | ADMIN, HR_MANAGER | **PASS** (Admin & HR -> 200; các role khác -> 403) |
| `/api/admin/users` | POST | `USER_MANAGE` | Tạo tài khoản, mật khẩu tạm 12 ký tự ngẫu nhiên server sinh | **Chỉ ADMIN** | **PASS** (HR -> 403; Admin -> 201 gửi email kích hoạt) |
| `/api/admin/users/{id}/roles` | PUT | `ROLE_MANAGE` | Gán vai trò; chặn Admin tự thu hồi ADMIN; chặn thu hồi Admin duy nhất | **Chỉ ADMIN** | **PASS** (Tự thu hồi -> 403; Thu hồi Admin duy nhất -> 400) |
| `/api/admin/users/{id}/status` | PATCH | `USER_MANAGE` | Khóa/mở khóa tài khoản; chặn khóa Admin duy nhất | **Chỉ ADMIN** | **PASS** (Khóa Admin duy nhất -> 400; User thường -> 200) |
| `/api/admin/users/{id}` | DELETE | `USER_MANAGE` | Xóa tài khoản; chặn xóa Admin duy nhất | **Chỉ ADMIN** | **PASS** (Xóa Admin duy nhất -> 400) |
| `/api/departments` | POST/PUT/DELETE | `DEPARTMENT_MANAGE` | Quản lý phòng ban | HR_MANAGER, ADMIN | **PASS** (HR & Admin -> 200/201; 5 role khác -> 403) |

---

## D. KẾT QUẢ KIỂM THỬ THỰC TẾ (TEST SUITES)

Tất cả các kiểm thử đã được chạy thực tế trên máy trạm Windows, sử dụng Java 21 Adoptium, Maven Surefire, Vitest, TypeScript compiler, ESLint và Playwright trình duyệt Chromium trên 5 viewports (1920x1080, 1440x900, 1366x768, 768x1024, 390x844):

> **ĐÍNH CHÍNH QUAN TRỌNG VỀ SỐ LIỆU KIỂM THỬ:**  
> - **42 bài test** của `RbacIntegrationTest` là **tập con** nằm trong tổng số **270 bài test** của Backend suite (`mvnw test`).  
> - **54 bài test** của `RbacMatrix.test.ts` là **tập con** nằm trong tổng số **182 bài test** của Frontend suite (`vitest`).  
> - Báo cáo trước đây cộng gộp các tập con vào tổng dẫn đến con số 567 không chính xác. Số liệu chính thức được ghi nhận phân tách rõ ràng như bảng dưới đây:

| Test Suite | Loại kiểm thử | Passed | Failed | Skipped | Ghi chú | Kết Quả |
| :--- | :--- | :---: | :---: | :---: | :--- | :---: |
| **Backend RbacIntegrationTest** | Integration & Security Controller/Service | 42 | 0 | 0 | *Tập con chuyên sâu RBAC của backend* | **PASS** |
| **Backend RbacMigrationTest** | Test Flyway & DDL Migrations (V1, V6, V7, V20) | 2 | 0 | 0 | *Kiểm tra cột stage, APPROVER check constraint, evaluations table* | **PASS** |
| **Backend Toàn bộ Suite (auth-service)** | Surefire Maven (28 test classes) | **270** | 0 | 0 | **Tổng số tests của auth-service** (bao gồm 42 RBAC & 2 Migration) | **PASS** |
| **Frontend RbacMatrix.test.ts** | Vitest RBAC 7 Roles × Gaps | 54 | 0 | 0 | *Tập con chuyên sâu RBAC của frontend* | **PASS** |
| **Frontend Toàn bộ Suite (Vitest)** | Vitest (22 test files) | **182** | 0 | 0 | **Tổng số tests của Frontend** (bao gồm 54 RbacMatrix tests) | **PASS** |
| **Frontend TypeScript Check (`tsc --noEmit`)** | Static Typecheck | – | 0 | – | 0 lỗi biên dịch kiểu | **PASS** |
| **Frontend Linter (`eslint .`)** | Code Style & Security Lints | – | 0 | – | 0 lỗi linter | **PASS** |
| **Frontend Production Build (`vite build`)** | Rollup Bundler & Assets | – | 0 | – | Bundle thành công trong 4.34s | **PASS** |
| **Playwright E2E (`rbac-matrix.spec.ts`)** | Real Browser Tests (5 viewports: 1920, 1440, 1366, 768, 390) | **40** | 0 | 0 | **Kiểm thử thực tế cả 7 vai trò trên live backend/API** (8 ca × 5 viewports) | **PASS** |
| **TỔNG KIỂM THỬ ĐỘC LẬP THỰC THI** | **Backend (270) + Frontend (182) + E2E (40)** | **492** | **0** | **0** | **Không cộng trùng các tập con** | **100% PASS** |

### Chi tiết các ca kiểm thử bắt buộc tại mục 7:
1. `RECRUITER xem ứng viên được giao` → **PASS** (200 OK, hiển thị đúng ứng viên trong requisition được gán).
2. `RECRUITER xem ứng viên ngoài phạm vi` → **DENY** (403 Forbidden, không lộ dữ liệu).
3. `RECRUITER đọc dải lương chuẩn` → **DENY** (403 Forbidden).
4. `HIRING_MANAGER đọc phiếu đánh giá của vị trí mình` → **PASS** (200 OK).
5. `HIRING_MANAGER gửi đánh giá khi chỉ có R*` → **DENY** (403 Forbidden, do đã thu hồi `EVALUATION_SUBMIT`).
6. `INTERVIEWER gửi phiếu được giao` → **PASS** (201 Created, lưu bản ghi thật vào CSDL, cập nhật stage ứng viên thành EVALUATED).
7. `INTERVIEWER gửi phiếu không được giao` → **DENY** (403 Forbidden: "Bạn không được phân công phỏng vấn hoặc đánh giá ứng viên này").
8. `APPROVER duyệt yêu cầu được giao` → **PASS** (200 OK, cập nhật trạng thái requisition thành APPROVED trong CSDL).
9. `APPROVER duyệt yêu cầu ngoài phạm vi` → **DENY** (403 Forbidden: "Bạn không được phân công phê duyệt yêu cầu tuyển dụng này").
10. `HR_MANAGER xem User/Audit` → **PASS** (200 OK, xem đầy đủ danh sách và chi tiết).
11. `HR_MANAGER sửa hoặc thay đổi role user` → **DENY** (403 Forbidden trên các endpoint mutation).
12. `ADMIN quản lý tài khoản` → **PASS** (Tạo, sửa, khóa, gán quyền, xuất/nhập Excel thành công).
13. `ADMIN tự thu hồi ADMIN của mình` → **DENY** (403 Forbidden).
14. `Khóa/xóa/thu hồi ADMIN đang hoạt động duy nhất` → **DENY** (400 Bad Request: "Không thể khóa/xóa/thu hồi vai trò của quản trị viên đang hoạt động duy nhất").
15. `User nhiều role được hợp nhất quyền` → **PASS** (User có cả INTERVIEWER + HR_MANAGER thừa hưởng trọn vẹn cả 2 quyền).
16. `Thu hồi role có hiệu lực ở thao tác kế tiếp` → **PASS** (Token cũ bị từ chối ngay khi role trong database bị gỡ bỏ).
17. `LOCKED/INACTIVE truy cập protected API` → **DENY** (401 Unauthorized do token version bị tăng và session bị revoke).
18. `Không token` → **401 Unauthorized** ("Vui lòng đăng nhập để truy cập chức năng này").
19. `Token hợp lệ nhưng thiếu quyền` → **403 Forbidden** ("Bạn không có quyền truy cập chức năng này").

---

## E. PHÂN LOẠI CÁC PHẦN CÒN LẠI VÀ MÂU THUẪN ĐẶC TẢ

1. **Security Bug:** **0** (Không còn lỗi bypass, rò rỉ dữ liệu hoặc cấp thừa quyền).
2. **Backlog Mismatch:** **0** (Đã đồng bộ giữa Product Backlog, ma trận Sheet 2 và code backend/frontend cho toàn bộ 7 vai trò).
3. **Spec Conflict (Mâu thuẫn đặc tả BẮT BUỘC CHỜ PO PHÊ DUYỆT - KHÔNG TỰ Ý CHỐT THAY PO):**
   - **Mâu thuẫn quyền xem dải lương chuẩn ngạch bậc của ADMIN:**
     - *Sheet 2 (User Roles)* có ghi chú: *"Admin có toàn quyền trên mọi module"*.
     - *Sheet 4 (Product Backlog S2-05 - SCRUM-53)* Acceptance Criteria quy định: *"Chỉ HR Manager mới thấy dải lương gốc, role khác thấy dải ẩn danh"*.
     - *Quyết định kỹ thuật hiện tại (Least Privilege):* ADMIN **không** được cấp `SALARY_READ` và `SALARY_MANAGE` đối với dải lương chuẩn ngạch bậc (chỉ cấp cho `HR_MANAGER`).
     - *Trạng thái:* **SPEC CONFLICT – NEEDS PRODUCT OWNER DECISION**. Đội ngũ phát triển **không tự ý chốt thay Product Owner**. Quyết định mở rộng hay tiếp tục hạn chế Admin cần Product Owner phê duyệt bằng văn bản.
4. **Feature Chưa Triển Khai (Sprint Plan):**
   - Phỏng vấn video trực tuyến, tích hợp AI chấm điểm CV, Onboarding điện tử tự động: Các chức năng này thuộc các Sprint sau theo lộ trình Sprint Plan; hệ thống hiển thị badge "Sắp ra mắt" và thông báo lộ trình, không tạo giao diện giả lập.
5. **Môi Trường Test Bị Chặn:** **0** (Môi trường test hoạt động hoàn hảo, Maven, Vitest và Playwright đều thực thi thành công 100%).

---

## F. KẾT LUẬN VÀ TRẠNG THÁI CUỐI CÙNG

- Ma trận phân quyền đã được hoàn thiện, bảo mật chặt chẽ và đối chiếu đầy đủ với Product Backlog.
- Database migration `V20` đã được kiểm thử và nâng cấp thành công trên database PostgreSQL thực tế (`recruitment_db`) cũng như H2 dev/test.
- `CandidateEvaluationController` và `RequisitionApprovalController` đã lưu dữ liệu thật vào database, cập nhật đúng trạng thái nghiệp vụ và kiểm tra chặt chẽ assignment/ownership.
- Playwright E2E đã kiểm thử thành công toàn bộ 7 vai trò (`ADMIN`, `HR_MANAGER`, `RECRUITER`, `HIRING_MANAGER`, `INTERVIEWER`, `APPROVER`, `CANDIDATE`) trên backend và API thực tế (40/40 tests PASS qua 5 viewports).
- Toàn bộ 270 backend tests, 182 frontend tests, typecheck, lint và production build đều PASS.
- **Tuân thủ quy tắc bàn giao:** Do vẫn còn tồn tại **Spec Conflict với Jira S2-05 về quyền Admin đối với dải lương** chưa có văn bản chốt từ Product Owner, hệ thống **CHƯA tuyên bố RBAC DONE tuyệt đối** và **KHÔNG merge vào branch dev/main** cho đến khi Product Owner đưa ra quyết định chính thức.

**TRẠNG THÁI CUỐI CÙNG: HARDENED & VERIFIED (PENDING PO DECISION ON S2-05 SPEC CONFLICT)**

