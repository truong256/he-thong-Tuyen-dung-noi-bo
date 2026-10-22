# Kết quả kiểm tra ngày 23/10/2026

Nguồn bắt buộc: `main`, SHA `b14e2f49da67c36d2bbcef4b7fece95f6dff8088`.
Thay đổi chuẩn bị triển khai nằm trên `deploy/vercel-main-demo`, chưa tích hợp vào main.

| Hạng mục | Bằng chứng / kết quả |
|---|---|
| Frontend npm ci | PASS |
| Typecheck, lint, build | PASS |
| Frontend unit/component tests | 266 PASS |
| Backend Java 21 tests / verify | 515 PASS, toàn bộ coverage gate PASS, không skipTests |
| Duplicate migration regression | PASS; sau V31 có 33 phiên bản duy nhất |
| SQL trên PostgreSQL WASM test engine | Các script chạy tuần tự PASS; chỉ là bằng chứng bổ sung |
| Seeder integration | PASS trên H2 test: đủ quan hệ/trạng thái, trùng email dừng, lỗi giữa seed rollback, chạy lại không ghi đè |
| Seeder shell | bash -n PASS; thiếu DEMO_SEED_ENABLED=true trả exit 2 |
| Build thiếu backend trên Vercel | Bị từ chối đúng như yêu cầu |
| Browser cục bộ | Build production của frontend + API thật với H2 dev/test: login PASS, careers/organization mở được; 5 viewport không tràn ngang; không pageerror JS |
| PostgreSQL native + Flyway + Hibernate validate | GitHub Actions đã chạy trên PostgreSQL 16, áp dụng 33 migration, Hibernate validate và seed hai lần thành công; xem CI của SHA mới nhất trong PR cho kiểm tra HTTP |
| Docker image build | Chưa chạy do môi trường không có Docker |
| Frontend / Backend public URL | Chưa có |
| Managed PostgreSQL / upload storage | Chưa được cấp cho dự án |
| Seed production, restart/redeploy persistence | Chưa thực hiện |
| Full production E2E | Chưa thực hiện; nộp đơn và quản lý hồ sơ hoàn chỉnh NOT IMPLEMENTED |
| Production status | BLOCKED / NOT READY |

PostgreSQL native không chạy được trong môi trường local chỉ có root và không hỗ trợ đổi UID, nên được kiểm tra bằng service PostgreSQL 16 thật trên GitHub Actions. PostgreSQL WASM chỉ là kiểm tra bổ sung và không thay thế CI/native/production. Không thay đổi cấu hình production để bỏ qua lỗi migration.

CI PostgreSQL đã phát hiện năm cột entity còn thiếu; V31 bổ sung nullable mà không sửa history hoặc ghi đè dữ liệu. CI cũng phát hiện tham số text bỏ trống bị Hibernate/PostgreSQL suy luận thành bytea trong UPPER/LOWER/CONCAT. Các truy vấn tương ứng nay ép kiểu string rõ ràng; smoke test HTTP kiểm tra cả danh sách công khai và danh mục/yêu cầu nội bộ. GET hồ sơ doanh nghiệp không còn tự ghi dữ liệu giả trong transaction read-only; khi chưa cấu hình, trả trạng thái trống có thông báo rõ ràng.

Rà soát độc lập đã phát hiện và sửa lỗi trang tổ chức bị chặn bởi địa điểm chưa có API, cùng các fallback dữ liệu mẫu ở client production. Các test regression đã chạy FAIL trước khi sửa, PASS sau sửa. Giữ nguyên giao diện/stylesheet; chỉ thêm thông báo tính năng địa điểm chưa hỗ trợ lưu trên server.

Backend chạy `mvn verify` bao gồm Mockito Java agent rõ ràng cho Java 21. Một test RBAC cũ dùng nội dung thông báo lương lỗi thời đã được đồng bộ với thông báo thực tế, vẫn yêu cầu HTTP 400 và đúng nội dung nghiệp vụ. Bổ sung test mapping DepartmentResponse để kiểm tra hierarchy, thông tin quản lý và số tổng hợp nullable; coverage hiện đạt gate mà không giảm ngưỡng.

Để tiếp tục triển khai cần backend container service, PostgreSQL quản lý và volume/object storage phù hợp do chủ tài khoản cấp. Sau khi CI PostgreSQL PASS và PR tích hợp vào main, cấu hình secret trực tiếp trên nhà cung cấp, chạy seeder, lấy backend URL thật, tạo Vercel project theo `DEPLOY_MAIN_DEMO.md`, rồi kiểm thử production. Chưa đánh dấu READY trước khi có bằng chứng cho các bước này.
