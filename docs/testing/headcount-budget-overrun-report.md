# BÁO CÁO KIỂM THỬ TÍNH NĂNG NGÂN SÁCH HEADCOUNT VƯỢT HẠN MỨC (S3-04 / SCRUM-101)
**Tích hợp Yêu cầu Tuyển dụng & Quy trình Phê duyệt Đa cấp (S3-01 / S3-02 / S3-03)**

---

## 1. Thông tin chung & Môi trường kiểm thử

- **Dự án**: Hệ thống Tuyển dụng Nội bộ (Internal ATS Recruitment System)
- **Repository**: [https://github.com/truong256/he-thong-Tuyen-dung-noi-bo.git](https://github.com/truong256/he-thong-Tuyen-dung-noi-bo.git)
- **Nhánh kiểm thử (Test Branch)**: `test/headcount-budget-overrun` (tạo từ `origin/dev`, tích hợp mã nguồn S3-04)
- **Commit hash kiểm thử**: `2c3e5b1` (*feat(sprint3): implement department headcount budget management (S3-04 / SCRUM-101)*)
- **Công nghệ áp dụng**:
  - **Backend**: Spring Boot 4.1.1, Java 21, Spring Data JPA, Hibernate ORM 7.4.5, Spring Security, JWT (HMAC-SHA256).
  - **Database**: PostgreSQL (Production) / Flyway Migrations, H2 In-Memory Database (Test Profile).
  - **Frontend**: React 18, TypeScript 5, Vite, Vitest, Testing Library, Tailwind CSS, Lucide Icons.
- **Tài khoản & Vai trò sử dụng trong kiểm thử**:
  - `HR_MANAGER`: Quản lý Nhân sự — Quyền hạn thiết lập định biên ngân sách, xem báo cáo, thực hiện duyệt vượt hạn mức (Override Approval).
  - `HIRING_MANAGER`: Trưởng bộ phận tuyển dụng — Tạo yêu cầu tuyển dụng (YCTD), duyệt cấp 1 (ngưỡng lương cơ bản).
  - `APPROVER`: Người phê duyệt cấp cao / Ban Giám đốc — Duyệt cấp 2 (khi mức lương vượt ngưỡng phân quyền phòng ban).
  - `ADMIN`: Quản trị viên hệ thống — Kiểm tra tính bảo mật phân quyền RBAC (không có role HR_MANAGER thì không được thao tác ngân sách).
  - `CANDIDATE` / `EMPLOYEE`: Tài khoản người dùng thường — Kiểm tra chặn truy cập trái phép.
- **Bộ kiểm thử tự động đã thực thi**:
  - **Backend Suite**: `com.example.auth_service.controller.HeadcountBudgetOverrunIntegrationTest` (16 test cases — **16/16 PASSED**, thời gian thực thi: 20.85s).
  - **Backend Regression Suite**: `com.example.auth_service.controller.RequisitionApprovalConfigurationIntegrationTest` (6 test cases — **6/6 PASSED**, thời gian thực thi: 0.82s).
  - **Frontend Suite**: `Vitest` (30 test files, **261/261 PASSED**, bao gồm `HeadcountBudgetPage.test.tsx`, `ApprovalTimeline.test.tsx`, `JobPostingManagement.test.tsx`, `RbacMatrix.test.ts` — thời gian thực thi: 26.05s).

---

## 2. Bảng kết quả 15 Test Case bắt buộc (TC01 - TC15)

| Test Case | Tiêu đề kịch bản | Kết quả | Expected | Actual | Ghi chú & Phân tích |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **TC01** | YCTD hợp lệ trong định biên (5/10 người) | **PASS** | Phê duyệt thành công qua API; trạng thái YCTD chuyển sang `APPROVED`; số lượng headcount đã sử dụng tăng lên 5/10 (50.0%). | YCTD được duyệt thành công; `used_headcount` = 5, `remaining_headcount` = 5; tỷ lệ đạt 50.0%; HTTP 200 OK. | Kiểm tra điều kiện bình thường hoạt động chính xác. |
| **TC02** | YCTD chạm ngưỡng tối đa định biên (10/10 người) | **PASS** | Phê duyệt thành công; headcount chạm 100% (10/10); không phát sinh ngoại lệ; ngân sách còn lại = 0. | Phê duyệt thành công; `used_headcount` = 10, `remaining_headcount` = 0; tỷ lệ đạt 100.0%; HTTP 200 OK. | Toán tử điều kiện biên `<=` hoạt động chính xác. |
| **TC03** | YCTD vượt chỉ tiêu định biên ngay từ đầu (11/10 người) | **PASS** | Hệ thống chặn ngay khi phê duyệt thông thường; trả về HTTP 409 Conflict với mã lỗi `HEADCOUNT_BUDGET_EXCEEDED`; payload chứa chi tiết vượt hạn mức. | Backend chặn với HTTP 409; trả về `{"error":"HEADCOUNT_BUDGET_EXCEEDED","details":{"headcountExceeded":true,"headcountLimit":10,"projectedHeadcount":11,"requiresOverride":true}}`; YCTD giữ nguyên `PENDING_APPROVAL`. | Logic chặn của `evaluateApproval` hoạt động chính xác. |
| **TC04** | YCTD cộng dồn vượt định biên (6 + 5 = 11 > 10) | **PASS** | YCTD 1 (6 người) được duyệt trước; YCTD 2 xin thêm 5 người; khi duyệt YCTD 2, hệ thống phải phát hiện tổng cộng dồn (11 > 10) và chặn với HTTP 409 Conflict. | YCTD 1 duyệt thành công (`used` = 6). YCTD 2 gửi phê duyệt bị chặn với HTTP 409 Conflict; `projectedHeadcount` = 11, `headcountLimit` = 10. | Bộ lọc các trạng thái chiếm định biên (`COUNTED_STATUSES`) cộng dồn chuẩn xác. |
| **TC05** | Lương năm nằm trong ngân sách cho phép (180M < 240M) | **PASS** | Ngân sách 240M VND; YCTD tuyển 1 người với mức lương 15M/tháng (quy đổi năm: 180M VND) được duyệt thành công; không bị chặn. | Duyệt thành công; `used_salary_budget_vnd` = 180,000,000 VND; `remaining` = 60,000,000 VND; tỷ lệ sử dụng 75.0%; HTTP 200 OK. | Công thức quy đổi lương năm (`quantity * expectedSalary * 12`) chính xác. |
| **TC06** | Lương năm chạm ngưỡng ngân sách (240M == 240M) | **PASS** | Ngân sách 240M VND; YCTD 1 người lương 20M/tháng (quy đổi năm: 240M VND); duyệt thành công, tỷ lệ đạt 100.0%, ngân sách còn lại = 0 VND. | Duyệt thành công; `used_salary` = 240M VND, `remaining` = 0 VND, tỷ lệ đạt 100.0%; HTTP 200 OK. | Toán tử điều kiện biên ngân sách lương `<=` hoạt động chính xác. |
| **TC07** | Lương năm vượt ngân sách dù chỉ 1 đồng (240,000,012 > 240M) | **PASS** | Ngân sách 240M VND; YCTD 1 người lương 20,000,001 VND/tháng (quy đổi năm: 240,000,012 VND); bị chặn với HTTP 409 Conflict (`HEADCOUNT_BUDGET_EXCEEDED`). | Backend chặn với HTTP 409 Conflict; trả về `{"error":"HEADCOUNT_BUDGET_EXCEEDED","details":{"salaryExceeded":true,"salaryLimitVnd":240000000,"projectedSalaryVnd":240000012,"requiresOverride":true}}`. | Kiểm tra độ nhạy biên chính xác đến từng đơn vị VND. |
| **TC08** | Lương năm cộng dồn từ nhiều YCTD vượt ngân sách (150M + 100M = 250M > 240M) | **PASS** | Ngân sách 240M VND; YCTD 1 duyệt 150M VND; YCTD 2 xin thêm 100M VND (tổng 250M > 240M); duyệt YCTD 2 phải bị chặn với HTTP 409 Conflict. | YCTD 1 duyệt thành công; YCTD 2 duyệt bị chặn với HTTP 409 Conflict; `projectedSalaryVnd` = 250,000,008 VND, `salaryLimitVnd` = 240,000,000 VND. | Thuật toán tổng hợp chi phí lương cộng dồn hoạt động chuẩn xác. |
| **TC09** | Tích hợp luồng phê duyệt nhiều cấp theo ngưỡng lương (S3-01 / S3-02) | **PASS** | Requisition tuân thủ cấu hình phòng ban: Step 1 (Hiring Manager) duyệt trước, Step 2 (Approver) duyệt sau; người ở cấp sau không thể duyệt trước khi cấp trước hoàn thành; HTTP 403 Forbidden. | Step 2 (Approver) cố tình duyệt trước Step 1 bị chặn với HTTP 403 Forbidden: *"Bạn không có quyền duyệt bước này hoặc bước trước chưa hoàn tất."*. | Luồng phê duyệt phân cấp S3-01 hoạt động độc lập chuẩn xác. *(Lưu ý: API override-approve phát hiện lỗi kiến trúc, xem chi tiết mục 4).* |
| **TC10** | Xử lý phòng ban chưa cấu hình quy trình phê duyệt | **PASS** | YCTD thuộc phòng ban chưa được cấu hình bảng duyệt trong `requisition_approval_configurations` khi gửi phê duyệt (`/submit`) phải bị từ chối với HTTP 400 Bad Request; thông báo rõ ràng. | Backend trả về HTTP 400 Bad Request; message: *"Phòng ban chưa có cấu hình quy trình phê duyệt đang hoạt động."*; không sinh snapshot rác; không chuyển trạng thái sai. | Hàm `submitForApproval` kiểm tra chặt chẽ điều kiện tiên quyết. |
| **TC11** | Từ chối hoặc hủy YCTD giải phóng ngân sách & headcount | **PASS** | Khi YCTD bị từ chối (`REJECTED`) hoặc hủy (`CANCELLED`), headcount và ngân sách dự kiến không được tính vào `used`; phòng ban có thể tạo YCTD mới thay thế trong hạn mức. | Sau khi YCTD bị từ chối, `COUNTED_STATUSES` lập tức loại bỏ YCTD đó; YCTD mới với cùng số lượng và ngân sách được duyệt thành công 100%; hạn mức được giải phóng hoàn toàn. | Cơ chế tính toán động theo trạng thái của `HeadcountBudgetService` hoạt động tối ưu. |
| **TC12** | Ngăn chặn Race Condition khi duyệt đồng thời bằng Khóa bi quan (Pessimistic Lock) | **PASS** | Định biên còn lại đúng 5 người; 2 luồng gửi duyệt đồng thời cho 2 YCTD (mỗi YCTD 5 người); chỉ DUY NHẤT 1 YCTD được duyệt thành công, YCTD còn lại BẮT BUỘC bị chặn với HTTP 409 Conflict; không bị over-allocation. | Thực thi 2 luồng song song qua `CompletableFuture`: 1 luồng nhận HTTP 200 OK, 1 luồng nhận HTTP 409 Conflict; tổng `used_headcount` thực tế sau kiểm thử chính xác bằng 5/5 (100.0%), không xảy ra vượt hạn ngạch ngầm. | Câu truy vấn `SELECT ... FOR UPDATE` trong `HeadcountBudgetRepository` khóa transaction ở mức CSDL hoàn hảo. |
| **TC13** | Chống bypass giao diện bằng cách gọi trực tiếp API phê duyệt | **PASS** | Người dùng gọi trực tiếp API `POST /api/requisitions/{id}/approve` hoặc `POST /api/requisition-approvals/{id}/steps/{stepId}/approve` để bỏ qua UI; Backend bắt buộc phải tính toán lại và chặn với HTTP 409 Conflict, kèm `requiresOverride: true`. | Backend chặn request trực tiếp với HTTP 409 Conflict; trả về đầy đủ flag `requiresOverride: true`; không thể bypass qua cURL hoặc Postman. | Toàn bộ nghiệp vụ kiểm tra ngân sách nằm tại Service backend, không phụ thuộc vào Frontend. |
| **TC14** | Kiểm soát phân quyền RBAC cho quản lý ngân sách và duyệt vượt hạn mức | **PASS** | Chỉ người có vai trò `HR_MANAGER` mới được tạo/sửa ngân sách hoặc thực hiện override approval; các vai trò `HIRING_MANAGER`, `APPROVER`, `CANDIDATE`, `ADMIN` (không có role HR_MANAGER) đều bị từ chối với HTTP 403 Forbidden. | Gọi API cấu hình ngân sách hoặc override-approve bằng token `HIRING_MANAGER`, `APPROVER` và `ADMIN` thuần túy đều nhận HTTP 403 Forbidden. | Annotation `@PreAuthorize("hasRole('HR_MANAGER')")` được bảo vệ nghiêm ngặt trên toàn bộ endpoint. |
| **TC15** | Đồng bộ dữ liệu 3 chiều giữa PostgreSQL DB, REST DTO và Giao diện Frontend | **PASS** | Dữ liệu ngân sách lưu trong bảng `headcount_budgets`, trả về qua API REST DTO (`HeadcountBudgetResponse`), và hiển thị trên màn hình Frontend (`HeadcountBudgetPage`) phải khớp 100% về số lượng, số tiền, phần trăm và trạng thái cảnh báo. | DTO trả về đầy đủ `usedHeadcount`, `remainingHeadcount`, `headcountUsagePercent`, `usedSalaryBudgetVnd`, `remainingSalaryBudgetVnd`, `salaryUsagePercent`. Unit test frontend xác nhận 4 KPI cards và bảng danh sách hiển thị khớp 100%. | Khớp nối dữ liệu giữa DB Entity, Jackson DTO và TypeScript interface hoàn toàn đồng nhất. |

---

## 3. Các chức năng hoạt động đúng và đạt chất lượng cao

Qua quá trình kiểm thử tự động chuyên sâu trên cả Backend và Frontend, các chức năng nghiệp vụ sau đây hoạt động ổn định, chính xác và đạt chuẩn thiết kế:

1. **Kiểm tra vượt chỉ tiêu Headcount (Định biên nhân sự)**:
   - Hệ thống so sánh chính xác giữa số lượng yêu cầu trong YCTD (`quantity`) và hạn mức định biên còn lại (`quota - used_headcount`).
   - Xử lý mượt mà và chính xác tại các điểm biên: trong hạn mức, chạm mốc tối đa 100%, và vượt mốc 1 người.
   - Cộng dồn chính xác số lượng nhân sự từ tất cả các YCTD đã được phê duyệt trong cùng năm tài chính của phòng ban.

2. **Kiểm tra vượt ngân sách tiền lương (Salary Budget)**:
   - Áp dụng chuẩn công thức quy đổi lương năm: `annual_salary = quantity * expected_salary * 12`.
   - Độ nhạy kiểm tra biên chính xác đến từng đơn vị VND (ngay cả khi vượt chỉ 12 VND/năm tương đương 1 VND/tháng).
   - Cộng dồn chi phí tiền lương từ nhiều đợt tuyển dụng độc lập của phòng ban chính xác tuyệt đối.

3. **Cơ chế khóa bi quan chống Race Condition (Concurrency Control)**:
   - Sử dụng `@Lock(LockModeType.PESSIMISTIC_WRITE)` trên phương thức truy vấn `findByDepartmentIdAndYearForUpdate`.
   - Cơ chế này sinh câu lệnh `SELECT ... FOR UPDATE` ở tầng PostgreSQL, bảo đảm khi có 2 quản lý đồng thời nhấn duyệt 2 YCTD khác nhau tại cùng một mili-giây, giao dịch thứ hai bắt buộc phải chờ giao dịch thứ nhất commit, sau đó đọc lại số dư mới nhất và chặn kịp thời nếu đã hết định biên.

4. **Tính toán động và giải phóng hạn ngạch linh hoạt**:
   - Bộ lọc `COUNTED_STATUSES = List.of("APPROVED", "OPEN", "FILLED")` bảo đảm chỉ những YCTD đã được duyệt chính thức mới chiếm dụng tài nguyên ngân sách.
   - Khi một YCTD bị từ chối (`REJECTED`) hoặc hủy bỏ (`CANCELLED`), định biên và quỹ lương lập tức được hoàn trả vào ngân sách khả dụng của phòng ban mà không cần can thiệp thủ công.

5. **Bảo mật API và phân quyền RBAC**:
   - Endpoint bảo vệ đa tầng bằng Spring Security Filter Chain và Method Security (`@PreAuthorize`).
   - Ngăn chặn hoàn toàn việc can thiệp trái phép từ các role không có thẩm quyền hoặc tấn công bypass giao diện qua HTTP Client.

6. **Giao diện người dùng và Đồng bộ dữ liệu**:
   - Màn hình `HeadcountBudgetPage` hiển thị trực quan 4 thẻ KPI tóm tắt (Tổng định biên, Đã dùng, Ngân sách năm, Ngân sách còn lại) kèm thanh tiến trình trực quan (Progress Bar) đổi màu cảnh báo khi ngân sách tiệm cận hoặc vượt mức.
   - 261 bài test tự động trên Frontend đều vượt qua mà không có lỗi hồi quy (regression).

---

## 4. Danh sách lỗi và bất thường phát hiện (Technical Defects & Anomalies)

Trong quá trình thiết kế test case tích hợp sâu giữa module Quản lý Ngân sách (S3-04) và Luồng Phê duyệt Đa cấp (S3-01 / S3-02), chúng tôi đã phát hiện **04 khiếm khuyết kỹ thuật nghiêm trọng** cần được khắc phục trước khi đưa tính năng vào vận hành:

### 4.1. Defect 1 (CRITICAL - P0): Deadlock phân quyền khi HR Manager duyệt vượt hạn mức (Override Approval Deadlock)

- **Vị trí phát hiện**:
  - `backend/auth-service/src/main/java/com/example/auth_service/controller/HeadcountBudgetController.java`, dòng 174.
  - `backend/auth-service/src/main/java/com/example/auth_service/service/RequisitionApprovalService.java`, dòng 144.
- **Mô tả hiện tượng**:
  Khi một YCTD của phòng ban (ví dụ: Phòng Công nghệ Thông tin, Phòng Kinh doanh) bị hệ thống cảnh báo vượt hạn mức ngân sách, theo thiết kế nghiệp vụ của S3-04, Quản lý Nhân sự (`HR_MANAGER`) có thẩm quyền thực hiện "Phê duyệt vượt hạn mức" thông qua API `POST /api/headcount-budgets/requisitions/{id}/override-approve`.
  Tuy nhiên, khi HR Manager thực hiện gọi API này, hệ thống luôn trả về lỗi **HTTP 403 Forbidden** với thông báo: *"Bạn không phải người phê duyệt ở cấp hiện tại."*.
  Hệ quả là: **YCTD rơi vào tình trạng kẹt cứng hoàn toàn (Deadlock)**. Không một người dùng nào (kể cả Giám đốc Nhân sự hay Admin) có thể phê duyệt được YCTD vượt hạn mức đó!
- **Phân tích nguyên nhân kỹ thuật (Root Cause)**:
  1. Trong `HeadcountBudgetController.java`:
     ```java
     @PostMapping("/requisitions/{requisitionId}/override-approve")
     public ResponseEntity<RequisitionResponse> overrideApproveRequisition(
             @PathVariable Long requisitionId,
             @Valid @RequestBody BudgetOverrideApprovalRequest request,
             @AuthenticationPrincipal User hrManager) {
         budgetService.recordAuditLog(...);
         // GỌI SAI HÀM VÀ SAI SERVICE:
         RequisitionResponse approved = approvalService.approveRequisition(requisitionId, request.reason(), hrManager);
         return ResponseEntity.ok(approved);
     }
     ```
  2. Phương thức `approvalService.approveRequisition` là dịch vụ kế thừa từ **Sprint 2** (`RequisitionApprovalService`). Bên trong phương thức này kiểm tra quyền hạn của người gọi dựa trên bước hiện tại:
     ```java
     if (currentStep.getApproverId() != null && !currentStep.getApproverId().equals(currentUser.getId())) {
         throw new AccessDeniedException("Bạn không phải người phê duyệt ở cấp hiện tại.");
     }
     ```
  3. Đối với mọi phòng ban thông thường, bước đầu tiên hoặc bước hiện tại luôn là Trưởng bộ phận (`Hiring Manager`). Khi HR Manager gọi `override-approve`, `currentUser.getId()` là ID của HR Manager, hoàn toàn khác với `currentStep.getApproverId()` (ID của Hiring Manager) $\rightarrow$ Ném ngoại lệ `AccessDeniedException`.
  4. Cơ chế Override vốn sinh ra để **ghi đè và vượt qua quyền phê duyệt thông thường**, nhưng code hiện tại lại tái sử dụng luồng duyệt thông thường của Sprint 2 vốn bị ràng buộc ngặt nghèo về `approverId`.
- **Đề xuất giải pháp khắc phục**:
  Xây dựng một phương thức override chuyên biệt trong service: `overrideApproveRequisition(Long requisitionId, String reason, User hrManager)`:
  - Kiểm tra vai trò `hrManager` có quyền `HR_MANAGER`.
  - Bỏ qua việc kiểm tra `currentStep.getApproverId() == hrManager.getId()`.
  - Đánh dấu bước hiện tại và các bước tiếp theo là hoàn tất hoặc được phê duyệt đặc cách (`status = "BYPASSED"` hoặc `"APPROVED_BY_OVERRIDE"`).
  - Cập nhật trực tiếp trạng thái của YCTD thành `APPROVED`.

---

### 4.2. Defect 2 (HIGH - P1): Xung đột kiến trúc giữa 2 Engine phê duyệt (Dual-Engine Architecture Mismatch)

- **Vị trí phát hiện**:
  - `backend/auth-service/src/main/java/com/example/auth_service/controller/HeadcountBudgetController.java`, dòng 174.
  - So sánh giữa: `RequisitionApprovalService.java` (Sprint 2) và `RequisitionApprovalWorkflowService.java` (Sprint 3).
- **Mô tả hiện tượng**:
  Trong dự án hiện đang tồn tại **song song 2 hệ thống phê duyệt độc lập** không tương thích với nhau:
  - **Engine Sprint 3 (S3-01 / S3-02)**: Dựa trên cấu hình động theo phòng ban và ngưỡng lương trong các bảng `requisition_approval_configurations`, `requisition_approval_configuration_steps`, và chụp snapshot vào `requisition_approval_snapshots`.
  - **Engine Sprint 2**: Dựa trên chuỗi 4 bước mặc định cứng (`generateAndPersistDefaultApprovalChain`: Step 1 Tạo, Step 2 Trưởng phòng, Step 3 HR Manager, Step 4 Ban Giám đốc) lưu trong bảng `requisition_approval_steps`.
  Khi một YCTD được nộp duyệt theo quy trình chuẩn của Sprint 3, chuỗi duyệt được lưu trong bảng snapshot của Sprint 3. Nhưng khi gọi `override-approve` ở module Ngân sách S3-04, controller lại gọi sang `approvalService` của Sprint 2!
- **Phân tích nguyên nhân kỹ thuật**:
  Người phát triển module S3-04 đã `@Autowired RequisitionApprovalService` (của Sprint 2) thay vì tích hợp với `RequisitionApprovalWorkflowService` (của Sprint 3). Hậu quả là:
  - Nếu YCTD chưa từng chạy qua luồng Sprint 2, `approvalService` sẽ tự động sinh ra 4 bước mặc định cứng của Sprint 2, làm rác cơ sở dữ liệu.
  - Các bước phê duyệt linh hoạt theo ngưỡng lương (S3-01/S3-02) bị phớt lờ hoàn toàn.
  - Lịch sử phê duyệt (`requisition_approval_histories`) và timeline phê duyệt trên giao diện hiển thị sai lệch bước duyệt.
- **Đề xuất giải pháp khắc phục**:
  Chuyển đổi dependency trong `HeadcountBudgetController`: thay thế hoàn toàn `RequisitionApprovalService` bằng `RequisitionApprovalWorkflowService`. Bổ sung API `overrideApproveRequisition` vào `RequisitionApprovalWorkflowService` để đồng bộ hoàn toàn với dữ liệu snapshot của Sprint 3.

---

### 4.3. Defect 3 (HIGH - P1): Bất đồng bộ giữa Phê duyệt từng phần và Tiêu thụ Ngân sách (Partial Approval vs Budget Consumption Inconsistency)

- **Vị trí phát hiện**:
  - `backend/auth-service/src/main/java/com/example/auth_service/service/HeadcountBudgetService.java`, dòng 45.
  - `backend/auth-service/src/main/java/com/example/auth_service/service/RequisitionApprovalService.java`, dòng 150-160.
  - `frontend/src/pages/RequisitionManagementPage.tsx`, dòng 495.
- **Mô tả hiện tượng**:
  1. Trong `HeadcountBudgetService.java`:
     ```java
     private static final List<String> COUNTED_STATUSES = List.of("APPROVED", "OPEN", "FILLED");
     ```
     Hệ thống ngân sách chỉ tính toán lượng headcount và tiền lương đã tiêu thụ khi YCTD ở một trong ba trạng thái: `APPROVED`, `OPEN`, hoặc `FILLED`.
  2. Tuy nhiên, hàm `approvalService.approveRequisition(...)` khi được gọi ở một bước trung gian (ví dụ Step 2) chỉ đánh dấu bước đó là `COMPLETED` và chuyển bước 3 thành `PENDING`. Trạng thái của YCTD vẫn giữ nguyên là `PENDING_APPROVAL`!
  3. Kết quả: Ngay cả khi người có thẩm quyền đã phê duyệt ngoại lệ, **ngân sách và headcount vẫn KHÔNG ĐƯỢC CỘNG DỒN** vào `used_headcount` và `used_salary_budget_vnd`.
  4. Trong khi đó, ở phía Frontend (`RequisitionManagementPage.tsx`), hàm xử lý `overrideApproveRequisition` lại cập nhật danh sách với giả định YCTD đã chuyển thành `APPROVED`. Khi người dùng tải lại trang (F5), trạng thái hiển thị bị giật lùi về `PENDING_APPROVAL`, gây hoang mang cho người dùng.
- **Đề xuất giải pháp khắc phục**:
  Quy định rõ ràng về mặt nghiệp vụ cho hành động "Override Approve":
  - **Phương án chuẩn**: Phê duyệt vượt hạn mức bởi Quản lý Nhân sự là cấp cao nhất đối với ngoại lệ ngân sách $\rightarrow$ Chuyển thẳng trạng thái YCTD thành `APPROVED`. Khi đó, `COUNTED_STATUSES` sẽ lập tức ghi nhận lượng tiêu thụ vào báo cáo ngân sách, đồng bộ 100% với Frontend.

---

### 4.4. Defect 4 (MEDIUM - P2): Bất đồng nhất cấu trúc phản hồi lỗi và che giấu nguyên nhân từ chối

- **Vị trí phát hiện**:
  - `backend/auth-service/src/main/java/com/example/auth_service/exception/GlobalExceptionHandler.java`, dòng 106 & 158.
- **Mô tả hiện tượng**:
  1. Khi ném `HeadcountBudgetExceededException`, `GlobalExceptionHandler` trả về JSON:
     `{"error": "HEADCOUNT_BUDGET_EXCEEDED", "message": "...", "details": {...}}`.
     Trong khi tất cả các lỗi khác của hệ thống đều sử dụng cấu trúc `ApiErrorResponse`:
     `{"code": "BAD_REQUEST", "message": "...", "path": "...", "status": 400, "timestamp": "..."}`.
     Sự không đồng nhất này khiến cho các interceptor bắt lỗi chung ở Frontend không thể tự động bóc tách mã lỗi một cách nhất quán.
  2. Tại dòng 106, `handleAccessDeniedException` đang cấu hình:
     ```java
     @ExceptionHandler(AccessDeniedException.class)
     public ResponseEntity<ApiErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest req) {
         return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ApiErrorResponse(
                 "FORBIDDEN",
                 "Bạn không có quyền truy cập chức năng này.", // NỘI DUNG CỐ ĐỊNH BỊ CHE GIẤU
                 req.getRequestURI(),
                 HttpStatus.FORBIDDEN.value()
         ));
     }
     ```
     Điều này khiến toàn bộ thông điệp lỗi nghiệp vụ chi tiết của Spring Security (ví dụ: *"Bạn không phải người phê duyệt ở cấp hiện tại"* hay *"Yêu cầu quyền HR_MANAGER"*) bị thay thế bằng một câu chung chung, gây khó khăn cho việc debug và trải nghiệm người dùng.
- **Đề xuất giải pháp khắc phục**:
  Chuẩn hóa cấu trúc của `handleHeadcountBudgetExceededException` kế thừa từ `ApiErrorResponse` (bổ sung trường `details` nếu cần). Đối với `AccessDeniedException`, cho phép hiển thị thông điệp thực tế của Exception nếu có (`ex.getMessage() != null ? ex.getMessage() : "Bạn không có quyền truy cập chức năng này."`).

---

## 5. Đánh giá ảnh hưởng đến các chức năng khác của Sprint 3 (Sprint 3 Impact Assessment)

1. **Ảnh hưởng đến Quản lý Yêu cầu Tuyển dụng (S3-07 / S3-08 / SCRUM-121)**:
   - Các YCTD trong hạn mức được phê duyệt thông suốt, không gặp trở ngại.
   - Các YCTD vượt hạn mức hiện tại khi bị chuyển sang luồng ngoại lệ sẽ bị mắc kẹt vĩnh viễn ở trạng thái `PENDING_APPROVAL` do Defect 1 (Deadlock).
2. **Ảnh hưởng đến Cấu hình & Dòng thời gian Phê duyệt (S3-01 / S3-02 / S3-03)**:
   - Nếu gọi API phê duyệt thông thường theo đúng phân cấp (Step 1 $\rightarrow$ Step 2), luồng hoạt động chuẩn xác 100%.
   - Nếu gọi API `override-approve` của S3-04, do controller gọi sang service Sprint 2, timeline phê duyệt sẽ bị tạo đè chuỗi 4 bước rác của Sprint 2, gây sai lệch giao diện dòng thời gian (`ApprovalTimelineModal`) của Sprint 3.
3. **Ảnh hưởng đến Đăng tin Tuyển dụng (S3-10 / SCRUM-151)**:
   - Do YCTD vượt hạn mức không thể chuyển sang `APPROVED`, các tin tuyển dụng liên quan sẽ không thể được xuất bản công khai lên cổng nghề nghiệp.

---

## 6. Kết luận & Khuyến nghị (Conclusion & Recommendations)

### 6.1. Kết luận nghiệm thu
- **Tình trạng tính năng**: **CHƯA ĐỦ ĐIỀU KIỆN NGHIỆM THU ĐỂ MERGE VÀO NHÁNH `DEV` (NOT READY FOR PRODUCTION)**.
- **Lý do**:
  - Dù thuật toán tính toán ngân sách, kiểm tra biên (boundary), cộng dồn (accumulation), và khóa bi quan (pessimistic lock) hoạt động xuất sắc (16/16 test case backend và 261 test case frontend pass 100%).
  - Nhưng lỗi **P0 Override Approval Deadlock** (Defect 1) và **Xung đột 2 Engine phê duyệt** (Defect 2) là lỗi nghiêm trọng ở mức kiến trúc, khiến người dùng thực tế không thể hoàn tất chu trình nghiệp vụ khi xảy ra vượt hạn mức.

### 6.2. Kế hoạch hành động trước khi Merge (Pre-Merge Action Items)
1. **Refactor Controller**: Trong `HeadcountBudgetController.java`, gỡ bỏ `RequisitionApprovalService` (Sprint 2), chuyển sang gọi `RequisitionApprovalWorkflowService` (Sprint 3).
2. **Implement Override Method**: Viết phương thức `overrideApproveRequisition` chuyên biệt trong `RequisitionApprovalWorkflowService`, cho phép HR Manager phê duyệt đặc cách, bypass các bước còn lại và chuyển YCTD thẳng sang `APPROVED`.
3. **Update Frontend UI**: Đảm bảo sau khi gọi `overrideApproveRequisition`, màn hình hiển thị đúng trạng thái `APPROVED` và cập nhật lại số liệu KPI của ngân sách.
4. **Standardize Exceptions**: Đưa phản hồi lỗi của `HeadcountBudgetExceededException` về đúng chuẩn `ApiErrorResponse`.
5. **Chạy lại toàn bộ Regression Test**: Sau khi sửa 4 defect trên, chạy lại bộ kiểm thử tự động `HeadcountBudgetOverrunIntegrationTest` và toàn bộ suite của Sprint 3 để bảo đảm 100% pass trước khi tạo Pull Request vào `dev`.
