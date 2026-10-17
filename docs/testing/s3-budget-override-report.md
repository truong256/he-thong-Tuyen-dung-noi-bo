# BÁO CÁO HOÀN THIỆN VÀ KIỂM THỬ CHỨC NĂNG GHI ĐÈ NGÂN SÁCH HEADCOUNT (BUDGET OVERRIDE)
**Sprint:** Sprint 3 (S3-04 / SCRUM-101)  
**Nhánh triển khai:** `feature/s3-budget-override`  
**Nhánh đích:** `dev`  
**Người thực hiện:** Antigravity Pair Programmer  
**Ngày hoàn thành:** 17/10/2026  
**Trạng thái kiểm thử:** **100% PASS (Toàn bộ 12/12 Test Cases TC01–TC12, 16/16 Regression Tests, 265/265 Frontend Tests)**

---

## 1. TỔNG QUAN VÀ VẤN ĐỀ BAN ĐẦU
### 1.1. Bối cảnh kiểm thử thực tế
Người dùng đã kiểm thử yêu cầu tuyển dụng:
- **Mã yêu cầu:** `REQ-202610-0003`
- **Vị trí tuyển:** Giám đốc Công nghệ (CTO)
- **Phòng ban:** Ban Giám Đốc (BOD)
- **Năm ngân sách:** 2026
- **Headcount còn lại:** 10
- **Số lượng tuyển yêu cầu:** 13 (Vượt 3 headcount)
- **Ngân sách lương còn lại:** 240.000.000 VNĐ
- **Chi phí lương dự kiến:** 3.900.000.000 VNĐ / năm (Vượt 3.660.000.000 VNĐ)
- **Trạng thái:** `PENDING_APPROVAL` (Chờ duyệt)

### 1.2. Hiện trạng trước khi xử lý
- **Đã có:** Hệ thống phát hiện chính xác tình trạng vượt chỉ tiêu Headcount (3 người) và vượt ngân sách tiền lương (3.660.000.000 VNĐ), hiển thị widget cảnh báo màu cam và chặn nút duyệt thông thường bằng mã lỗi `HEADCOUNT_BUDGET_EXCEEDED` (409 Conflict).
- **Còn thiếu và lỗi kiến trúc:**
  1. Trong cửa sổ chi tiết yêu cầu tuyển dụng (`RequisitionDetailModal`), hoàn toàn **chưa có nút bấm hoặc biểu mẫu "Ghi đè ngân sách"** cho Trưởng phòng Nhân sự (HR Manager).
  2. Endpoint cũ `/override-approve` ghép chung hành động ghi đè ngoại lệ với hành động phê duyệt cấp 1 (`RequisitionApprovalService.approveRequisition`), dẫn đến **lỗi deadlock kiến trúc**: Nếu HR Manager không đồng thời là Approver cấp 1 (ví dụ cấp 1 là Hiring Manager / Giám đốc khối), hệ thống sẽ ném `403 Forbidden` ("Bạn không có quyền duyệt ở cấp hiện tại").
  3. Cơ sở dữ liệu thiếu các cột theo dõi chi tiết ngoại lệ: ai ghi đè (`budget_override_by_user_id`), thời điểm ghi đè (`budget_override_at`), cờ ghi đè headcount độc lập (`headcount_overridden`), mức vượt định biên và ngân sách đã được chấp thuận (`overridden_excess_headcount`, `overridden_excess_salary_vnd`).

---

## 2. KIẾN TRÚC VÀ QUY TẮC NGHIỆP VỤ ĐÃ TRIỂN KHAI

### 2.1. Tách biệt Ngoại lệ Ghi đè và Luồng Phê duyệt Đa cấp
1. **Budget Override là hành động phê duyệt ngoại lệ (Exception Grant)**: Dành riêng cho `ROLE_HR_MANAGER` (hoặc tài khoản có quyền `BUDGET_OVERRIDE`).
2. **Không tự động chuyển trạng thái thành `APPROVED`**: Khi HR Manager ghi đè, yêu cầu tuyển dụng vẫn giữ nguyên trạng thái `PENDING_APPROVAL`. Cờ `budgetOverridden = true` và `headcountOverridden = true` được đánh dấu, lưu lại lý do (bắt buộc tối thiểu 10 ký tự), người thực hiện, thời điểm và số liệu vượt.
3. **Tiếp tục luồng phê duyệt chuẩn**: Sau khi có ngoại lệ ghi đè, các Approver theo quy trình (Cấp 1 Hiring Manager, Cấp 2 Approver,...) tiến hành xem xét và duyệt theo thẩm quyền chuyên môn mà không bị chặn bởi rào cản ngân sách.
4. **Trừ ngân sách đúng thời điểm**: Ngân sách và headcount chỉ được ghi nhận tăng số đã dùng (`headcountUsed`, `salaryBudgetUsedVnd`) khi yêu cầu đạt cấp phê duyệt cuối cùng và chuyển sang `APPROVED`. Nếu yêu cầu bị từ chối (`REJECTED`) hoặc hủy (`CANCELLED`), ngân sách không bị trừ.

### 2.2. Kiểm soát chặt chẽ TC11 & TC12 (Tái kiểm tra tại thời điểm duyệt)
- **TC11 (Không bỏ qua kiểm soát Headcount)**: Nếu yêu cầu chỉ được ghi đè ngân sách lương mà `headcountOverridden = false`, khi Approver duyệt, hệ thống tái đánh giá và phát hiện vượt headcount -> ném `409 Conflict` (`HEADCOUNT_LIMIT_EXCEEDED`).
- **TC12 (Tái kiểm tra khi ngân sách thay đổi)**: Nếu sau khi ghi đè, ngân sách phòng ban bị cắt giảm khiến mức vượt thực tế tại thời điểm duyệt lớn hơn mức đã được HR Manager chấp thuận ngoại lệ (`eval.excessSalaryVnd() > req.getOverriddenExcessSalaryVnd()`) -> hệ thống ném `409 Conflict` (`BUDGET_EXCEEDED_AFTER_OVERRIDE`) yêu cầu HR Manager xem xét lại.

### 2.3. Chống Race Condition bằng Khóa bi quan (Pessimistic Locking - TC10)
- Áp dụng `@Lock(LockModeType.PESSIMISTIC_WRITE)` trên cả bản ghi yêu cầu tuyển dụng (`RecruitmentRequisitionRepository.findByIdForUpdate`) và bản ghi ngân sách phòng ban (`HeadcountBudgetRepository.findByDepartmentIdAndYearForUpdate`).
- Khi hai giao dịch ghi đè diễn ra đồng thời, giao dịch thứ hai bị chặn đợi khóa; khi nhận khóa, hệ thống kiểm tra `req.isBudgetOverridden()` và ngay lập tức từ chối với `400 Bad Request`, không tạo trùng bản ghi hay sai lệch audit trail.

---

## 3. DANH SÁCH CÁC FILE ĐÃ CHỈNH SỬA VÀ TẠO MỚI

### 3.1. Database Migration (Flyway)
- **`backend/auth-service/src/main/resources/db/migration/V30__enhance_budget_override_tracking.sql`** (Tạo mới):
  - Bổ sung các cột vào bảng `recruitment_requisitions`:
    - `headcount_overridden BOOLEAN NOT NULL DEFAULT FALSE`
    - `budget_override_by_user_id BIGINT`
    - `budget_override_at TIMESTAMP WITH TIME ZONE`
    - `overridden_excess_headcount INT`
    - `overridden_excess_salary_vnd BIGINT`
  - Tạo các index tối ưu hóa tra cứu: `idx_req_budget_override`, `idx_req_override_user`.

### 3.2. Backend (Java 21, Spring Boot 4)
- **`domain/sprint2/RecruitmentRequisition.java`**: Thêm các thuộc tính, getter/setter cho 5 trường mới.
- **`dto/budget/BudgetOverrideRequest.java`** (Tạo mới): DTO tiếp nhận lý do ghi đè và tùy chọn ngoại lệ, validate `@NotBlank` và `@Size(min = 10, max = 2000)`.
- **`dto/budget/BudgetOverrideResponse.java`** (Tạo mới): DTO phản hồi chi tiết kết quả ghi đè.
- **`dto/RequisitionResponse.java`**: Bổ sung các trường override để truyền xuống Frontend.
- **`repository/RecruitmentRequisitionRepository.java`**: Thêm query `findByIdForUpdate` với khóa `@Lock(LockModeType.PESSIMISTIC_WRITE)`.
- **`service/HeadcountBudgetService.java`**:
  - Triển khai phương thức nghiệp vụ độc lập: `overrideBudget(Long requisitionId, BudgetOverrideRequest request, User user)`.
  - Cải tiến phương thức kiểm tra `enforceOnApproval`: kiểm tra tái đánh giá hạn mức, hỗ trợ TC11 và TC12.
- **`controller/HeadcountBudgetController.java`**:
  - Cung cấp endpoint: `POST /api/headcount-budgets/requisitions/{id}/override`.
  - Giữ tương thích ngược cho endpoint cũ: `POST /api/headcount-budgets/requisitions/{id}/override-approve`.
- **`service/RequisitionApprovalWorkflowService.java` & `RequisitionApprovalService.java`**: Ủy quyền kiểm tra hạn mức ngân sách sang `HeadcountBudgetService.enforceOnApproval`.
- **`exception/GlobalExceptionHandler.java`**: Trả về chi tiết mã lỗi nghiệp vụ, bảo toàn thông báo lỗi phân quyền rõ ràng.

### 3.3. Frontend (React, TypeScript, Vite)
- **`types/requisition.ts`**: Bổ sung `headcountOverridden`, `budgetOverrideByUserId`, `budgetOverrideAt`.
- **`types/budget.ts`**: Thêm interface `BudgetOverrideResponse` và payload `BudgetOverridePayload`.
- **`api/budget.ts`**: Thêm phương thức gọi API `overrideBudget(id, payload)`.
- **`pages/RequisitionManagementPage.tsx`**:
  - Kiểm tra quyền: `canOverrideBudget = isHrManager`.
  - Thêm nút bấm **"Ghi đè ngân sách"** nổi bật trong widget cảnh báo vượt hạn mức (chỉ hiển thị cho HR Manager).
  - Thêm hộp thoại modal **"Ghi đè Ngân sách Tuyển dụng"** với đầy đủ 8 thông tin theo đặc tả nghiệp vụ:
    1. Mã yêu cầu tuyển dụng.
    2. Phòng ban & năm ngân sách.
    3. Headcount hiện có, số lượng tuyển và phần vượt.
    4. Ngân sách lương còn lại.
    5. Chi phí lương dự kiến (tháng & năm).
    6. Số tiền vượt ngân sách.
    7. Ô nhập lý do chi tiết (bắt buộc >= 10 ký tự, có đếm ký tự).
    8. Nút "Xác nhận ghi đè" (disable khi lý do chưa đủ 10 ký tự, hiển thị loading spinner khi gửi) và nút "Hủy".
  - Giữ nguyên trạng thái `PENDING_APPROVAL` và cập nhật giao diện ngay lập tức khi hoàn tất ghi đè.

### 3.4. Kiểm thử tự động (Test Suites)
- **`backend/auth-service/src/test/java/com/example/auth_service/controller/BudgetOverrideIntegrationTest.java`** (Tạo mới): Kiểm thử toàn diện 12/12 Test Cases TC01–TC12.
- **`backend/auth-service/src/test/java/com/example/auth_service/controller/HeadcountBudgetOverrunIntegrationTest.java`**: Cập nhật kiểm thử hồi quy 16 test cases, xác nhận lỗi deadlock kiến trúc cũ đã được giải quyết triệt để.
- **`frontend/src/tests/BudgetOverrideModal.test.tsx`** (Tạo mới): Kiểm thử giao diện và hành vi tương tác Frontend cho HR Manager, Recruiter, validation lý do và cập nhật trạng thái.

---

## 4. MA TRẬN KẾT QUẢ KIỂM THỬ THEO YÊU CẦU ĐỀ BÀI (MỤC 8)

| ID | Tên Test Case | Mục tiêu kiểm thử | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC01** | HR Manager ghi đè hợp lệ | Ghi đè yêu cầu REQ vượt hạn mức với lý do >= 10 ký tự | 200 OK, `budgetOverridden=true`, `headcountOverridden=true`, status giữ `PENDING_APPROVAL`, ghi audit log | 200 OK, dữ liệu cập nhật chính xác, audit log `BUDGET_OVERRIDE` được tạo | **PASS** |
| **TC02** | Recruiter ghi đè | Tài khoản Recruiter gọi API ghi đè | 403 Forbidden | 403 Forbidden, yêu cầu không bị thay đổi | **PASS** |
| **TC03** | Không nhập lý do / lý do < 10 ký tự | Gửi lý do rỗng hoặc dưới 10 ký tự | 400 Bad Request (Validation Error) | 400 Bad Request với thông báo yêu cầu tối thiểu 10 ký tự | **PASS** |
| **TC04** | Ghi đè yêu cầu không vượt hạn mức | Cố ý ghi đè yêu cầu tuyển dụng nằm trong hạn mức | 400 Bad Request | 400 Bad Request: "Yêu cầu tuyển dụng hiện không vượt chỉ tiêu headcount hoặc ngân sách lương, không cần ghi đè." | **PASS** |
| **TC05** | Ghi đè hai lần | Gọi ghi đè lần thứ hai cho cùng một yêu cầu | 400 Bad Request, không tạo bản ghi trùng | 400 Bad Request: "Yêu cầu tuyển dụng này đã được ghi đè ngân sách trước đó." | **PASS** |
| **TC06** | Ghi đè rồi phê duyệt | HR Manager ghi đè ngoại lệ, sau đó Approver duyệt qua các cấp | Duyệt thành công qua các cấp, chuyển sang `APPROVED`, trừ ngân sách chính xác | Phê duyệt đa cấp thành công, chuyển sang `APPROVED`, cập nhật headcount/budget used | **PASS** |
| **TC07** | Ghi đè rồi từ chối | HR Manager ghi đè, sau đó Approver từ chối | Chuyển sang `REJECTED`, lưu lịch sử từ chối, ngân sách KHÔNG bị trừ | Chuyển sang `REJECTED`, ngân sách used vẫn bằng 0 | **PASS** |
| **TC08** | Tải lại trang (Persistence check) | Truy vấn lại Requisition qua API và Database sau khi ghi đè | Dữ liệu ghi đè vẫn tồn tại nguyên vẹn | Đối chiếu API `GET /api/requisitions/{id}` và Entity PostgreSQL khớp 100% | **PASS** |
| **TC09** | Gọi API trực tiếp không có quyền | Không gửi token hoặc token Hiring Manager gọi endpoint override | 401 Unauthorized / 403 Forbidden | 401 khi thiếu token, 403 khi là Hiring Manager | **PASS** |
| **TC10** | Hai thao tác ghi đè đồng thời | Hai thread gửi request ghi đè đồng thời cùng một lúc | Khóa bi quan ngăn race condition, chỉ đúng 1 request thành công | Đúng 1 giao dịch thành công (200), giao dịch thứ 2 bị chặn (400), chỉ có 1 audit log | **PASS** |
| **TC11** | Ghi đè ngân sách nhưng vẫn vượt Headcount | Chỉ ghi đè ngân sách lương, không ghi đè headcount | Khi Approver duyệt bị chặn với 409 Conflict | Bị chặn phê duyệt với 409 Conflict (`HEADCOUNT_LIMIT_EXCEEDED`) | **PASS** |
| **TC12** | Thay đổi ngân sách sau ghi đè | Ngân sách bị cắt giảm sau khi ghi đè khiến mức vượt mới phát sinh | Khi Approver duyệt bị chặn tái đánh giá | Bị chặn phê duyệt với 409 Conflict (`BUDGET_EXCEEDED_AFTER_OVERRIDE`) | **PASS** |

---

## 5. BẰNG CHỨNG THỰC THI KIỂM THỬ (TEST LOG EVIDENCE)

### 5.1. Backend Test Suites (Maven Surefire)
```
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.example.auth_service.controller.BudgetOverrideIntegrationTest
2026-10-17T21:55:44.395+07:00  INFO 23072 --- [auth-service-test] [           main] c.e.a.c.BudgetOverrideIntegrationTest    : Started BudgetOverrideIntegrationTest in 12.23 seconds
[INFO] Tests run: 12, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 16.48 s -- in com.example.auth_service.controller.BudgetOverrideIntegrationTest
[INFO] 
[INFO] Results:
[INFO] Tests run: 12, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

```
[INFO] Running com.example.auth_service.controller.HeadcountBudgetOverrunIntegrationTest
2026-10-17T21:48:56.945+07:00  INFO 14256 --- [auth-service-test] [           main] .c.HeadcountBudgetOverrunIntegrationTest : Started HeadcountBudgetOverrunIntegrationTest in 13.958 seconds
[INFO] Tests run: 16, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 18.66 s -- in com.example.auth_service.controller.HeadcountBudgetOverrunIntegrationTest
[INFO] Results:
[INFO] Tests run: 16, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

```
[INFO] Running com.example.auth_service.controller.HeadcountBudgetControllerTest
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 5.447 s -- in com.example.auth_service.controller.HeadcountBudgetControllerTest
[INFO] Running com.example.auth_service.service.HeadcountBudgetServiceTest
[INFO] Tests run: 11, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.646 s -- in com.example.auth_service.service.HeadcountBudgetServiceTest
[INFO] Results:
[INFO] Tests run: 15, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

### 5.2. Frontend Test Suites (Vitest)
```
 RUN  v3.2.7 C:/vibecoding/ttcs/he-thong-Tuyen-dung-noi-bo/frontend

 ✓ src/tests/BudgetOverrideModal.test.tsx (4 tests) 661ms
   ✓ TC01-UI: HR Manager opens requisition detail and sees "Ghi đè ngân sách" button
   ✓ TC02-UI: Recruiter/Approver không thấy nút "Ghi đè ngân sách" trong chi tiết yêu cầu
   ✓ TC03-UI: Validation bắt buộc lý do ghi đè phải từ 10 ký tự trở lên
   ✓ TC04-UI: HR Manager gửi ghi đè thành công -> Cập nhật trạng thái ngoại lệ mà không chuyển thành APPROVED

 Test Files  31 passed (31)
      Tests  265 passed (265)
   Start at  21:46:41
   Duration  17.47s
```

### 5.3. Frontend TypeScript & Production Build
```
> ats-frontend@1.0.0 typecheck
> tsc --noEmit

> ats-frontend@1.0.0 build
> tsc && vite build

vite v6.4.3 building for production...
transforming...
✓ 1756 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                                    0.98 kB │ gzip:   0.55 kB
dist/assets/index-B74Z_oHG.css                                   314.30 kB │ gzip:  51.43 kB
dist/assets/index-D9GJvNZO.js                                    943.74 kB │ gzip: 236.84 kB
✓ built in 3.55s
```

---

## 6. KẾT LUẬN VÀ TRẠNG THÁI BÀN GIAO
1. **Hoàn thành 100% mục tiêu yêu cầu**:
   - HR Manager có thể thực hiện ghi đè ngân sách hợp lệ qua cả giao diện và API độc lập.
   - Người không có quyền (Recruiter, Hiring Manager, chưa đăng nhập) bị chặn tuyệt đối.
   - Lý do ghi đè, người thực hiện, thời gian, số liệu vượt được ghi lại đầy đủ và có nhật ký kiểm toán bất biến.
   - Luồng phê duyệt hoạt động chuẩn xác, không tự động tăng ngân sách gốc, không bỏ qua kiểm soát Headcount.
   - Không ảnh hưởng đến các chức năng của Sprint 1, 2 và các chức năng khác của Sprint 3.
2. **Thông tin Git & Bàn giao**:
   - **Nhánh triển khai:** `feature/s3-budget-override`
   - **Nhánh đích:** `dev`
   - **Commit Hash:** `40ed30f`
   - **Pull Request URL:** https://github.com/truong256/he-thong-Tuyen-dung-noi-bo/pull/new/feature/s3-budget-override
   - **Tuân thủ quy tắc:** Không can thiệp nhánh `main`, không force push, sẵn sàng để người dùng review và merge thủ công.
