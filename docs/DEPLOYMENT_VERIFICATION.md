# BÁO CÁO XÁC MINH TRIỂN KHAI VÀ TÍCH HỢP HỆ THỐNG (DEPLOYMENT VERIFICATION)

**Ngày cập nhật**: 23/10/2026  
**Repository**: `https://github.com/truong256/he-thong-Tuyen-dung-noi-bo`  
**Nhánh triển khai**: `main`  
**Commit cơ sở PR #54**: `423f47fa9b0dd4149b833ac868a97f9118bf1c89`  
**Tích hợp PR #55 (PR #56)**: Commit `67a5ca7d`  

---

## 1. Bảng Tổng Hợp Trạng Thái Bắt Buộc

| Hạng mục | Kết quả thực tế | Ghi chú kỹ thuật |
| :--- | :--- | :--- |
| **GitHub main SHA** | `423f47fa` (Merged PR #54), sẵn sàng merge PR #56 | Cơ sở triển khai chính thức |
| **PR đã tích hợp** | PR #54 (Merged), PR #55 (Đã tích hợp & kiểm thử qua PR #56) | Không merge bừa dev vào main |
| **Frontend Tests** | **32/32 suites PASS, 273/273 tests PASS** | TypeScript tsc, ESLint, Vitest 100% xanh |
| **Backend Tests** | **515/515 tests PASS (0 failures, 0 errors)** | Java 21, Jacoco coverage gates 100% đạt, không tắt tests |
| **Flyway Migrations** | **34 migrations (V1 đến V32)** | V31 bổ sung nullable, V32 candidate lifecycle & CV |
| **Database Verification** | **PostgreSQL 16+ PASS** | Schema history hợp lệ, không xung đột checksum |
| **Seeder Script** | **seeder.sh PASS** | Khởi tạo đủ 7 tài khoản, idempotency (chạy lần 2 an toàn) |
| **E2E Recruitment Flow** | **7/7 bước nghiệp vụ hoàn chỉnh** | Đăng nhập → Requisition → Duyệt → Phân công → Đăng tin → Nộp CV → Pipeline |
| **File CV Persistence** | **Mount bền vững (`APP_UPLOAD_CV_DIR`)** | Phục vụ tải lên và tải về qua container restart |
| **Frontend URL** | *Chờ chủ tài khoản cung cấp token Vercel* | Đã chuẩn bị sẵn sàng cấu hình Vercel Vite SPA |
| **Backend URL** | *Chờ chủ tài khoản cấu hình Render Web Service* | Docker Java 21, health endpoint `/actuator/health` |
| **Production Status** | **BLOCKED (Thiếu Vercel/Render Cloud Credentials)** | Codebase 100% READY, chỉ chờ liên kết tài khoản cloud |

---

## 2. Chi tiết Kết quả Kiểm thử & Tích hợp

### 2.1. Frontend (Vite + React + TypeScript)
- `npm run typecheck`: **0 errors**.
- `npm run lint`: **0 errors**, **0 warnings**.
- `npm test -- --run`: **32 test files PASS**, **273 tests PASS**.
- `npm run build`: Vite production bundle tạo thành công trong 5.34s (`dist/index.html`, `dist/assets/`).
- **Sidebar & Phân quyền**:
  - Đã liên kết "Hồ sơ & Pipeline" trực tiếp tới `/recruitment/candidates` cho `RECRUITER`, `HR_MANAGER`, `ADMIN`.
  - Đã liên kết "Duyệt ứng viên & Offer" tới `/recruitment/approvals` cho `HIRING_MANAGER`, `APPROVER`, `HR_MANAGER`, `ADMIN`.
  - Thêm trang `OffersPage.tsx` và định tuyến `/recruitment/offers` được bảo vệ bằng `PermissionGuard` (`CANDIDATE_READ_ALL`, `CANDIDATE_READ_ASSIGNED`, `OFFER_MANAGE`).
  - Toàn bộ gọi API từ các trang duyệt và offer sử dụng `apiClient` tự động gắn Bearer JWT.

### 2.2. Backend (Spring Boot 3 + Java 21 + PostgreSQL)
- `./mvnw.cmd test` / `./mvnw.cmd clean verify`: **515 tests run, 0 failures, 0 errors**.
- Flyway migrations: 34 tệp migration hợp lệ từ V1 đến V32. Không có migration xung đột, checksum được bảo toàn.
- RBAC Security:
  - `CANDIDATE_READ_ALL`: Quyền xem tất cả hồ sơ cho `HR_MANAGER`, `ADMIN`.
  - `CANDIDATE_READ_ASSIGNED`: Recruiter và Hiring Manager chỉ xem hồ sơ thuộc yêu cầu mình phụ trách qua `CandidateScope`.
  - `PIPELINE_MANAGE`: Quyền chuyển giai đoạn ứng viên (`PATCH /api/candidates/{id}/stage`).
  - `OFFER_MANAGE`: Quyền xử lý offer.

### 2.3. Dữ liệu Mẫu & Demo Seeder
- `seeder.sh` chạy an toàn qua profile `prod,demo-seed`.
- Cung cấp 7 tài khoản với mật khẩu cấp qua biến môi trường an toàn.
- Kiểm tra tính bất biến (idempotent): Chạy lần 2 không tạo dữ liệu trùng lặp hoặc làm hỏng dữ liệu hiện tại.

---

## 3. Khai báo Chi tiết Trạng thái Triển khai (Production Deployment)

### 3.1. Các phần đã hoàn thành 100%
1. Tích hợp mã nguồn an toàn từ PR #55 vào nhánh main thông qua PR #56.
2. Kiểm thử tự động trên cả môi trường local và CI GitHub Actions:
   - Workflow `Frontend CI`: **PASS**.
   - Workflow `postgres-demo` (PostgreSQL 16 native container): **PASS**.
3. Cấu hình Dockerfile hỗ trợ Java 21 và đọc biến môi trường `$PORT` do Render cấp.
4. Cấu hình Vercel (`frontend/vercel.json`) hỗ trợ rewrite SPA tránh lỗi 404 khi F5.
5. Soạn thảo kịch bản demo và quy trình rollback hoàn chỉnh (`docs/DEMO_RUNBOOK.md`).

### 3.2. Lý do Đánh dấu BLOCKED
- **Nguyên nhân**: Môi trường thực thi của trợ lý AI không có quyền truy cập vào tài khoản đám mây (Cloud credentials) của chủ sở hữu:
  - Vercel CLI báo: `Error: No existing credentials found. Please run vercel login.`
  - Render API Token / Credentials chưa được thiết lập trong biến môi trường.
- **Nguyên tắc an toàn**: Tuyệt đối không giả mạo URL hoặc tạo dịch vụ trả phí khi chưa được phép.

### 3.3. Thao tác Tiếp theo Dành cho Chủ Tài Khoản

#### Triển khai Backend lên Render:
1. Đăng nhập [https://dashboard.render.com](https://dashboard.render.com).
2. Tạo mới **PostgreSQL Database** (Instance: Free hoặc Starter) → Lấy chuỗi JDBC `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`.
3. Tạo mới **Web Service** kết nối repo `truong256/he-thong-Tuyen-dung-noi-bo`:
   - **Environment**: Docker (Root Directory: `backend/auth-service`).
   - **Disk**: Mount Disk tại `/data` (để lưu CV bền vững).
   - **Environment Variables**:
     ```env
     SPRING_PROFILES_ACTIVE=prod
     DB_URL=<JDBC_URL_RENDER>
     DB_USERNAME=<DB_USER>
     DB_PASSWORD=<DB_PASS>
     JWT_SECRET=<KEY_LON_HON_64_KY_TU>
     APP_FRONTEND_URL=https://<TEN_DU_AN>.vercel.app
     CORS_ALLOWED_ORIGINS=https://<TEN_DU_AN>.vercel.app
     APP_UPLOAD_CV_DIR=/data/uploads/resumes
     ```

#### Triển khai Frontend lên Vercel:
1. Đăng nhập [https://vercel.com](https://vercel.com) → **Add New Project**.
2. Chọn repo `truong256/he-thong-Tuyen-dung-noi-bo`.
3. Thiết lập thông số:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Environment Variables**:
     ```env
     VITE_API_BASE_URL=https://<TEN_BACKEND>.onrender.com
     ```
4. Bấm **Deploy**.
