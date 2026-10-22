# S3-07 — Tạm dừng, đóng hoặc huỷ yêu cầu tuyển dụng

Thiết kế: `docs/DESIGN.md` · Migration PostgreSQL: `db/001_requisition_lifecycle.sql`

## Giải nén (Windows PowerShell)
```powershell
Expand-Archive s3-07-requisition-lifecycle.zip -DestinationPath .
cd s3-07-requisition-lifecycle
code .
```

## Lệnh chạy trong Terminal của VS Code (Ctrl + `)
```bash
npm install                      # 1 lần
npx playwright install chromium  # 1 lần (cho test giao diện)

npm start                        # CHẠY ỨNG DỤNG -> mở http://localhost:3000
npm run check                    # CHẠY TẤT CẢ: lint + build + test + FE + 360px + e2e + demo
```
Yêu cầu Node >= 22.18 (`node -v`). Đổi cổng: `$env:PORT=4000; npm start` (PowerShell).

### Dùng thử trên trình duyệt (`npm start`)
- Chọn vai trò **Trưởng phòng Nhân sự** để thao tác; chọn **Nhân viên tuyển dụng** để thấy server từ chối (403).
- Mỗi yêu cầu có nút **Tạm dừng / Đóng (đã tuyển đủ) / Huỷ / Tiếp tục tuyển / Lịch sử** tuỳ trạng thái.
- REQ-2026-001 còn 8 ứng viên: đóng hoặc huỷ sẽ hiện cảnh báo, bấm "Vẫn tiếp tục" mới thực hiện.
- Khung **Cổng tuyển dụng công khai** cho thấy tin biến mất ngay khi tạm dừng/đóng/huỷ.
- "Đặt lại dữ liệu mẫu" để chơi lại. Thu nhỏ cửa sổ về 360px để xem giao diện di động.

## Các lệnh kiểm thử
| Lệnh | Mục đích |
|---|---|
| `npm run verify` | Lint -> Build -> Test (DoD: build/lint/test pass + coverage >= 60%) |
| `npm test` | 86 test (service, controller, SCRUM-138 tích hợp HTTP), có cổng coverage |
| `npm run test:ac:chi-tiet` | Từng Acceptance Criteria + Technical Notes |
| `npm run test:fe` | Render hộp thoại React |
| `npm run test:360` | Hộp thoại ở khổ 360px bằng trình duyệt thật |
| `npm run test:e2e` | SCRUM-139: thao tác thật trên giao diện (tạm dừng, đóng, huỷ, cảnh báo, 403, 360px) |
| `npm run demo` | Kịch bản 7 bước in ra Terminal |

## Task Jira
- **SCRUM-134/135/136 [BE]**: `src/domain`, `src/service` (state machine, lý do, cảnh báo pipeline, tự gỡ tin).
- **SCRUM-138 [TEST]**: `test/*.test.ts`, đặc biệt `test/server.integration.test.ts` (HTTP thật từ API tới cổng công khai).
- **SCRUM-139 [FE]**: `frontend/*` (hộp thoại + trang quản lý), kiểm thử `test/e2e/ui.e2e.test.ts`.

## Nối PostgreSQL thật
```ts
import { Pool } from 'pg';                       // npm i pg
import { PostgresStore, systemClock, RequisitionLifecycleService } from './src/index.ts';

const store = new PostgresStore(new Pool({ connectionString: process.env.DATABASE_URL }));
const service = new RequisitionLifecycleService({
  uow: store, requisitions: store, postings: store, pipeline: store, history: store, clock: systemClock,
});
```
1. Chạy `db/001_requisition_lifecycle.sql` trên DB dev.
2. Bảng ứng viên mặc định là `applications(requisition_id, stage)`; nếu tên khác, sửa `APPLICATIONS_TABLE` trong `src/adapters/postgres.ts`.
3. Adapter đã được test bằng client giả (thứ tự BEGIN/COMMIT/ROLLBACK, SQL, ánh xạ). **Chưa chạy trên PostgreSQL thật** — hãy thử trên staging.
