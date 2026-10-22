# HƯỚNG DẪN DEMO VÀ VẬN HÀNH HỆ THỐNG TUYỂN DỤNG NỘI BỘ (ATS)

Tài liệu này cung cấp kịch bản demo chi tiết 7 vai trò người dùng, quy trình chạy thực tế và các phương án xử lý sự cố / rollback cho Hệ thống Tuyển dụng Nội bộ.

---

## 1. Danh sách Tài khoản & Vai trò Demo

Mỗi vai trò đại diện cho một mắt xích trong chu trình tuyển dụng doanh nghiệp khép kín:

| STT | Vai trò | Email Demo | Mật khẩu mẫu qua Secret | Quyền hạn nghiệp vụ chính |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **ADMIN** (Quản trị hệ thống) | `demo.admin@example.invalid` | Cấp qua `DEMO_PASSWORD_ADMIN` | Quản trị tài khoản, phân vai trò, danh mục phòng ban, chức danh, thang lương |
| 2 | **HR_MANAGER** (Trưởng phòng Nhân sự) | `demo.hrmanager@example.invalid` | Cấp qua `DEMO_PASSWORD_HR_MANAGER` | Quản trị ngân sách định biên (Headcount), cấu hình quy trình duyệt, phân công Recruiter, theo dõi SLA |
| 3 | **HIRING_MANAGER** (Trưởng bộ phận tuyển dụng) | `demo.hiringmgr@example.invalid` | Cấp qua `DEMO_PASSWORD_HIRING_MANAGER` | Tạo yêu cầu tuyển dụng (Requisition), theo dõi phê duyệt, duyệt hồ sơ ứng viên chuyên môn |
| 4 | **APPROVER** (Người phê duyệt ngân sách/vị trí) | `demo.approver@example.invalid` | Cấp qua `DEMO_PASSWORD_APPROVER` | Xem xét và phê duyệt / từ chối yêu cầu tuyển dụng theo thẩm quyền |
| 5 | **RECRUITER** (Chuyên viên tuyển dụng) | `demo.recruiter@example.invalid` | Cấp qua `DEMO_PASSWORD_RECRUITER` | Quản lý tin tuyển dụng, xem ứng viên được phân công, cập nhật Pipeline (Sàng lọc, Phỏng vấn, Đề xuất) |
| 6 | **CANDIDATE** (Ứng viên) | `demo.candidate@example.invalid` | Cấp qua `DEMO_PASSWORD_CANDIDATE` | Xem tin tuyển dụng công khai, nộp hồ sơ kèm CV (PDF/DOCX), theo dõi trạng thái ứng tuyển |
| 7 | **INTERVIEWER** (Người phỏng vấn chuyên môn) | `demo.interviewer@example.invalid` | Cấp qua `DEMO_PASSWORD_INTERVIEWER` | Xem lịch phỏng vấn và đánh giá chuyên môn các ứng viên được phân công |

> **Lưu ý quan trọng**:
> Toàn bộ mật khẩu tài khoản demo phải được thiết lập thông qua biến môi trường an toàn tại máy chủ / CI/CD (`deploy/demo-seed.env` hoặc Render Environment Variables). Không lưu mật khẩu thật trong mã nguồn repository.

---

## 2. Kịch bản Demo Toàn diện 7 Bước (Full Recruitment Lifecycle)

### Bước 1: Quản trị Hệ thống & Thiết lập Danh mục (Admin)
- **Đăng nhập**: Sử dụng tài khoản `demo.admin@example.invalid`.
- **Thao tác**:
  1. Truy cập **Quản lý Tài khoản** (`/users`): Kiểm tra danh sách nhân sự, phân vai trò cho nhân viên mới.
  2. Truy cập **Cấu trúc Tổ chức** (`/organization`): Xem cây phòng ban (IT, HR, Sales,...).
  3. Truy cập **Chức danh & Dải lương** (`/job-titles`): Xác nhận dải lương cho các vị trí tuyển dụng.

### Bước 2: Quản lý Ngân sách Headcount (HR Manager)
- **Đăng nhập**: Sử dụng tài khoản `demo.hrmanager@example.invalid`.
- **Thao tác**:
  1. Truy cập **Ngân sách Headcount** (`/headcount-budgets`):
     - Kiểm tra 4 thẻ KPI tổng quan: Tổng chỉ tiêu, Đã sử dụng, Còn lại, Ngân sách lương.
     - Kiểm tra hạn mức tuyển dụng của từng phòng ban trước khi mở đợt tuyển mới.

### Bước 3: Tạo Yêu cầu Tuyển dụng (Hiring Manager)
- **Đăng nhập**: Sử dụng tài khoản `demo.hiringmgr@example.invalid`.
- **Thao tác**:
  1. Truy cập **Yêu cầu tuyển dụng** (`/recruitment/requisitions`).
  2. Bấm **Tạo yêu cầu mới** (`/recruitment/requests/new`):
     - Nhập vị trí: "Kỹ sư Cầu nối Frontend (React/TypeScript)".
     - Chọn phòng ban, số lượng chỉ tiêu (headcount: 2), dải lương dự kiến.
     - Chọn lý do tuyển dụng và tiêu chuẩn tuyển chọn.
  3. Bấm **Lưu bản nháp** hoặc **Gửi phê duyệt** (Submit).

### Bước 4: Phê duyệt Yêu cầu Tuyển dụng (Approver)
- **Đăng nhập**: Sử dụng tài khoản `demo.approver@example.invalid`.
- **Thao tác**:
  1. Truy cập **Yêu cầu tuyển dụng** (`/recruitment/requisitions`).
  2. Lọc theo trạng thái `SUBMITTED` / `PENDING_APPROVAL`.
  3. Mở chi tiết yêu cầu, kiểm tra ngân sách phòng ban và nhấn **Phê duyệt** (Approve).
  4. Trạng thái yêu cầu chuyển thành `APPROVED`.

### Bước 5: Phân công Recruiter & Đăng tin Tuyển dụng (HR Manager & Recruiter)
- **Phân công Recruiter** (`demo.hrmanager@example.invalid`):
  1. Tại yêu cầu đã duyệt, mở modal **Phân công Recruiter**.
  2. Gán chuyên viên phụ trách: `demo.recruiter@example.invalid`.
- **Soạn và Đăng tin** (`demo.recruiter@example.invalid`):
  1. Đăng nhập bằng tài khoản Recruiter.
  2. Truy cập **Tin tuyển dụng** (`/recruitment/job-postings`).
  3. Chọn yêu cầu tuyển dụng đã được duyệt để tạo tin (`DRAFT`).
  4. Xem trước tin tuyển dụng (Preview Modal).
  5. Bấm **Duyệt & Xuất bản** (Publish) để công khai tin lên trang nghề nghiệp.

### Bước 6: Ứng viên Ứng tuyển & Tải CV (Khách vãng lai / Candidate)
- **Không cần đăng nhập**:
  1. Truy cập trang nghề nghiệp công khai: `/careers`.
  2. Tìm kiếm và chọn tin tuyển dụng vừa xuất bản.
  3. Bấm **Ứng tuyển ngay**:
     - Điền họ tên, email, số điện thoại, kinh nghiệm.
     - Tải lên file CV thực tế (`.pdf` hoặc `.docx`).
     - Bấm **Nộp hồ sơ**.
  4. Hệ thống cấp mã hồ sơ và lưu trữ file CV bền vững vào thư mục mount (`/data/uploads/resumes`).

### Bước 7: Quản lý Hồ sơ & Pipeline Tuyển dụng (Recruiter & HR Manager)
- **Đăng nhập**: `demo.recruiter@example.invalid` hoặc `demo.hrmanager@example.invalid`.
- **Thao tác**:
  1. Nhấp menu **Hồ sơ & Pipeline** (`/recruitment/candidates`):
     - Recruiter nhìn thấy hồ sơ ứng viên thuộc vị trí mình phụ trách (phân quyền `CANDIDATE_READ_ASSIGNED`).
     - Tải về và xem nội dung file CV ứng viên đã nộp.
  2. Cập nhật giai đoạn ứng viên qua các vòng:
     - `APPLIED` → `SCREENING` → `INTERVIEW` → `SHORTLISTED` → `OFFER`.
  3. Nhấp menu **Duyệt ứng viên & Offer** (`/recruitment/approvals`):
     - Xem xét danh sách ứng viên cần đưa ra quyết định tuyển dụng.
  4. Truy cập trang **Đề nghị tuyển dụng** (`/recruitment/offers`):
     - Xem danh sách ứng viên đã vượt qua vòng phỏng vấn để chuẩn bị phát hành Offer.

---

## 3. Khởi chạy và Kiểm thử Hệ thống

### 3.1. Khởi chạy Cục bộ với PostgreSQL

```bash
# 1. Khởi chạy Backend Spring Boot với profile prod và PostgreSQL
export SPRING_PROFILES_ACTIVE=prod
export DB_URL="jdbc:postgresql://localhost:5432/recruitment_verify_pg"
export DB_USERNAME="postgres"
export DB_PASSWORD="YourDbPassword"
export JWT_SECRET="YourVeryLongAndSecureSecretKeyAtLeast64CharactersLong1234567890"
export CORS_ALLOWED_ORIGINS="http://localhost:5173"
export APP_FRONTEND_URL="http://localhost:5173"
export APP_UPLOAD_CV_DIR="./uploads/resumes"

cd backend/auth-service
./mvnw.cmd clean spring-boot:run

# 2. Khởi chạy Frontend Vite
cd ../../frontend
npm ci
npm run dev -- --port 5173
```

### 3.2. Chạy Bộ kiểm thử Tự động E2E

```bash
# Chạy bộ kịch bản kiểm thử tự động 7 bước lifecycle
node scripts/full_lifecycle_e2e_test.mjs
```

---

## 4. Quy trình Khắc phục Sự cố & Rollback

### Rollback Frontend (Vercel)
1. Truy cập Vercel Dashboard → Chọn Project `he-thong-tuyen-dung-noi-bo`.
2. Mở tab **Deployments**.
3. Chọn bản triển khai ổn định gần nhất (trước commit có lỗi).
4. Nhấn biểu tượng menu 3 chấm `...` → Chọn **Promote to Production**.
5. Kiểm tra lại URL công khai trong 30 giây.

### Rollback Backend (Render)
1. Truy cập Render Dashboard → Chọn Web Service Backend.
2. Mở tab **Events / Deploys**.
3. Chọn bản Deploy thành công trước đó → Nhấn **Rollback to this deploy**.
4. Hoặc trong GitHub repository:
   ```bash
   git revert <commit-sha-loi> -m 1
   git push origin main
   ```
   Render sẽ tự động trigger redeploy commit mới.

### An toàn Cơ sở Dữ liệu (PostgreSQL)
- Không chạy lệnh `flyway:clean`, `DROP DATABASE`, hoặc can thiệp trực tiếp vào bảng `flyway_schema_history`.
- Mọi thay đổi cấu trúc bảng luôn được thực hiện thông qua migration tăng dần (ví dụ `V33__...`).
- Bản sao lưu định kỳ được thực hiện qua lệnh:
  ```bash
  pg_dump -U postgres -d recruitment_verify_pg -Fc > backup_ats_$(date +%Y%m%d_%H%M%S).dump
  ```
