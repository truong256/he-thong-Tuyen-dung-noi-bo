# S1-03 — Kiểm thử đặt lại mật khẩu

Thực hiện ngày 02/10/2026 từ nhánh `dev`, commit gốc `37d3254887ae413cc7edf52b47997bdc5b48b983`.

## Kết quả và thay đổi

| Kiểm tra | Kết quả |
| --- | --- |
| Token được cấp có hiệu lực 30 phút, DB lưu hash | PASS |
| Token hết hạn, kể cả đúng thời điểm hết 30 phút | PASS; không đổi mật khẩu |
| Reset thành công rồi dùng lại token | PASS; lần thứ hai trả HTTP 400 |
| Hai yêu cầu đồng thời dùng cùng token | PASS sau sửa; chỉ một yêu cầu trả HTTP 200 |
| Email tồn tại/không tồn tại | HTTP 200 với cùng nội dung phản hồi |
| SMTP không khả dụng | Phản hồi công khai vẫn giống nhau, không lộ chi tiết lỗi |
| Reset thu hồi hai refresh session đang có | PASS; cả hai không thể refresh |
| Đăng nhập bằng mật khẩu mới/cũ sau reset | Mới: HTTP 200; cũ: HTTP 401 |
| Profile mặc định/production | SMTP thật |
| Profile `dev` | Mô phỏng email |
| Profile `dev,smtp` | SMTP thật, bật chủ động |
| Profile có `test` | Luôn mô phỏng email |
| Liên kết email | Dùng `FRONTEND_URL`, mặc định giữ `http://localhost:5173` |
| SMTP phản hồi chứa token | Token không xuất hiện trong log/exception |

Kiểm thử phát hiện hai yêu cầu reset đồng thời đều thành công. Bổ sung khóa ghi trên truy vấn token trong transaction để lần thứ hai đọc được trạng thái `used=true` sau khi lần đầu hoàn tất.

Kiểm thử cũng phát hiện lỗi HTTP 500 khi đăng nhập sau reset: `RefreshToken.user` dùng `@OneToOne`, khiến Hibernate tạo `UNIQUE(user_id)` và bản ghi phiên đã thu hồi chặn phiên mới. Đổi sang `@ManyToOne`; migration V8 chỉ gỡ constraint unique một cột `user_id`, giữ nguyên dữ liệu, khóa ngoại và tính duy nhất của token.

Không lấy code từ `feature/forgot-password`. Giữ nguyên password policy, hash token, phản hồi chống dò email, thu hồi phiên và mặc định AUTH/STARTTLS production.

## Kiểm thử đã chạy

- Backend: **97/97 PASS**, không có test bị bỏ qua; JDK 21, Maven Wrapper.
- Frontend: **38/38 PASS**; typecheck, lint và production build PASS.
- Migration: chạy V1–V8 trên PostgreSQL 18.3 qua PGlite 0.5.8; kiểm tra DB mới và DB có constraint Hibernate cũ, chạy V8 hai lần, giữ bản ghi đã revoke, cho phép phiên mới, tiếp tục chặn trùng token và sai khóa ngoại. Đây là PostgreSQL trong WASM; chưa áp dụng migration lên database của người dùng.

Chạy lại bộ kiểm thử:

```bash
cd backend/auth-service
./mvnw test
cd ../../frontend
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

Trên Windows dùng `mvnw.cmd test`. Môi trường kiểm thử này chặn Mockito tự attach; đã chạy bằng tham số `-DargLine=-javaagent:<đường-dẫn-mockito-core-5.23.0.jar>` trỏ tới dependency Maven được resolve, không sửa cấu hình production.

Chạy riêng kiểm thử migration từ thư mục gốc repository, với dependency cài tạm bên ngoài dự án:

```bash
npm install --prefix /tmp/s1-03-sql --no-save @electric-sql/pglite@0.5.8
node backend/auth-service/scripts/verify-password-reset-migrations.mjs /tmp/s1-03-sql
```

## Gửi email trong môi trường dev

`DevMailService` vốn chỉ ghi nhận người nhận và mô phỏng gửi; không có email thật hay token trên log. Khi cần nhận email thật, đặt `SPRING_PROFILES_ACTIVE=dev,smtp` và cấu hình `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_AUTH`, `SMTP_STARTTLS` theo máy chủ SMTP; đặt `FRONTEND_URL` đúng địa chỉ frontend. Giữ credentials ngoài repository.

Với SMTP capture cục bộ đang chạy tại `127.0.0.1:1025`, có thể dùng `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, `SMTP_AUTH=false`, `SMTP_STARTTLS=false`. Các override này chỉ dành cho SMTP capture cục bộ, không sửa mặc định STARTTLS production.

Kiểm thử integration đã chạy controller → DB → SMTP socket cục bộ → đọc liên kết → reset → đăng nhập. Không có cấu hình SMTP bên ngoài hoặc quyền truy cập máy đang chạy của người dùng trong phiên này, nên chưa xác nhận email tới hộp thư thật. Phản hồi chung của API không phải bằng chứng email đã tới hộp thư.
