# Hướng Dẫn Kiểm Thử Chức Năng Quên Mật Khẩu / Đặt Lại Mật Khẩu Với SMTP Sandbox (Mailtrap)

Tài liệu này cung cấp hướng dẫn chi tiết về kiến trúc, cơ chế hoạt động và cách thiết lập môi trường để kiểm thử thực tế chức năng **Quên mật khẩu / Đặt lại mật khẩu** cho các tài khoản nội bộ demo (như `admin@company.com`, `recruiter@company.com`, `hr_manager@company.com`, ...) bằng SMTP Sandbox (ưu tiên **Mailtrap Email Testing**).

---

## 1. Kiến Trúc Chức Năng Đặt Lại Mật Khẩu (Password Reset Architecture)

Hệ thống tuân thủ chặt chẽ các tiêu chuẩn bảo mật doanh nghiệp (OWASP):
1. **Chống Enum Email (Anti-Enumeration):**
   - API `POST /api/auth/forgot-password` luôn trả về HTTP 200 kèm phản hồi chung:
     `{"message": "Nếu email tồn tại, hướng dẫn khôi phục mật khẩu đã được gửi."}`
   - Bất kể email có tồn tại trong hệ thống hay không, kẻ tấn công không thể phân biệt được tài khoản có tồn tại.
2. **Lưu trữ Token an toàn (Hashed Token Storage):**
   - Server sinh chuỗi ngẫu nhiên chuẩn UUID (raw token).
   - Server băm raw token bằng **SHA-256** trước khi lưu vào bảng `password_reset_tokens` trong database.
   - Raw token chỉ xuất hiện trong query parameter của liên kết gửi qua email (`?token=<raw-token>`), **tuyệt đối không lưu raw token trong database, không trả về trong JSON response, không ghi raw token ra console log**.
3. **Thời hạn và Số lần sử dụng (One-time, 30-minute Expiry):**
   - Token có hiệu lực đúng **30 phút** kể từ thời điểm tạo.
   - Token chỉ được sử dụng đúng **một lần** (`used = true`). Khi sử dụng lần thứ hai, request bị từ chối với HTTP 400.
   - Có cơ chế khóa pessimistic (`PESSIMISTIC_WRITE`) ngăn chặn race condition khi 2 request gửi đồng thời cùng một token.
4. **Thu hồi phiên đăng nhập cũ (Session Revocation):**
   - Khi đặt lại mật khẩu thành công, toàn bộ refresh token cũ của người dùng trong bảng `refresh_tokens` bị thu hồi (`revoked = true`) và `tokenVersion` của người dùng tăng lên, vô hiệu hóa tất cả các phiên đăng nhập trước đó trên mọi thiết bị.
5. **Độ an toàn khi SMTP gặp sự cố:**
   - Nếu máy chủ SMTP không khả dụng, endpoint `forgot-password` vẫn trả về thông báo chung, không để lộ stack trace hay thông tin nhạy cảm của SMTP. Lỗi chỉ được ghi an toàn vào log hệ thống.

---

## 2. Lựa Chọn Profile MailService: `dev` vs `dev,smtp`

Hệ thống hỗ trợ 2 profile gửi mail tùy theo mục đích kiểm thử:

| Profile | Bean MailService được kích hoạt | Hành vi | Trường hợp sử dụng |
| :--- | :--- | :--- | :--- |
| `dev` *(mặc định)* | `DevMailService` | Ghi log giả lập `(masked for security)`, không gửi network socket | Phát triển offline thông thường, kiểm thử tự động nội bộ |
| `dev,smtp` | `SmtpMailService` | Gửi email thực sự qua giao thức RFC 5321 (hỗ trợ STARTTLS và AUTH) | Kiểm thử thực tế với SMTP Sandbox (Mailtrap) |
| `test` | `DevMailService` | Mô phỏng trong RAM, an toàn cho CI/CD | Chạy bộ test tự động (`mvnw test`) |
| `prod` | `SmtpMailService` | Gửi email sản xuất qua SMTP server thực tế | Môi trường Production |

---

## 3. Thiết Lập Mailtrap Email Testing Sandbox

Để xem được email gửi đến `admin@company.com` mà không cần sở hữu domain `@company.com`:

1. Truy cập [https://mailtrap.io](https://mailtrap.io) và đăng ký tài khoản miễn phí.
2. Điều hướng đến **Email Testing** > **Inboxes** > Tạo hoặc chọn **My Inbox**.
3. Tại tab **SMTP Settings**, chọn tab **Integrations** và chọn `cURL` hoặc `Java`:
   - **Host:** `sandbox.smtp.mailtrap.io`
   - **Port:** `2525` (hoặc `587`, `25`)
   - **Username:** `<chuỗi_username_mailtrap_của_bạn>`
   - **Password:** `<chuỗi_password_mailtrap_của_bạn>`
   - **Auth:** `true`
   - **STARTTLS:** `true`

---

## 4. Các Biến Môi Trường Cần Cấu Hình

Thiết lập các biến môi trường sau trước khi khởi chạy Backend (hoặc cấu hình trong file `.env` cục bộ — **chú ý không commit `.env` chứa credential thật lên Git**):

```bash
# Kích hoạt profile dev kèm smtp
SPRING_PROFILES_ACTIVE=dev,smtp

# Cấu hình SMTP Mailtrap Sandbox
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USERNAME=<your-mailtrap-username>
SMTP_PASSWORD=<your-mailtrap-password>
SMTP_AUTH=true
SMTP_STARTTLS=true
SMTP_FROM=noreply@company.test

# Địa chỉ Frontend Web App
FRONTEND_URL=http://localhost:5173
```

> [!WARNING]
> **Tuyệt đối không:**
> - Hard-code username/password Mailtrap vào mã nguồn.
> - Commit file `.env` có chứa secret lên repository.
> - Sử dụng mật khẩu Gmail cá nhân chưa mã hóa.

---

## 5. Hướng Dẫn Khởi Chạy Và Kiểm Thử Thực Tế

### Bước 1: Khởi động Backend với profile `dev,smtp`

Mở terminal **PowerShell** tại thư mục gốc của repository:

```powershell
# 1. Điền credentials Mailtrap của bạn
$env:SPRING_PROFILES_ACTIVE="dev,smtp"
$env:SMTP_HOST="sandbox.smtp.mailtrap.io"
$env:SMTP_PORT="2525"
$env:SMTP_USERNAME="<DIEN_USERNAME_MAILTRAP_VAO_DAY>"
$env:SMTP_PASSWORD="<DIEN_PASSWORD_MAILTRAP_VAO_DAY>"
$env:SMTP_AUTH="true"
$env:SMTP_STARTTLS="true"
$env:SMTP_FROM="noreply@company.test"
$env:FRONTEND_URL="http://localhost:5173"

# Nếu chạy với cơ sở dữ liệu PostgreSQL cục bộ
$env:DB_URL="jdbc:postgresql://localhost:5432/recruitment_db"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD="<DIEN_PASSWORD_POSTGRES>"
$env:JWT_SECRET="c7f1a3e8b4d2e9f0a1c3e5b7d9f2a4c6e8b0d2f4a6c8e0b2d4f6a8c0e2b4d6f8"

# 2. Chạy backend
cd backend/auth-service
.\mvnw.cmd spring-boot:run
```

### Bước 2: Khởi động Frontend

Mở một cửa sổ terminal mới:

```powershell
cd frontend
npm install
npm run dev
```
Frontend sẽ chạy tại `http://localhost:5173`.

---

## 6. Kịch Bản Kiểm Thử Thủ Công End-to-End (admin@company.com)

1. Mở trình duyệt truy cập `http://localhost:5173/login`.
2. Bấm vào liên kết **"Quên mật khẩu?"** để chuyển sang trang `/forgot-password`.
3. Nhập email tài khoản quản trị viên:
   ```text
   admin@company.com
   ```
4. Bấm **"Gửi yêu cầu khôi phục"**.
   - **Kết quả mong đợi:** Giao diện hiển thị thông báo thành công:
     `Nếu email tồn tại trong hệ thống, hướng dẫn khôi phục mật khẩu đã được gửi đến hòm thư của bạn.`
5. Mở hòm thư **Mailtrap Sandbox Inbox** trên trình duyệt:
   - Xác nhận có 1 email mới với tiêu đề:
     `[Tuyển dụng nội bộ] Yêu cầu đặt lại mật khẩu`
   - Người nhận: `admin@company.com`
   - Nội dung email có:
     - Tên hệ thống: **Hệ thống Tuyển dụng Nội bộ**
     - Thông báo thời hạn: **30 phút**
     - Liên kết đặt lại mật khẩu:
       `http://localhost:5173/reset-password?token=<raw-token>`
6. Sao chép liên kết từ email và dán vào thanh địa chỉ trình duyệt (hoặc click trực tiếp).
7. Tại trang **Đặt lại mật khẩu** (`/reset-password`):
   - Nhập mật khẩu mới thỏa mãn policy: `NewAdmin123@`
   - Nhập xác nhận mật khẩu: `NewAdmin123@`
   - Bấm **"Xác nhận đặt lại mật khẩu"**.
   - **Kết quả mong đợi:** Thông báo thành công và tự động điều hướng về `/login` sau 2 giây.
8. **Kiểm tra tính một lần (One-time token):**
   - Thử mở lại liên kết reset cũ trong tab trình duyệt khác và nhập mật khẩu mới.
   - **Kết quả mong đợi:** Bị từ chối với lỗi:
     `Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng.`
9. **Kiểm tra mật khẩu cũ vs mật khẩu mới:**
   - Tại trang `/login`, thử đăng nhập với mật khẩu cũ (`Password123@`).
     -> **Kết quả:** Đăng nhập thất bại (HTTP 401).
   - Đăng nhập với mật khẩu mới (`NewAdmin123@`).
     -> **Kết quả:** Đăng nhập thành công, điều hướng vào Dashboard quản trị.

---

## 7. Chạy Bộ Kiểm Thử Tự Động (Automated Tests)

### Backend (JUnit 5 + Spring Boot Test + Mock SMTP Socket):
```powershell
cd backend/auth-service
.\mvnw.cmd test
```
*Kết quả:* **113/113 tests PASS**, bao gồm:
- Kiểm tra seed `admin@company.com` và 6 tài khoản nội bộ.
- CASE 1: Email tồn tại (tạo token băm SHA-256, thời hạn 30 phút).
- CASE 2: Email không tồn tại (chống dò email).
- CASE 3: Gửi qua socket SMTP với RFC 5321 (RCPT TO, DATA, không lộ token trong API).
- CASE 4: Đặt lại mật khẩu thành công và đổi mật khẩu trong DB.
- CASE 5: Chặn tái sử dụng token.
- CASE 6: Chặn token quá hạn 30 phút.
- CASE 7: Thu hồi các session refresh token cũ.
- CASE 8: An toàn khi SMTP ngừng hoạt động (không lộ credential/stack trace).
- Mail profile selection: `dev` -> `DevMailService`, `dev,smtp` -> `SmtpMailService`, `test` -> `DevMailService`, `prod` -> `SmtpMailService`.

### Frontend (Vitest + Playwright E2E + ESLint + TypeScript Build):
```powershell
cd frontend
npm test
npm run lint
npm run build
npx playwright test e2e/password-reset.spec.ts
```
*Kết quả:*
- Vitest: **52/52 tests PASS**.
- ESLint: **0 errors**.
- Build: **Vite build thành công**.
- Playwright E2E: **15/15 tests PASS** trên cả 5 viewport desktop và mobile (1920x1080, 1440x900, 1366x768, 768x1024, 390x844).
