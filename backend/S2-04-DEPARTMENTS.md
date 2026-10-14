# S2-04 — Quản lý phòng ban và sơ đồ tổ chức (BE)

Đề tài: **Hệ thống tuyển dụng nội bộ**. Phòng ban là đơn vị sở hữu yêu cầu tuyển dụng,
quan hệ cha–con thể hiện sơ đồ tổ chức, `managerUserId` xác định người phụ trách.
Phần này triển khai SCRUM-68, SCRUM-69 và kiểm thử BE của SCRUM-71.

Code nền: `origin/dev` tại `2051eff`. Nhánh làm việc: `feature/s2-04-departments-backend`.
Chỉ sửa backend; không thay đổi FE, không triển khai thêm quy trình phê duyệt tuyển dụng.

## API và quyền

Tất cả API yêu cầu `Authorization: Bearer <accessToken>`.

| Method | Đường dẫn | Quyền | Kết quả |
| --- | --- | --- | --- |
| GET | `/api/departments?active=true` | CATALOG_READ | Danh sách; bỏ `active` để lấy cả đang/ngừng áp dụng |
| GET | `/api/departments/tree` | CATALOG_READ | Cây nhiều cấp; có cả phòng ban ngừng áp dụng để giữ cấu trúc/lịch sử |
| GET | `/api/departments/{id}` | CATALOG_READ | Chi tiết phòng ban |
| POST | `/api/departments` | DEPARTMENT_MANAGE | Tạo mới, HTTP 201 + Location |
| PUT | `/api/departments/{id}` | DEPARTMENT_MANAGE | Sửa tên, mã, mô tả, cha và người phụ trách; giữ trạng thái hiện tại |
| PATCH | `/api/departments/{id}/status` | DEPARTMENT_MANAGE | Ngừng áp dụng/kích hoạt lại |
| DELETE | `/api/departments/{id}` | DEPARTMENT_MANAGE | Chỉ xóa phòng ban chưa được sử dụng, HTTP 204 |

`DEPARTMENT_MANAGE` chỉ cấp cho **HR_MANAGER**. ADMIN đơn thuần không có quyền thay đổi
phòng ban; tài khoản có cả ADMIN và HR_MANAGER có quyền qua HR_MANAGER.
`CATALOG_READ` giữ chính sách hiện có: HR_MANAGER, ADMIN, RECRUITER, HIRING_MANAGER,
INTERVIEWER được đọc. Kiểm tra quyền ở cả HTTP filter và Spring service.

Body POST/PUT (PUT gửi đủ thông tin, `parentDepartmentId: null` để chuyển về cấp gốc):

```json
{
  "name": "Phòng Công nghệ",
  "code": "TECH",
  "description": "Phụ trách tuyển dụng nhân sự công nghệ",
  "parentDepartmentId": null,
  "managerUserId": 5
}
```

`managerUserId` phải là ID tài khoản nội bộ thực tế, ACTIVE, không bị khóa và có ít nhất
một vai trò khác CANDIDATE. Tên tối đa 100 ký tự, mã tối đa 20 ký tự (chữ/số/`-`/`_`),
mô tả tối đa 255 ký tự. Mã được chuẩn hóa thành chữ hoa; tên và mã không trùng
không phân biệt hoa/thường. Không nhận `active` từ POST/PUT; dùng endpoint trạng thái:

```json
{ "active": false }
```

Một nút cây có dạng `{ "department": { ...chi tiết phòng ban... }, "children": [] }`.
Chi tiết chứa `id`, `name`, `code`, `description`, `parentDepartmentId`, `managerUserId`,
`active`, `createdAt`; không trả thông tin nhạy cảm của tài khoản phụ trách.

## Ràng buộc nghiệp vụ

- Cho phép nhiều cấp, nhiều nút gốc; cha phải tồn tại. Cấm tự làm cha hoặc chuyển
  một nút xuống dưới bất kỳ hậu duệ nào của nó.
- Phòng ban đang áp dụng phải có toàn bộ tổ tiên đang áp dụng. Không tạo/kích hoạt
  phòng ban dưới tổ tiên đã ngừng áp dụng.
- Ngừng áp dụng các phòng ban con đang hoạt động trước khi ngừng áp dụng cha;
  kích hoạt cha trước khi kích hoạt con. Không tự động thay đổi toàn bộ cây con.
- Không xóa phòng ban có yêu cầu tuyển dụng đang mở. DRAFT, PENDING_APPROVAL,
  APPROVED, OPEN và trạng thái chưa nhận diện/null được xử lý như đang mở.
- Dù yêu cầu đã CLOSED/REJECTED/CANCELLED, vẫn giữ phòng ban để bảo toàn lịch sử:
  chỉ ngừng áp dụng thay vì xóa. Cũng chặn xóa khi có phòng ban con hoặc tài khoản
  Sprint 1 đang tham chiếu phòng ban qua tên/mã trong `users.department`.
- Ngừng áp dụng được phép khi có lịch sử/yêu cầu tuyển dụng mở; giữ nguyên ID,
  người phụ trách, quan hệ và các yêu cầu tuyển dụng. Các API tạo yêu cầu tuyển dụng
  ở sprint tiếp theo cần chọn phòng ban qua danh sách `active=true` và kiểm tra lại trạng thái ở server.
- Đổi tên/mã phòng ban đang được tài khoản Sprint 1 tham chiếu sẽ bị chặn để không
  làm mất liên kết dạng chuỗi; cần cập nhật liên kết tài khoản trước. Quan hệ của
  yêu cầu tuyển dụng dùng `departmentId` nên đổi tên không làm mất lịch sử.
- Mỗi giao dịch thay đổi phòng ban khóa dòng duy nhất `department_tree_lock` trước
  khi đọc cây. Khóa dùng chung trong database, bảo vệ cả khi chạy nhiều instance.
  Hai yêu cầu đồng thời chuyển A xuống B và B xuống A chỉ cho phép một yêu cầu thành công.

Lỗi trả theo `ApiErrorResponse` hiện có, thông báo tiếng Việt: 400 dữ liệu/người phụ trách
không hợp lệ, 401 chưa đăng nhập, 403 thiếu quyền, 404 không tìm thấy, 409 trùng dữ liệu,
vòng lặp, đang sử dụng hoặc xung đột cập nhật. Ràng buộc DB là lớp bảo vệ bổ sung khi
có tham chiếu mới phát sinh đồng thời với thao tác xóa.

## Migration V10

`V10__department_hierarchy.sql` bổ sung người phụ trách, FK cha/manager/yêu cầu tuyển dụng,
chỉ mục, kiểm tra không tự làm cha, bắt buộc manager cho phòng ban ACTIVE và khóa giao dịch.
Không sửa migration V1–V9.

Phòng ban cũ chưa có người phụ trách được **giữ lại và chuyển sang ngừng áp dụng**;
không tự chọn một tài khoản thay HR. HR dùng PUT để gán người phụ trách rồi PATCH để
kích hoạt lại theo thứ tự từ cha tới con. Trường manager có thể null ở bản ghi lịch sử
trong giai đoạn chuyển đổi; mọi tạo/sửa qua API đều yêu cầu người phụ trách.

Nếu dữ liệu cũ có tên/mã trùng sau chuẩn hóa, cha không tồn tại hoặc `departmentId`
không tồn tại trong yêu cầu tuyển dụng, cần sửa dữ liệu đó trước khi chạy migration;
migration không xóa hay tự gán lại dữ liệu tuyển dụng. Luồng phê duyệt ở sprint sau
có thể đọc `managerUserId` từ phòng ban để xác định người phụ trách.

## Kiểm thử và kết quả

```powershell
cd backend/auth-service
.\mvnw.cmd -B -ntp verify
```

- Tổng cộng **151 test đạt**, không lỗi, không bỏ qua; gồm **49 test mới** về phòng ban.
- Unit service: tạo/sửa, cây nhiều cấp, manager, trùng tên/mã, vòng lặp, xóa, trạng thái.
- Integration: JWT thật, security filter, database H2; kiểm tra đủ 7 vai trò, HTTP errors,
  giữ lịch sử tuyển dụng và chặn các trường hợp trái quyền.
- Concurrency: hai transaction đổi cha ngược nhau không tạo vòng lặp.
- JaCoCo: các lớp service/controller/DTO/exception mới đạt **100% LINE coverage**;
  `verify` đặt ngưỡng tối thiểu 60% cho từng lớp này. Báo cáo: `target/site/jacoco/index.html`.
- Đóng gói JAR thành công. Repo chưa có cấu hình Java lint riêng; `git diff --check` đạt.

Kiểm thử SQL độc lập trên PostgreSQL/PGlite, không kết nối DB dùng chung:

```powershell
npm.cmd install --prefix target/department-migration --no-save --package-lock=false @electric-sql/pglite
node scripts/verify-department-migrations.mjs target/department-migration
node scripts/verify-password-reset-migrations.mjs target/department-migration
```

Đã chạy thành công V1–V10 trên PostgreSQL 18.3 / PGlite 0.5.8 cho database mới và
database có phòng ban legacy; xác nhận FK, mã/tên duy nhất, manager bắt buộc khi ACTIVE,
chặn xóa và giữ lịch sử. Script migration cũ được sửa thứ tự số để V10 không chạy trước V2.

Phần review của thành viên khác, merge, deploy staging và PO nghiệm thu chưa được thực hiện.
