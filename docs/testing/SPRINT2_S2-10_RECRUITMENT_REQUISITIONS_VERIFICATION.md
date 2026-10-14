# BÁO CÁO KIỂM THỬ VÀ HOÀN THIỆN SPRINT 2 (S2-10)
**Hệ thống Tuyển dụng Nội bộ (ATS)**  
**User Story:** S2-10: Tạo yêu cầu tuyển dụng (Trưởng bộ phận)  
**Story Points:** 8 | **Priority:** Must  
**Nhiệm vụ Scrum:** SCRUM-92, SCRUM-93, SCRUM-94, SCRUM-95, SCRUM-96  
**Ngày thực hiện:** 10/10/2026  

---

## 1. TỔNG HỢP KẾT QUẢ CÁC NHIỆM VỤ SCRUM

| Mã Scrum | Tên nhiệm vụ | Kỹ thuật triển khai | Kiểm thử (Tests) | Trạng thái kỹ thuật |
| :--- | :--- | :--- | :---: | :---: |
| **SCRUM-92** | [BE] Thiết kế dữ liệu yêu cầu tuyển dụng | `V20__requisition_data_model.sql`<br>`RecruitmentRequisition.java` | DB Migration & Entity Tests | **PASS** |
| **SCRUM-93** | [BE] Xây dựng API tạo và lưu nháp yêu cầu tuyển dụng | `RequisitionController.java`<br>`RequisitionService.java` | 13/13 Service Tests<br>6/6 Integration Tests | **PASS** |
| **SCRUM-94** | [BE] Xử lý kiểm tra dải lương và ngày cần người | Ràng buộc dải lương chức danh, ngày cần người `>= hôm nay`, scoping phòng ban | 13/13 Service Tests | **PASS** |
| **SCRUM-95** | [FE] Tạo form yêu cầu tuyển dụng | `RecruitmentRequestPage.tsx`<br>`recruitment-request.css` | Form rendering & Responsive (360px) | **PASS** |
| **SCRUM-96** | [FE] Xử lý lưu nháp và validation trên giao diện | `requisition.ts`<br>Client-side validation, Toast alert, Draft management | 5/5 Vitest Tests | **PASS** |

---

## 2. KIỂM CHỨNG THEO ACCEPTANCE CRITERIA (AC)

1. **AC-01: Khai báo đầy đủ thông tin yêu cầu tuyển dụng**
   - Hỗ trợ chọn chức danh, phòng ban, số lượng, lý do tuyển, loại thay thế (`REPLACEMENT`) hoặc tăng mới (`NEW_HEADCOUNT`), dải lương đề xuất (`salaryMin` - `salaryMax`), và ngày cần người (`neededDate`).
   - *Kết quả:* Đạt.

2. **AC-02: Soạn được mô tả công việc và yêu cầu ứng viên**
   - Hỗ trợ nhập và lưu trữ `jobDescription` và `candidateRequirements`.
   - *Kết quả:* Đạt.

3. **AC-03: Cho phép lưu nháp**
   - Cung cấp endpoint `POST /api/requisitions/draft` và `PUT /api/requisitions/{id}/draft`.
   - Lưu bản nháp không bắt buộc điền đầy đủ tất cả các trường. Sinh mã `REQ-YYYY-xxxx`. Cho phép sửa đổi hoặc xóa nháp.
   - *Kết quả:* Đạt.

4. **AC-04: Dải lương đề xuất ngoài dải chuẩn của chức danh bắt buộc nhập giải trình**
   - Khi mức lương đề xuất nằm ngoài khung chuẩn của chức danh đã chọn:
     - Giao diện: Hiển thị cảnh báo trực quan và yêu cầu nhập trường "Lý do giải trình".
     - Backend: Kiểm tra `salaryExplanation` không được trống nếu lương vượt khung. Ném lỗi 400 nếu vi phạm.
   - *Kết quả:* Đạt.

5. **AC-05: Ngày cần người không được nằm trong quá khứ**
   - Frontend chặn date picker trước ngày hôm nay (`min={today}`).
   - Backend validate `neededDate.isBefore(LocalDate.now())`. Ném lỗi 400 nếu ngày ở quá khứ.
   - *Kết quả:* Đạt.

6. **Technical Notes & Scoping**
   - Trưởng bộ phận (`HIRING_MANAGER`) chỉ được tạo và quản lý yêu cầu trong phạm vi phòng ban mình phụ trách.
   - Kiểm tra dải lương và ngày cần người tại cả tầng Backend và Frontend.
   - Chưa kích hoạt luồng phê duyệt Sprint 3 (trạng thái gửi chuyển sang `PENDING_APPROVAL`).
   - *Kết quả:* Đạt.

---

## 3. KẾT QUẢ KIỂM THỬ KỸ THUẬT (EVIDENCE)

### A. Backend Tests
- `RequisitionServiceTest`: 13/13 tests passed (100%).
- `RequisitionIntegrationTest`: 6/6 tests passed (100%).
- Tất cả các luồng tạo mới, lưu draft, submit, validation lương và ngày tháng đều vượt qua.

### B. Frontend Tests
- `RequisitionManagement.test.tsx`: 5/5 tests passed.
- Giao diện đáp ứng tốt từ kích thước mobile (360px) đến desktop (1440px).
- Quyền truy cập được bảo vệ thông qua `PermissionGuard` và `RoleGuard`.
