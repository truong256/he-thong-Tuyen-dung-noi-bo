# ATS — S3-04: Quản lý ngân sách headcount theo phòng ban

Gói code cho 4 task: **SCRUM-123** (DB) · **SCRUM-124** (API) · **SCRUM-125** (tính còn lại + ghi đè) · **SCRUM-127** (test).
Stack theo file yêu cầu: **NestJS (TypeScript) + JWT**; DB mặc định **sql.js** (không cần cài gì), chuyển **PostgreSQL** bằng biến môi trường.

## Chạy trong VS Code (3 bước)

Yêu cầu: **Node.js ≥ 18** (khuyên dùng 20/22).

```bash
npm install
npm run start:dev        # API http://localhost:3000 — Swagger http://localhost:3000/docs
npm run verify           # build + lint + unit test (có coverage) + e2e
```

- Mở `requests.http` (cài extension *REST Client*) và bấm **Send Request** để thử từng bước, hoặc dùng Swagger (đăng nhập → **Authorize**).
- Lần chạy đầu tự tạo dữ liệu demo (ngân sách IT năm hiện tại: 5 headcount). Dữ liệu lưu ở `data/ats.sqlite`; xoá file này để reset.
- F5 trong VS Code có sẵn cấu hình debug (`.vscode/launch.json`).

### Tài khoản demo (mật khẩu `Passw0rd!`)
| Email | Vai trò |
|---|---|
| hr.manager@company.vn | Trưởng phòng Nhân sự (**duy nhất được ghi đè**) |
| admin@company.vn | Quản trị hệ thống |
| approver@company.vn | Người duyệt |
| recruiter@company.vn | Nhân viên tuyển dụng |
| hm.it@company.vn / hm.mkt@company.vn | Trưởng bộ phận IT / Marketing |
| interviewer@company.vn | Người phỏng vấn |

### Dùng PostgreSQL
```bash
cp .env.example .env     # bỏ comment khối DB_TYPE=postgres và sửa thông tin kết nối
psql -U postgres -d ats -f db/migrations/001_headcount_budget.sql
```
(Hoặc đặt `DB_SYNC=true` để TypeORM tự tạo bảng khi dev.) Nhớ nạp biến môi trường trước khi chạy (`export $(grep -v '^#' .env | xargs)` hoặc dùng `dotenv`).

## Đối chiếu Acceptance Criteria

| AC | Cách đáp ứng | Chứng minh bằng test |
|---|---|---|
| Khai báo chỉ tiêu headcount + ngân sách lương theo phòng ban, theo năm | `POST/PUT/DELETE/GET /headcount-budgets`; UNIQUE(phòng ban, năm); lương VND số nguyên | `headcount-budget.service.spec.ts` › CRUD · e2e › AC1 |
| Yêu cầu mới hiển thị headcount còn lại | `POST/GET /requisitions` trả `budget.headcountRemaining`; `GET /headcount-budgets/remaining`; `POST /headcount-budgets/check` | `requisitions.service.spec.ts` › AC2 · e2e › AC2 |
| Vượt chỉ tiêu bị chặn; chỉ HR Manager ghi đè kèm lý do | `POST /requisitions/:id/approve` → **409** nếu vượt; override bởi người khác → **403**; thiếu lý do → **400** | `enforceOnApproval` (7 case) · e2e › AC3 |
| Mọi lần ghi đè được ghi nhật ký | Bảng `budget_audit_logs` (append-only, cả ở app lẫn trigger PostgreSQL); `GET /headcount-budgets/override-logs` | `…spec` › AC3+AC4, › nhật ký chỉ-thêm · e2e › AC4 |
| Tính theo yêu cầu đã duyệt & còn hiệu lực | Chỉ tính `APPROVED`, `FILLED`; `DRAFT/PENDING/REJECTED/CANCELLED/ON_HOLD` không tính; huỷ → trả lại headcount | spec › "chỉ tính yêu cầu ĐÃ DUYỆT…" |
| Tiền lương VND | `BIGINT`, số nguyên, validate ≥ 0 | e2e › "tiền lương VND" |

## Đối chiếu Definition of Done
- Unit test tầng service: **độ phủ nhánh ~84%** (ngưỡng 60% được ép trong `jest.config.js`, thấp hơn thì `npm test` fail).
- Build / lint / test đều pass (`npm run verify`).
- Quyền kiểm ở **backend**: guard toàn cục, **mặc định từ chối** (endpoint không khai báo `@Roles` → 403), có test 401/403 theo từng vai trò.
- UI: story này chỉ yêu cầu backend; **không có UI** nên mục 360px không áp dụng.
- Các mục *review/merge, staging, PO nghiệm thu* là quy trình của nhóm — cần làm ngoài code.

## Phân quyền (theo ma trận trong file Excel)
| Chức năng | Ai được phép |
|---|---|
| Tạo/sửa/xoá ngân sách, đọc nhật ký | HR Manager, Admin |
| Xem ngân sách đầy đủ (kèm lương) | + Approver (chỉ đọc) |
| Xem headcount còn lại (**không thấy lương**) | + Hiring Manager (**chỉ phòng ban mình**), Recruiter |
| **Ghi đè khi vượt chỉ tiêu** | **Chỉ HR Manager** (Admin cũng không) |

## Quy tắc nghiệp vụ & giả định — cần PO xác nhận
1. **Chặn ở bước DUYỆT** yêu cầu (đúng mục tiêu "không duyệt vượt chỉ tiêu"). Tạo/gửi duyệt vẫn được, nhưng hiển thị rõ còn lại bao nhiêu và có vượt hay không.
2. **Vượt = vượt headcount _hoặc_ vượt ngân sách lương.** Lương đề xuất là VND/tháng/người; chi phí quy đổi cả năm = `số lượng × lương × 12` (hằng `ANNUALIZATION_MONTHS`). Nếu PO muốn tính theo số tháng còn lại trong năm thì đổi ở một chỗ.
3. **Phòng ban chưa có ngân sách năm đó = chỉ tiêu 0** → bị chặn (`BUDGET_NOT_DEFINED`), HR Manager vẫn ghi đè được.
4. **Admin không được ghi đè** dù có "toàn quyền": AC ghi rõ *chỉ HR Manager*.
5. Lý do ghi đè tối thiểu 10 ký tự, tối đa 500.
6. Không cho hạ chỉ tiêu/ngân sách lương thấp hơn số đã dùng; không xoá ngân sách đã có yêu cầu được duyệt.
7. Khi duyệt trên PostgreSQL, dòng ngân sách được khoá (`pessimistic_write`) để hai lần duyệt đồng thời không cùng lọt qua chỉ tiêu.

## Phần "tối thiểu" làm thêm để story chạy được
Các story phụ thuộc chưa có trong gói nên mình dựng bản rút gọn: đăng nhập JWT (S1), phòng ban (S2-04), yêu cầu tuyển dụng với vòng đời `DRAFT → PENDING_APPROVAL → APPROVED → CANCELLED` (S2-10/S3-02). Khi ghép vào dự án thật, thay bằng module của các story đó — chỉ cần giữ `HeadcountBudgetService.enforceOnApproval()` được gọi trong transaction duyệt, và `BUDGET_COUNTED_STATUSES` khớp trạng thái thật.

## Cấu trúc
```
src/headcount-budget/   entity, DTO, service (SCRUM-124/125), controller, *.spec.ts
src/requisitions/       bản tối thiểu của yêu cầu tuyển dụng + service gọi kiểm ngân sách
src/common/             guard JWT + vai trò (mặc định từ chối)
db/migrations/          001_headcount_budget.sql  (SCRUM-123, PostgreSQL)
test/                   e2e (SCRUM-127) + helper
requests.http           thử API ngay trong VS Code
```
