# S1-05 — Phân quyền theo vai trò cho toàn hệ thống

Triển khai trong `backend/auth-service`, dựa trên `main` commit `198fce9`.
Bao gồm SCRUM-25 (danh sách quyền), SCRUM-42 (kiểm tra phía server),
SCRUM-26 (kiểm thử cho cả 7 vai trò).

## Chính sách vai trò

Nguồn khai báo duy nhất: `security/Permission.java` và `security/RolePermissions.java`.
Mỗi vai trò có quyền đọc/cập nhật hồ sơ cá nhân và đọc thông báo của chính mình.

| Vai trò | Nhóm quyền nghiệp vụ | Phạm vi đọc ứng viên | Đọc dải lương |
| --- | --- | --- | --- |
| CANDIDATE | Nộp hồ sơ, xem hồ sơ và offer của mình, phản hồi offer | Hồ sơ có `candidateUserId` trùng tài khoản đăng nhập | Không |
| RECRUITER | Danh mục, đăng tin, pipeline, điều phối phỏng vấn, offer, onboarding | Vị trí được phân công với vai trò RECRUITER | Có |
| HIRING_MANAGER | Danh mục, tạo/xem yêu cầu của mình, phỏng vấn, đánh giá | Vị trí được phân công với vai trò HIRING_MANAGER | Có |
| INTERVIEWER | Danh mục, lịch phỏng vấn được giao, phiếu đánh giá | Hồ sơ có `interviewerUserId` trùng tài khoản đăng nhập | Không |
| HR_MANAGER | Danh mục, lương, toàn bộ yêu cầu và ứng viên, phân công, phê duyệt, tuyển dụng, thông báo, báo cáo | Toàn bộ | Có |
| APPROVER | Duyệt yêu cầu tuyển dụng, duyệt offer | Không cấp quyền đọc hồ sơ ứng viên | Có |
| ADMIN | Tài khoản, vai trò, nhật ký, danh mục, lương, phân công, đọc ứng viên | Toàn bộ | Có |

Các quyền trên là chính sách mặc định của S1-05. Một tài khoản nhiều vai trò nhận
hợp các quyền được khai báo; ví dụ INTERVIEWER + HR_MANAGER có quyền đọc lương
do vai trò HR_MANAGER. ADMIN cũng dùng danh sách quyền cụ thể, không có wildcard.
Thêm enum quyền mới không tự cấp quyền đó cho bất kỳ vai trò nào.

Danh sách quyền dự kiến cho các sprint sau được khai báo sẵn nhưng **không tự mở API**.
Main hiện có chức năng xác thực và quản trị tài khoản; S1-05 bổ sung API đọc ứng viên,
đọc dải lương và phân công để thực thi hai ràng buộc dữ liệu trong tiêu chí chấp nhận.
Các chức năng pipeline/offer/phỏng vấn/báo cáo chưa có API nghiệp vụ hoàn chỉnh trong main.

## Kiểm tra phía server

- `SecurityConfig` chỉ mở đúng HTTP method + đường dẫn đã khai báo. Cuối chuỗi là
  `anyRequest().denyAll()`, kể cả đường dẫn mới dưới `/api/auth` hoặc `/api/admin`.
- API công khai chỉ gồm POST đăng ký, đăng nhập, refresh-token, quên/reset mật khẩu.
- API hồ sơ cá nhân, đổi mật khẩu và đăng xuất yêu cầu xác thực. Logout dùng danh tính
  từ token, bỏ qua email do client cung cấp.
- JWT chỉ xác định tài khoản; mỗi request nạp lại trạng thái và vai trò từ database.
  Không tin claim `roles` để cấp quyền. Tài khoản khóa/ngừng hoạt động không dùng lại được token cũ.
- Bảng `user_roles` là nguồn vai trò có hiệu lực. Không có vai trò thì không có quyền,
  không khôi phục quyền từ cột `role` cũ hoặc từ dữ liệu seed khi khởi động lại.
  Tài khoản legacy chỉ có cột `role` cần được admin gán vai trò rõ ràng qua API quản trị.
- Public register chỉ tạo CANDIDATE. Gửi `role=ADMIN` hoặc vai trò nội bộ trả HTTP 400.
- Các service quản trị, đọc dữ liệu và phân công có `@PreAuthorize` để bảo vệ cả
  lời gọi qua Spring bean. API mới phải thêm rule HTTP và kiểm tra service tương ứng.
- `CandidateScope` lọc bằng truy vấn SQL trước phân trang/count. `requisitionId` client
  gửi chỉ thu hẹp phạm vi, không thể mở rộng quyền. Chi tiết ngoài phạm vi hoặc ID không
  tồn tại cùng trả 403 để không tiết lộ sự tồn tại của hồ sơ.
- DTO ứng viên không chứa lương và thông tin phân công nội bộ. Đọc lương qua endpoint
  riêng yêu cầu `SALARY_READ` ở cả filter và service.
- Phân công recruiter/hiring manager được đọc từ `requisition_assignments`; recruiter
  không được tự phân công. INTERVIEWER được giới hạn theo từng hồ sơ phỏng vấn.

## API

Tất cả API dưới đây dùng `Authorization: Bearer <accessToken>`.

| Method | Đường dẫn | Quyền / kết quả |
| --- | --- | --- |
| GET | `/api/admin/roles` | ROLE_READ; trả ma trận 7 vai trò và quyền |
| GET | `/api/auth/permissions` | PROFILE_READ; trả quyền hiện tại của người dùng |
| GET | `/api/admin/users`, `/api/admin/users/{id}` | USER_READ |
| POST / PUT / PATCH / DELETE | API quản trị người dùng hiện có | USER_MANAGE; riêng PUT `/{id}/roles` cần ROLE_MANAGE |
| GET | `/api/candidates?page=0&size=20&requisitionId=1` | Quyền đọc ứng viên + lọc phạm vi trên server |
| GET | `/api/candidates/{id}` | Quyền đọc ứng viên + lọc phạm vi trên server |
| GET | `/api/salary-ranges?page=0&size=20` | SALARY_READ |
| GET | `/api/salary-ranges/{id}` | SALARY_READ |
| PUT | `/api/requisitions/{id}/assignments/{userId}` | RECRUITER_ASSIGN; body `{"role":"RECRUITER"}` hoặc HIRING_MANAGER; trả 204 |
| DELETE | `/api/requisitions/{id}/assignments/{userId}` | RECRUITER_ASSIGN; thu hồi phân công; trả 204 |

API đọc giới hạn kích thước trang 1–100. Phân công yêu cầu vị trí tồn tại và tài khoản
đang ACTIVE có vai trò tương ứng. Dữ liệu ứng viên là hồ sơ ứng tuyển theo từng vị trí;
một người nộp nhiều vị trí không làm lộ hồ sơ tại vị trí khác.

Lỗi thiếu đăng nhập trả 401 / `UNAUTHORIZED`:
“Vui lòng đăng nhập để truy cập chức năng này.”

Lỗi thiếu quyền trả 403 / `FORBIDDEN`:
“Bạn không có quyền truy cập chức năng này.”

Cả filter và controller trả cấu trúc `ApiErrorResponse` gồm timestamp, status,
code, message, path. CORS preflight được xử lý bởi bộ lọc CORS trước kiểm tra quyền.

## Database và tích hợp các sprint tiếp theo

`V5__rbac_resource_scope.sql` tạo bảng phân công và hồ sơ ứng tuyển cùng chỉ mục,
foreign key và ràng buộc vai trò. Migration cũng tạo `salary_ranges` và
`recruitment_requisitions` nếu chưa tồn tại vì trước đây các entity nền tảng này
chỉ được Hibernate tạo. Các migration V1–V4 được giữ nguyên.

Spring Boot 4 dùng `spring-boot-starter-flyway` để chạy migration trước Hibernate.
API tạo hồ sơ/vị trí và điều phối phỏng vấn ở các sprint sau phải ghi đúng liên kết
`requisitionId`, `candidateUserId`, `interviewerUserId` trên server; không nhận danh tính
sở hữu do client tự khai. Tái sử dụng `CandidateScope` cho tìm kiếm, export, CV và pipeline;
không gọi `findAll()` không giới hạn rồi lọc trong Java. Những API chưa khai báo vẫn bị từ chối.

## Chạy kiểm thử

Yêu cầu JDK 21 trở lên, `JAVA_HOME` trỏ tới JDK tương ứng.

```powershell
cd backend/auth-service
.\mvnw.cmd -B -ntp test
```

- `RbacIntegrationTest`: Spring context thật, MockMvc qua security filter, JWT thật,
  database H2 riêng; kiểm tra 7 vai trò, allow/deny, tiếng Việt, scope danh sách/count/chi tiết,
  đăng ký nâng quyền, claim giả, token cũ sau thu hồi quyền/khóa tài khoản, phân công và CORS.
- `RbacMigrationTest`: chạy SQL V1 + V5 trên H2 PostgreSQL mode, kiểm tra ràng buộc phân công.
- Test hiện có chạy cùng test profile H2, không dùng database PostgreSQL thật.
- Flyway bị tắt riêng trong test profile vì V2 có cú pháp PostgreSQL `ON CONFLICT (name)`
  mà H2 không hỗ trợ. Kiểm thử H2 không thay thế việc nghiệm thu migration trên PostgreSQL staging.

Mã nguồn thay đổi chỉ thuộc backend. `mvnw verify` đã chạy thành công với 49 kiểm thử,
không có ca lỗi hoặc bị bỏ qua. Việc merge và deploy được thực hiện riêng sau khi review.
