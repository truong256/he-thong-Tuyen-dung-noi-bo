# Triển khai demo từ main

Trạng thái: chưa triển khai production. Không có backend/database công khai được cấp cho phiên làm việc này. Không phát hành frontend riêng lẻ rồi coi hệ thống đã sẵn sàng.

## Kiến trúc và cấu hình

- Frontend Vercel: repository `truong256/he-thong-Tuyen-dung-noi-bo`, Production Branch `main`, Root Directory `frontend`, Vite, `npm ci`, `npm run build`, output `dist`. `frontend/vercel.json` có SPA fallback; `/api` không bị rewrite thành HTML.
- `VITE_API_BASE_URL` là HTTPS origin backend thực tế, không có hậu tố `/api`; `VITE_IDLE_TIMEOUT_MS=300000`. Chỉ đặt các biến công khai trong Vercel frontend.
- Backend là container Java 21, build context `backend/auth-service`, Dockerfile trong cùng thư mục. Image chạy `mvn verify`, không bỏ qua test. Chạy liên tục bằng dịch vụ container phù hợp.
- Managed PostgreSQL và secret đặt riêng theo `deploy/production.env.example`. `DB_URL` dạng JDBC, ví dụ cấu trúc `jdbc:postgresql://HOST:5432/DATABASE?sslmode=require`, username/password tách riêng. Profile `prod` kiểm tra cấu hình, không kết hợp `dev`, không fallback JWT/H2, Hibernate chỉ `validate`.
- CORS chỉ chứa các HTTPS origin chính xác, gồm frontend production. `APP_FRONTEND_URL` không có dấu `/` cuối.
- Ảnh đại diện và ảnh doanh nghiệp hiện dùng filesystem: bắt buộc gắn persistent volume tại `/data` với quyền UID 10001 trước khi công bố chức năng upload. Adapter object storage chưa được triển khai. CV/nộp hồ sơ ứng viên chưa hoàn chỉnh, không demo giả.
- SMTP chưa được cấp: không xác nhận gửi email. Cấu hình SMTP riêng rồi kiểm thử hộp thư thật.

## Migration và bảo toàn dữ liệu

Hai bản SQL cấu hình phê duyệt bị trùng ở V24/V25 được giữ nguyên nội dung trong `db/legacy-conflicts`, bên ngoài location Flyway. Bản canonical là `V24_1`, chạy sau V24 yêu cầu tuyển dụng và trước V25 hành động phê duyệt. Các SQL khác không thay checksum. V30 chỉ tạo bảng ledger cho seed.

**Database mới:** dùng schema rỗng và chạy Flyway của ứng dụng; `baseline-on-migrate=false`, `validate-on-migrate=true`, `clean-disabled=true`, `out-of-order=false`.

**Database đã tồn tại:** trước khi khởi động bản mới, sao lưu và xem schema cùng `flyway_schema_history` (version, description, script, checksum, success). Nếu lịch sử V24/V25 là bản cấu hình phê duyệt cũ, dừng để lập phương án nâng cấp riêng theo lịch sử thực tế. Không đổi history, không tự `repair`, không reset/baseline, không bật out-of-order để vượt lỗi. Bản này không tuyên bố tương thích mọi lịch sử cũ chưa được kiểm tra.

## Seeder

Chỉ chạy sau khi PR tích hợp vào `main`, checkout đúng SHA cần triển khai và `./mvnw verify` thành công. Script không tự lấy mật khẩu, không ghi secret ra console và không mở endpoint seed từ Internet.

1. Cấp các biến DB/JWT/CORS/frontend từ secret manager của backend.
2. Cấp bảy `DEMO_PASSWORD_<ROLE>` theo `deploy/demo-seed.env.example`: mỗi mật khẩu riêng, 20–72 byte, có chữ hoa/thường, số và ký tự đặc biệt. Phân phối qua password manager/kênh riêng; không gửi trong PR hoặc log.
3. Chạy từ repository root trong môi trường có Java 21:

```bash
cd backend/auth-service
./mvnw verify
cd ../..
DEMO_SEED_ENABLED=true bash ./seeder.sh
```

`SEED_JAR_PATH` có thể trỏ tới JAR đã verify nếu dùng one-off container/console của nhà cung cấp. Script bật `prod,demo-seed`, chỉ bind loopback với port ngẫu nhiên, Flyway chạy trước runner, seed xong đóng ứng dụng. Máy chủ thường chỉ chạy profile `prod` với `DEMO_SEED_ENABLED=false`.

Seed dùng một transaction, khóa hàng `department_tree_lock`, ghi ledger `recruitment-demo-v1` khi thành công. Lần sau tạo 0 bản ghi và giữ dữ liệu hiện có. Nếu email/mã demo đã tồn tại nhưng không có ledger, dừng và không nhận quyền sở hữu bản ghi đó. Lỗi ở giữa seed rollback toàn bộ dữ liệu seed; migrations đã hoàn tất vẫn được giữ lại. Không sửa/xóa ledger để ép seed lại trên dữ liệu người dùng.

## Tài khoản và số lượng dự kiến

Đây là tài khoản **được tạo khi seed chạy thành công**, chưa phải tài khoản production đã tồn tại:

| Vai trò | Email |
|---|---|
| Admin | demo.admin@example.invalid |
| HR Manager | demo.hr_manager@example.invalid |
| Hiring Manager | demo.hiring_manager@example.invalid |
| Approver | demo.approver@example.invalid |
| Recruiter | demo.recruiter@example.invalid |
| Interviewer | demo.interviewer@example.invalid |
| Candidate | demo.candidate@example.invalid |

Database mới có 7 vai trò từ Flyway. Seed tạo 7 user, 1 phòng ban, 1 chức danh, 4 danh mục, 1 khung năng lực và 2 tiêu chí (50% + 50%), 1 ngân sách, 3 yêu cầu (DRAFT/PENDING_APPROVAL/APPROVED), 1 cấu hình/1 cấp duyệt, 2 snapshot, 1 log duyệt, 1 phân công và 1 lịch sử, 1 tin PUBLISHED và 4 log tin, 1 log ngân sách. Log seed báo số thực tế của từng bảng.

## Nghiệm thu sau triển khai

Kiểm tra SHA production khớp `main`, DB đúng provider, Flyway không có migration lỗi. Kiểm tra API công khai `/api/public/job-postings` và `/api/public/departments` khi chưa đăng nhập, không lộ thông tin quản lý nội bộ. Test login từng vai trò, tạo yêu cầu, submit, duyệt đúng người/cấp, phân công recruiter, tạo tin từ yêu cầu đã duyệt, gửi duyệt/duyệt/xuất bản và xem công khai.

Reload, restart backend và redeploy frontend phải giữ dữ liệu và file upload trên volume. Kiểm tra CORS, RBAC âm tính, refresh/logout, console và kích thước 1920x1080, 1440x900, 1366x768, 768x1024, 390x844.

**NOT IMPLEMENTED:** nộp CV/đơn ứng tuyển và quản lý hồ sơ hoàn chỉnh; địa điểm chi nhánh trong trang tổ chức chỉ có dữ liệu local ở code cũ và production nay từ chối lưu local; object-storage adapter. Chưa thể đạt toàn bộ luồng E2E yêu cầu. Không dùng profile sprint6-preview hoặc mock để đánh dấu PASS.
