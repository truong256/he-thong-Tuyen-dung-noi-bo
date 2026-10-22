# BÁO CÁO KIỂM THỬ VÀ HOÀN THIỆN SPRINT 2 (S2-01, S2-02, S2-03)
**Hệ thống Tuyển dụng Nội bộ (ATS)**  
**Repository:** [https://github.com/truong256/he-thong-Tuyen-dung-noi-bo.git](https://github.com/truong256/he-thong-Tuyen-dung-noi-bo.git)  
**Nhánh kiểm thử & bảo toàn:** `feature/rbac-backlog-hardening`  
**Ngày thực hiện:** 08/10/2026  
**Nguồn yêu cầu quy chiếu:**
- *Tài liệu Product Backlog Excel:* `HỆ THỐNG TUYỂN DỤNG NỘI BỘ-TTCS_T926_K5S6.xlsx` (Sheet 2: User Roles, Sheet 4: Product Backlog)
- *Jira Scrum User Stories:*
  - **S2-01 / SCRUM-49:** Nhập danh sách nhân sự từ Excel.
  - **S2-02 / SCRUM-50:** Xem và cập nhật hồ sơ cá nhân.
  - **S2-03 / SCRUM-51:** Tải ảnh đại diện (Avatar).

---

## A. TỔNG HỢP KẾT QUẢ KIỂM THỬ

| Scrum ID / User Story | Backend API & Unit/Integration Tests | Frontend Vitest, Lint, Build & Typecheck | Playwright E2E Real App & DB | Manual UAT (Chờ người dùng nghiệm thu) | Trạng thái kỹ thuật |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **S2-01 / SCRUM-49**<br>Nhập danh sách nhân sự từ Excel | **PASS**<br>(15/15 unit/integration tests) | **PASS**<br>(187/187 tests, 0 lint error, build OK) | **PASS**<br>(10/10 test scenarios) | **PENDING** | **ĐÃ HOÀN THIỆN & SẴN SÀNG UAT** |
| **S2-02 / SCRUM-50**<br>Xem và cập nhật hồ sơ cá nhân | **PASS**<br>(7/7 integration tests, PR-08 patched) | **PASS**<br>(Component tests & Form validation OK) | **PASS**<br>(20/20 multi-viewport tests) | **PENDING** | **ĐÃ HOÀN THIỆN & SẴN SÀNG UAT** |
| **S2-03 / SCRUM-51**<br>Tải ảnh đại diện (Avatar & Thumbnail) | **PASS**<br>(8/8 image/thumb tests) | **PASS**<br>(Modal, Preview & Canvas crop OK) | **PASS**<br>(15/15 serial tests) | **PENDING** | **ĐÃ HOÀN THIỆN & SẴN SÀNG UAT** |

> **Cam kết tuân thủ quy tắc bàn giao:** Cột `Manual UAT` được duy trì trạng thái **PENDING**. Quyết định nghiệm thu cuối cùng thuộc về Product Owner / User. Không tự ý đóng Scrum khi chưa có sự xác nhận của người dùng.

---

## B. CHI TIẾT TỪNG TEST CASE THEO BẢNG ĐẶC TẢ

### 1. PHẦN A – S2-01: NHẬP DANH SÁCH NHÂN SỰ TỪ EXCEL (SCRUM-49)

| Test ID | Tình huống kiểm thử | Các bước thực hiện | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Minh chứng (Evidence) |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **EX-01** | Tải file mẫu | 1. Đăng nhập ADMIN.<br>2. Vào `/admin/users` -> click "Nhập từ Excel".<br>3. Nhấn "Tải file mẫu (.xlsx)". | Trả về file mẫu `Mau_nhap_nhan_su.xlsx`, dung lượng > 100 bytes, có header tiếng Việt chuẩn. | Tải về thành công file `Mau_nhap_nhan_su.xlsx`, mở được với đúng 4 cột bắt buộc. | **PASS** | `e2e/excel-import.spec.ts`<br>API: `GET /api/admin/users/import/template` |
| **EX-02** | Import tất cả dòng hợp lệ | 1. Tải lên file 3 dòng dữ liệu hợp lệ.<br>2. Xem bảng preview (3 valid, 0 invalid).<br>3. Nhấn "Nhập 3 nhân sự hợp lệ". | Nhập thành công cả 3 nhân sự vào database, gửi email kích hoạt, báo cáo thành công 3/3. | API trả về `successCount=3, failedCount=0`. Thẻ kết quả hiển thị màu xanh hoàn tất. | **PASS** | `e2e/excel-import-runtime-cases.spec.ts` (CASE 1)<br>DB verify: 3 user được tạo |
| **EX-03** | File gồm 7 dòng hợp lệ, 3 dòng lỗi | 1. Tải lên file 10 dòng (7 đúng, 3 lỗi: sai email, thiếu họ tên, sai role).<br>2. Preview hiển thị 7 valid, 3 invalid.<br>3. Nhấn "Nhập 7 nhân sự hợp lệ". | Chỉ nhập 7 dòng hợp lệ. 3 dòng lỗi bị bỏ qua và liệt kê chi tiết lý do. Không rollback 7 dòng đúng. | Hệ thống nhập đúng 7 user vào DB. Thẻ kết quả hiển thị 7 thành công, 3 thất bại với danh sách dòng lỗi. | **PASS** | `e2e/excel-import-runtime-cases.spec.ts` (CASE 2)<br>`excel_import_result_desktop_1440.png` |
| **EX-04** | Email đã tồn tại trong hệ thống | 1. Tải lên file chứa email `admin@company.com`.<br>2. Kiểm tra bảng xem trước. | Báo lỗi tại dòng chứa email: "Email đã tồn tại trong hệ thống." Nút xác nhận bị vô hiệu hóa nếu 0 dòng hợp lệ. | Bảng preview hiển thị chip "Lỗi" màu đỏ, thông báo cụ thể. Nút CTA bị disabled. | **PASS** | `e2e/excel-import-runtime-cases.spec.ts` (CASE 3)<br>Backend `UserExcelImportServiceTest` |
| **EX-05** | Email trùng lặp trong cùng file | 1. File Excel chứa 2 dòng có cùng email `duplicate@company.local`.<br>2. Chạy preview import. | Báo lỗi trùng lặp tại cả hai dòng: "Email trùng lặp tại nhiều dòng trong file". Không cho phép tạo trùng. | Backend phát hiện tập email xuất hiện > 1 lần, đánh dấu lỗi `INVALID_DUPLICATE_EMAIL_IN_FILE` cho cả 2 dòng. | **PASS** | Backend `UserExcelImportServiceTest.testPreview_duplicateEmailInFile_markedAsInvalid`<br>`AdminUserImportIntegrationTest` |
| **EX-06** | Vai trò không hợp lệ | 1. File chứa vai trò `SUPER_ADMIN_FAKE`.<br>2. Đọc kết quả preview. | Báo lỗi cụ thể: "Vai trò không hợp lệ. Các vai trò được hỗ trợ: ADMIN, HR_MANAGER, RECRUITER, INTERVIEWER...". | Hiển thị thông báo lỗi vai trò rõ ràng bằng tiếng Việt. | **PASS** | `e2e/excel-import-runtime-cases.spec.ts` (CASE 4)<br>Backend `UserExcelImportServiceTest` |
| **EX-07** | Thiếu cột bắt buộc | 1. Tải lên file thiếu cột "Họ và tên" hoặc "Email". | Từ chối file ngay khi đọc sheet, hiển thị alert cảnh báo tiếng Việt. | Banner alert hiển thị: "File Excel thiếu cột bắt buộc. Yêu cầu: Họ và tên, Email, Phòng ban, Vai trò". | **PASS** | `e2e/excel-import-runtime-cases.spec.ts` (CASE 5)<br>Backend `UserExcelImportServiceTest` |
| **EX-08** | File sai định dạng (.txt, .pdf) | 1. Chọn file văn bản `invalid_test.txt`.<br>2. Tải lên hệ thống. | Từ chối file, hiển thị lỗi định dạng tệp tin. | Giao diện hiển thị: "Định dạng tệp không được hỗ trợ. Vui lòng tải lên tệp .xlsx hoặc .xls". | **PASS** | `e2e/excel-import.spec.ts`<br>Kiểm tra mime & extension cả FE & BE |
| **EX-09** | File vượt dung lượng (>10MB) | 1. Tải lên file có dung lượng lớn hơn 10MB. | Frontend chặn trước khi upload. Backend từ chối với mã lỗi 400. | Chặn tải lên an toàn, không gây crash server hoặc memory leak. | **PASS** | Backend `UserExcelImportServiceTest.testPreview_fileTooLarge_rejected`<br>Frontend `MAX_FILE_SIZE = 10 * 1024 * 1024` |
| **EX-10** | Dữ liệu xuất hiện trong User Management | 1. Sau khi import hoàn tất ở EX-02, nhấn "Quay lại danh sách nhân sự".<br>2. Xem trang `/admin/users`. | Người dùng mới nhập xuất hiện trong bảng danh sách nhân sự với trạng thái `CHỜ KÍCH HOẠT`. | Dữ liệu nhân sự mới hiển thị đầy đủ tên, email, phòng ban, vai trò trên bảng quản trị. | **PASS** | `e2e/excel-import-runtime-cases.spec.ts` (CASE 1)<br>Trang `/admin/users` tải lại dữ liệu mới |
| **EX-11** | HR_MANAGER / RECRUITER thử import | 1. Đăng nhập với tài khoản HR_MANAGER hoặc RECRUITER.<br>2. Thử truy cập `/admin/import-excel` hoặc gọi API import. | Bị chặn quyền 403 Forbidden. Frontend ẩn nút hoặc chuyển hướng Unauthorized. | Endpoint được bảo vệ bởi `@PreAuthorize("hasAuthority('USER_MANAGE')")`. Trả về HTTP 403 Forbidden chuẩn RBAC. | **PASS** | Backend `AdminUserImportIntegrationTest.test_importExcel_forbiddenForNonAdmin`<br>Frontend `RbacMatrix.test.ts` |
| **EX-12** | Quá trình import kéo dài | 1. Import file nhiều dòng gửi email SMTP tuần tự (~30-40s). | Phiên làm việc không bị ngắt bất thường, không kích hoạt idle timeout 5 phút ngoài ý muốn. | Tiến trình hoàn tất êm xuôi, người dùng vẫn giữ phiên đăng nhập hợp lệ. | **PASS** | `e2e/excel-import-runtime-cases.spec.ts` (CASE 2 - 40s runtime)<br>Session heartbeat hoạt động ổn định |
| **EX-13** | Xem trước rồi hủy | 1. Tải file lên và xem bảng preview.<br>2. Nhấn nút "Hủy / Tải lại file khác" hoặc thoát trang mà không bấm Xác nhận. | Không có bất kỳ tài khoản nào được tạo trong cơ sở dữ liệu. | Endpoint `/preview` là Read-Only in-memory, hoàn toàn không gọi repository insert. Database nguyên vẹn. | **PASS** | Backend `UserExcelImportServiceTest.testPreview_onlyInMemory_noDbInsert`<br>`AdminUserImportIntegrationTest` |

---

### 2. PHẦN B – S2-02: XEM VÀ CẬP NHẬT HỒ SƠ CÁ NHÂN (SCRUM-50)

| Test ID | Tình huống kiểm thử | Các bước thực hiện | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Minh chứng (Evidence) |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **PR-01** | Mở hồ sơ cá nhân | 1. Đăng nhập tài khoản.<br>2. Mở `/profile`. | Hiển thị chính xác thông tin: Họ tên, Email, Vai trò, Trạng thái hoạt động của chính người dùng đó. | Summary Header hiển thị "Quản trị viên Hệ thống", "admin@company.com", Badge "Quản trị viên", "Đang hoạt động". Không có mã thẻ giả #1. | **PASS** | `e2e/profile.spec.ts`<br>`profile_desktop_1440.png` |
| **PR-02** | Đổi họ tên | 1. Sửa Họ và tên trong tab Thông tin cá nhân.<br>2. Nhấn "Lưu thay đổi". | Lưu thành công vào DB, hiển thị Toast xanh, cập nhật tức thì trên Summary Header. | Dữ liệu lưu thật vào DB, header và form cập nhật tên mới. | **PASS** | `e2e/profile.spec.ts`<br>Backend `UserProfileIntegrationTest.test_PR02_updateFullName_success` |
| **PR-03** | Đổi số điện thoại hợp lệ | 1. Nhập SĐT định dạng Việt Nam (`0912345678` hoặc `+84987654321`).<br>2. Nhấn Lưu. | Lưu thành công vào cơ sở dữ liệu. | Backend xác thực Regex `^(0|\+84)[35789]\d{8}$` thành công và lưu DB. | **PASS** | Backend `UserProfileIntegrationTest.test_PR03_updateValidPhone_success` |
| **PR-04** | Số điện thoại sai định dạng | 1. Nhập số điện thoại sai chuẩn VN (ví dụ: `098234092839` - 12 số, hoặc `0123456789`).<br>2. Nhấn Lưu. | Báo lỗi trực tiếp dưới ô SĐT: "Số điện thoại không đúng định dạng Việt Nam." Viền đỏ ô input SĐT, không làm đỏ ô Họ tên. | Hiển thị thông báo lỗi màu đỏ ngay dưới ô SĐT. Backend trả về 400 Bad Request. | **PASS** | `e2e/profile.spec.ts`<br>Backend `UserProfileIntegrationTest.test_PR04_invalidPhoneFormat_rejected` |
| **PR-05** | Đổi chức danh hiển thị | 1. Nhập chức danh công việc mong muốn hiển thị.<br>2. Nhấn Lưu. | Lưu thành công vào trường `displayName` trong DB. | Dữ liệu lưu thành công và trả về trong `/api/auth/me`. | **PASS** | Backend `UserProfileIntegrationTest.test_PR05_updateDisplayName_success` |
| **PR-06** | Tự sửa email qua giao diện | 1. Quan sát ô Email trong form. | Ô Email bị khóa (`disabled`), người dùng không thể gõ sửa. | Input `#profile-email` có thuộc tính `disabled`. Con trỏ hiển thị not-allowed. | **PASS** | `e2e/profile.spec.ts` |
| **PR-07** | Tự sửa email qua API | 1. Gửi request `PUT /api/auth/profile` kèm payload `{"email": "hacker@domain.com"}`. | Backend hoàn toàn bỏ qua trường email, email trong DB giữ nguyên. | Email trong DB không thay đổi. Trả về đúng email hiện tại của người dùng. | **PASS** | Backend `UserProfileIntegrationTest.test_PR07_PR08_immutableEmailAndDepartment` |
| **PR-08** | Tự sửa phòng ban hoặc role qua API | 1. Gửi request `PUT /api/auth/profile` kèm `{"department": "Phòng Ban Mới", "roles": ["ADMIN"]}`. | Backend chặn đứng mọi nỗ lực thay đổi phòng ban và vai trò. Dữ liệu phòng ban cũ giữ nguyên. | **ĐÃ VÁ LỖI:** `AuthService.java` đã loại bỏ việc cập nhật department từ request người dùng. Department cũ giữ nguyên 100%. | **PASS** | Backend `UserProfileIntegrationTest.test_PR07_PR08_immutableEmailAndDepartment`<br>Unit test `AuthServiceTest.test28` |
| **PR-09** | Refresh trình duyệt | 1. Cập nhật họ tên thành công.<br>2. Nhấn F5 (Reload page). | Dữ liệu mới vừa sửa vẫn hiển thị chính xác, không bị quay lại dữ liệu cũ. | Trang web gọi lại `/api/auth/me` và hiển thị dữ liệu mới nhất từ DB. | **PASS** | `e2e/profile.spec.ts` |
| **PR-10** | Logout / Login lại | 1. Đăng xuất khỏi hệ thống.<br>2. Đăng nhập lại. | Dữ liệu đã lưu vẫn được bảo toàn. | Dữ liệu lưu vĩnh viễn trên cơ sở dữ liệu vật lý, hiển thị chính xác sau khi đăng nhập mới. | **PASS** | Test chu trình đăng nhập E2E & Backend persistence |
| **PR-11** | User A sửa hồ sơ của User B | 1. User A gửi request cập nhật hồ sơ với token của User A nhưng cố tình đính kèm ID hoặc tham số của User B. | Bị từ chối. User B không bị ảnh hưởng. Hồ sơ chỉ được cập nhật cho chính user sở hữu JWT token. | API `PUT /api/auth/profile` trích xuất danh tính trực tiếp từ SecurityContext token, không chấp nhận target ID từ client. User B an toàn tuyệt đối. | **PASS** | Backend `UserProfileIntegrationTest.test_PR11_userACannotUpdateUserB` |
| **PR-12** | Hồ sơ trên màn hình 360px | 1. Co màn hình về chiều rộng 360px (Mobile Small). | Không vỡ giao diện, không bị tràn ngang (`scrollWidth <= innerWidth`), nút bấm và text đọc rõ. | Bố cục co giãn linh hoạt thành 1 cột, nút Lưu/Hủy full-width thân thiện với ngón tay. | **PASS** | `e2e/profile.spec.ts`<br>`profile_mobile_360.png` |

---

### 3. PHẦN C – S2-03: TẢI ẢNH ĐẠI DIỆN (AVATAR & THUMBNAIL) (SCRUM-51)

| Test ID | Tình huống kiểm thử | Các bước thực hiện | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Minh chứng (Evidence) |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **AV-01** | Upload JPG dưới 2MB | 1. Chọn file ảnh JPG dung lượng 500KB.<br>2. Mở modal preview -> nhấn "Lưu ảnh". | Upload thành công, modal đóng, Toast xanh báo cập nhật thành công. | API trả về 200 kèm `avatarUrl`. Ảnh hiển thị ngay lập tức. | **PASS** | `e2e/avatar-integration.spec.ts`<br>Backend `AvatarIntegrationTest.test_uploadAvatar_success_jpeg` |
| **AV-02** | Upload PNG dưới 2MB | 1. Chọn file ảnh PNG hợp lệ dưới 2MB.<br>2. Lưu ảnh. | Upload thành công, lưu file và thumbnail chuẩn định dạng PNG. | Backend lưu ảnh gốc và sinh thumbnail PNG 150x150 thành công. | **PASS** | Backend `AvatarIntegrationTest.test_uploadAvatar_success_png` |
| **AV-03** | Upload ảnh lớn hơn 2MB | 1. Chọn file ảnh > 2MB (ví dụ: 3.5MB). | Bị từ chối cả ở Frontend (chặn trước khi gửi) và Backend (trả về 400 Bad Request). | Frontend hiển thị cảnh báo kích thước vượt quá 2MB. Backend chặn an toàn qua `AvatarService`. | **PASS** | Backend `AvatarIntegrationTest.test_uploadAvatar_fileTooLarge_rejected`<br>Frontend `MAX_FILE_SIZE = 2 * 1024 * 1024` |
| **AV-04** | Upload PDF/TXT giả mạo đuôi ảnh | 1. Đổi tên file văn bản `fake.txt` thành `fake.jpg`.<br>2. Tải lên hệ thống. | Backend đọc magic byte (`ImageIO.read`) phát hiện dữ liệu không phải hình ảnh và từ chối. | Backend trả về 400 Bad Request: "Tệp không phải là hình ảnh hợp lệ hoặc dữ liệu bị hỏng." | **PASS** | Backend `AvatarIntegrationTest.test_uploadAvatar_spoofedTxtFile_rejected` |
| **AV-05** | Upload file hỏng / byte rác | 1. Gửi request multipart với byte rác không thể giải mã hình ảnh. | Backend xử lý lỗi an toàn, không sinh lỗi 500 NullPointerException. | Báo lỗi an toàn 400, ghi log cảnh báo và không lưu file rác vào đĩa cứng. | **PASS** | Backend `AvatarIntegrationTest.test_uploadAvatar_corruptedImageBytes_rejected` |
| **AV-06** | Chọn ảnh hình chữ nhật (Crop vuông) | 1. Tải lên ảnh chữ nhật kích thước 300x150.<br>2. Kiểm tra ảnh được lưu trên đĩa. | Hệ thống tự động cắt ở vị trí trung tâm thành hình vuông (150x150). | Backend sử dụng thuật toán crop tâm: `BufferedImage.getSubimage((w-size)/2, (h-size)/2, size, size)`. File lưu trữ là hình vuông chuẩn. | **PASS** | Backend `AvatarIntegrationTest.test_uploadAvatar_rectangularImage_croppedToSquare` |
| **AV-07** | Tạo Thumbnail thực tế trên đĩa | 1. Sau khi upload avatar thành công.<br>2. Kiểm tra thư mục uploads và gọi API `/api/auth/avatar/thumbnail`. | File thumbnail vật lý `_thumb.ext` được tạo trên đĩa cứng (150x150 px). API trả về đúng file thumbnail. | File `..._thumb.jpg` tồn tại thật trên đĩa. API `/thumbnail` trả về HTTP 200 kèm `Content-Type: image/jpeg`. | **PASS** | Backend `AvatarIntegrationTest.test_getAvatarThumbnail_success`<br>Kiểm tra file vật lý trên disk |
| **AV-08** | Avatar trên Header navbar | 1. Upload avatar thành công.<br>2. Quan sát thanh Header góc trên bên phải. | Avatar trên Header đổi từ ký tự viết tắt sang hình ảnh thực tế. | Phần tử `.header-right .user-avatar-img` hiển thị ảnh mới đồng bộ với ProfileHeader. | **PASS** | `e2e/avatar-integration.spec.ts` (bước 6) |
| **AV-09** | Refresh trình duyệt | 1. Tải lại trang (F5). | Avatar trên Header và trang Profile vẫn hiển thị ảnh, không bị mất. | Ảnh được tải từ cache và URL lưu trong profile, hiển thị ổn định. | **PASS** | `e2e/avatar-integration.spec.ts` (bước 8) |
| **AV-10** | Logout / Login lại | 1. Đăng xuất.<br>2. Đăng nhập lại tài khoản. | Avatar vẫn được nạp đầy đủ từ database. | Thuộc tính `avatarUrl` trả về trong phản hồi đăng nhập và API `/me`. | **PASS** | Backend persistence test & Auth session verification |
| **AV-11** | Đổi sang ảnh khác | 1. Đang có ảnh cũ, bấm đổi ảnh khác và lưu. | Ảnh mới thay thế ảnh cũ, file cũ được dọn dẹp an toàn. | Header và trang cá nhân cập nhật sang ảnh mới ngay lập tức. | **PASS** | Backend `AvatarService.uploadAvatar` dọn dẹp file cũ & E2E verification |
| **AV-12** | Xóa avatar | 1. Nhấn nút "Xóa ảnh đại diện" (thùng rác).<br>2. Xác nhận tại hộp thoại Modal. | Avatar bị xóa, giao diện quay về hiển thị chữ cái viết tắt mặc định ("Q"). | Toast thông báo: "Đã xóa ảnh đại diện." Icon avatar trở về chữ cái đầu của họ tên. File trên đĩa được xóa. | **PASS** | `e2e/avatar-integration.spec.ts` (bước 9)<br>API `DELETE /api/auth/avatar` |
| **AV-13** | User A cố ý sửa avatar của User B | 1. User A gọi endpoint cập nhật/xóa avatar với token của mình nhưng nhắm vào tài khoản User B. | Backend chỉ cập nhật cho chính người dùng trong SecurityContext. Avatar của User B không thể bị can thiệp. | Endpoint `/api/auth/avatar` gắn chặt với `currentUser.getId()`, không nhận User ID từ client. | **PASS** | Backend `AvatarIntegrationTest` & `SecurityConfig` RBAC isolation |
| **AV-14** | Mobile 360px | 1. Mở trang Profile và Modal đổi avatar trên màn hình 360px. | Modal nằm gọn trong màn hình, nút bấm to rõ, không tràn viền. | Modal box có chiều rộng `<= 360px`, hiển thị nút "Hủy" và "Lưu ảnh" cân đối, thao tác mượt mà. | **PASS** | `e2e/avatar-integration.spec.ts`<br>`avatar_modal_mobile_360.png` |

---

## C. CÁC LỖI PHÁT HIỆN VÀ BIỆN PHÁP KHẮC PHỤC

### 1. Lỗi rò rỉ quyền cập nhật phòng ban qua API Profile (S2-02 / PR-08)
- **Mô tả lỗi:** Khi người dùng gửi request `PUT /api/auth/profile`, nếu đính kèm thuộc tính `department` trong payload JSON (ví dụ: `{"department": "Ban Giám Đốc"}`), backend chấp nhận và cập nhật trực tiếp phòng ban của người dùng trong database.
- **Mức độ nghiêm trọng:** **CAO (Bảo mật & Vi phạm nghiệp vụ)**. Theo Jira SCRUM-50 và Product Backlog Sheet 4: Người dùng KHÔNG được tự ý thay đổi Email, Phòng ban và Vai trò.
- **Nguyên nhân kỹ thuật:** Trong file `AuthService.java` (dòng 564-566), hàm `updateProfile` chứa đoạn mã:
  ```java
  if (request.getDepartment() != null && !request.getDepartment().trim().isEmpty()) {
      user.setDepartment(request.getDepartment().trim());
  }
  ```
- **File code được sửa:**
  - `backend/auth-service/src/main/java/com/example/auth_service/service/AuthService.java`: Đã loại bỏ hoàn toàn việc gán `user.setDepartment(...)` trong phương thức `updateProfile`.
  - `backend/auth-service/src/test/java/com/example/auth_service/service/AuthServiceTest.java`: Cập nhật `test28_updateProfile_success` xác nhận `department` không bị thay đổi dù request có truyền giá trị mới.
  - `backend/auth-service/src/test/java/com/example/auth_service/controller/UserProfileIntegrationTest.java`: Bổ sung test tích hợp `test_PR07_PR08_immutableEmailAndDepartment` kiểm tra cấp độ HTTP MockMvc.
- **Cách xác minh lỗi đã hết:** Chạy test `UserProfileIntegrationTest` và thực nghiệm gọi API: trường `department` trong cơ sở dữ liệu giữ nguyên 100%.

### 2. Lỗi xung đột khóa file Windows khi chạy E2E song song (S2-01 / EX-01)
- **Mô tả lỗi:** Khi Playwright chạy 5 worker song song trên 5 viewports, các worker cùng ghi đè file tải về `test-downloads/downloaded_template.xlsx` tại cùng một thời điểm, dẫn đến lỗi hệ điều hành Windows: `EBUSY: resource busy or locked`.
- **Mức độ nghiêm trọng:** **TRUNG BÌNH (Độ ổn định CI/CD & Kiểm thử tự động)**.
- **Nguyên nhân kỹ thuật:** Đường dẫn file lưu trữ bị cố định tĩnh trong file kiểm thử E2E.
- **File code được sửa:**
  - `frontend/e2e/excel-import.spec.ts`: Đã sửa tên file lưu tạm thành duy nhất bằng timestamp và ngẫu nhiên (`downloaded_template_${Date.now()}_${uniqueSuffix}.xlsx`), đồng thời làm tương tự cho file `.txt` giả lập.
- **Cách xác minh lỗi đã hết:** Chạy lại `npx playwright test e2e/excel-import.spec.ts` với 5 worker đồng thời: **5/5 passed (8.1s)**.

### 3. Lỗi Timeout kiểm thử E2E do gửi email SMTP thật (S2-01 / EX-03)
- **Mô tả lỗi:** Khi import file 10 dòng (7 dòng hợp lệ), backend gửi tuần tự 7 email kích hoạt tài khoản qua Gmail SMTP máy chủ Google thật. Mỗi email mất ~4-5 giây, tổng thời gian ~35 giây, vượt quá ngưỡng timeout 30 giây mặc định của Playwright dẫn đến test bị đánh rớt do timeout.
- **Mức độ nghiêm trọng:** **TRUNG BÌNH (Flaky Test)**.
- **Nguyên nhân kỹ thuật:** Playwright mặc định cấu hình timeout 30,000ms cho mỗi test case.
- **File code được sửa:**
  - `frontend/e2e/excel-import-runtime-cases.spec.ts`: Cấu hình `test.describe.configure({ mode: 'serial', timeout: 90000 })` và `test.setTimeout(90000)` để đảm bảo tiến trình gửi mail SMTP hoàn tất trọn vẹn và ổn định.
- **Cách xác minh lỗi đã hết:** Chạy kiểm thử: **5/5 scenarios passed** với thời gian đo lường thực tế 40.0s cho ca import 7 email.

### 4. Lỗi Race Condition khi kiểm thử Avatar song song (S2-03)
- **Mô tả lỗi:** Nhiều worker Playwright cùng đăng nhập một tài khoản `admin@company.com` và đồng thời thực hiện thao tác upload, cắt ảnh và xóa avatar, gây xung đột trạng thái dữ liệu (một worker vừa upload thì worker khác xóa).
- **Mức độ nghiêm trọng:** **TRUNG BÌNH (Test Flakiness)**.
- **File code được sửa:**
  - `frontend/e2e/avatar-integration.spec.ts`: Đã thiết lập `test.describe.configure({ mode: 'serial' })` và chạy kiểm thử với `--workers=1`.
- **Cách xác minh lỗi đã hết:** Chạy `npx playwright test e2e/avatar-integration.spec.ts --workers=1`: **15/15 passed 100% (57.3s)**.

---

## D. HƯỚNG DẪN KIỂM THỬ THỦ CÔNG (MANUAL UAT CHECKLIST)

Dưới đây là bảng hướng dẫn từng bước chi tiết bằng tiếng Việt để Product Owner / Kiểm thử viên tự thao tác nghiệm thu trực tiếp trên môi trường `localhost`:

### 1. Kiểm thử Scrum S2-01: Nhập nhân sự từ Excel
- **Tài khoản đăng nhập:** `admin@company.com` / `Password123@` (Vai trò: **ADMIN**)
- **Trang cần mở:** `http://localhost:5173/admin/users`
- **Các bước thực hiện:**
  1. **Bước 1 (Tải template):** Nhấn nút **"Nhập từ Excel"** màu xanh -> Được chuyển đến `/admin/import-excel`. Nhấn nút **"Tải file mẫu (.xlsx)"**.
     - *Kết quả mong đợi:* Trình duyệt tải về file `Mau_nhap_nhan_su.xlsx`. Mở file kiểm tra thấy 4 cột: "Họ và tên", "Email", "Phòng ban", "Vai trò".
     - *Thời điểm chụp ảnh:* Chụp ảnh màn hình bước 1 có nút Tải file mẫu và file đã tải về.
  2. **Bước 2 (Xem trước & kiểm tra lỗi từng dòng):** Mở file mẫu vừa tải, điền thử 3 dòng:
     - Dòng 1: Nguyễn Văn Đúng, `test_valid_user1@company.local`, Kỹ thuật, Người phỏng vấn
     - Dòng 2: Lê Thị Lỗi Email, `email_khong_hop_le`, Nhân sự, Chuyên viên tuyển dụng
     - Dòng 3: Trần Văn Trùng Admin, `admin@company.com`, Quản trị, ADMIN
     Kéo thả file vào khu vực upload.
     - *Kết quả mong đợi:* Hệ thống hiển thị bảng xem trước (Preview):
       - Dòng 1: Chip xanh "Hợp lệ"
       - Dòng 2: Chip đỏ "Lỗi" (Email không đúng định dạng)
       - Dòng 3: Chip đỏ "Lỗi" (Email đã tồn tại trong hệ thống)
       - Nút CTA ghi rõ: **"Nhập 1 nhân sự hợp lệ"**.
     - *Thời điểm chụp ảnh:* **Chụp ảnh bảng Preview với chip phân loại màu sắc.**
  3. **Bước 3 (Thực hiện nhập dữ liệu):** Nhấn nút **"Nhập 1 nhân sự hợp lệ"**.
     - *Kết quả mong đợi:* Hiển thị thẻ Báo cáo kết quả nhập dữ liệu: "Thành công: 1, Thất bại: 2". Liệt kê chi tiết 2 dòng lỗi phía dưới.
     - *Thời điểm chụp ảnh:* **Chụp ảnh thẻ báo cáo kết quả import.**
  4. **Bước 4 (Xác nhận lưu dữ liệu):** Nhấn nút **"Quay lại danh sách nhân sự"**.
     - *Kết quả mong đợi:* Tài khoản `test_valid_user1@company.local` xuất hiện trong bảng Quản lý người dùng với trạng thái "Chờ kích hoạt".
  5. **Bước 5 (Kiểm tra phân quyền):** Đăng xuất, đăng nhập với tài khoản `hr_manager@company.com` hoặc `recruiter@company.com`. Thử gõ trực tiếp URL `http://localhost:5173/admin/import-excel`.
     - *Kết quả mong đợi:* Bị chặn truy cập (chuyển hướng về 403 Unauthorized hoặc Dashboard).

---

### 2. Kiểm thử Scrum S2-02: Xem và cập nhật hồ sơ cá nhân
- **Tài khoản đăng nhập:** Bất kỳ tài khoản nào (ví dụ: `admin@company.com` / `Password123@`)
- **Trang cần mở:** `http://localhost:5173/profile`
- **Các bước thực hiện:**
  1. **Bước 1 (Xem thông tin):** Mở trang Profile.
     - *Kết quả mong đợi:* Summary Header hiển thị đúng tên, email, vai trò và trạng thái.
     - *Kiểm tra an toàn:* Ô Email và Vai trò bị vô hiệu hóa (disabled), không cho phép sửa.
  2. **Bước 2 (Kiểm tra validation số điện thoại):** Tại tab "Thông tin cá nhân", nhập vào ô Số điện thoại: `0123456789` (đầu số cố định cũ) hoặc `098234092839` (12 số). Nhấn "Lưu thay đổi".
     - *Kết quả mong đợi:* Báo lỗi màu đỏ ngay dưới ô Số điện thoại: *"Số điện thoại không đúng định dạng Việt Nam."* Ô input bị viền đỏ. Ô Họ và tên không bị lỗi.
     - *Thời điểm chụp ảnh:* **Chụp ảnh thông báo lỗi validation SĐT.**
  3. **Bước 3 (Cập nhật thành công):** Sửa lại SĐT thành `0912345678` (hoặc `+84987654321`), sửa Họ và tên thành `Quản trị viên Hệ thống Mới`. Nhấn "Lưu thay đổi".
     - *Kết quả mong đợi:* Thông báo Toast xanh "Cập nhật thông tin thành công". Tên trên Summary Header đổi ngay lập tức.
     - *Thời điểm chụp ảnh:* **Chụp ảnh Toast thành công và tên mới.**
  4. **Bước 4 (Kiểm tra lưu vĩnh viễn):** Nhấn F5 để tải lại trang, sau đó Đăng xuất và Đăng nhập lại.
     - *Kết quả mong đợi:* Tên và Số điện thoại mới vẫn giữ nguyên chính xác.
  5. **Bước 5 (Kiểm tra responsive 360px):** Nhấn F12 (DevTools) -> Chuyển chế độ thiết bị di động, đặt kích thước **360 x 800**.
     - *Kết quả mong đợi:* Giao diện không bị tràn thanh cuộn ngang, bố cục đọc rõ ràng, nút Lưu/Hủy thao tác thuận tiện.
     - *Thời điểm chụp ảnh:* **Chụp ảnh màn hình mobile 360px.**

---

### 3. Kiểm thử Scrum S2-03: Tải ảnh đại diện (Avatar)
- **Tài khoản đăng nhập:** `admin@company.com` / `Password123@`
- **Trang cần mở:** `http://localhost:5173/profile`
- **Các bước thực hiện:**
  1. **Bước 1 (Chọn ảnh & mở Modal):** Di chuột vào Avatar tròn trên Summary Header, nhấn vào biểu tượng **Camera**. Chọn một file ảnh JPG hoặc PNG hình chữ nhật (dung lượng < 2MB).
     - *Kết quả mong đợi:* Hộp thoại Modal "Đổi ảnh đại diện" mở ra, hiển thị ảnh preview được căn giữa. Nút "Lưu ảnh" được kích hoạt.
     - *Thời điểm chụp ảnh:* **Chụp ảnh Modal xem trước ảnh.**
  2. **Bước 2 (Lưu avatar):** Nhấn nút **"Lưu ảnh"**.
     - *Kết quả mong đợi:* Modal tự động đóng. Toast xanh thông báo: *"Cập nhật ảnh đại diện thành công."*
     - *Xác minh giao diện:* Cả Avatar lớn trên ProfileHeader và Avatar nhỏ trên góc phải Header navbar đều cập nhật hình ảnh mới đồng thời. Nút "Xóa ảnh đại diện" (thùng rác đỏ) xuất hiện bên cạnh avatar.
     - *Thời điểm chụp ảnh:* **Chụp ảnh Avatar mới trên cả ProfileHeader và Navbar Header.**
  3. **Bước 3 (Kiểm tra tính bền vững):** Nhấn F5 tải lại trang.
     - *Kết quả mong đợi:* Ảnh đại diện vẫn hiển thị chính xác.
  4. **Bước 4 (Thử nghiệm validation từ chối file sai):**
     - Thử chọn file có dung lượng > 2MB -> Hệ thống báo lỗi kích thước vượt quá giới hạn.
     - Thử chọn file `.txt` hoặc `.pdf` -> Hệ thống báo lỗi định dạng không hợp lệ.
     - *Thời điểm chụp ảnh:* Chụp ảnh thông báo lỗi khi chọn file không hợp lệ.
  5. **Bước 5 (Xóa avatar):** Nhấn nút biểu tượng Thùng rác đỏ (Xóa ảnh đại diện) bên cạnh camera. Hộp thoại xác nhận hiển thị -> Nhấn "Xóa ảnh".
     - *Kết quả mong đợi:* Toast xanh thông báo *"Đã xóa ảnh đại diện."* Avatar quay trở về ký tự viết tắt mặc định ("Q") trên cả Profile và Navbar. Nút thùng rác tự động ẩn đi.
     - *Thời điểm chụp ảnh:* **Chụp ảnh avatar quay về ký tự viết tắt sau khi xóa.**
  6. **Bước 6 (Kiểm tra responsive modal trên mobile 360px):** Đặt viewport 360px, nhấn Camera để mở Modal.
     - *Kết quả mong đợi:* Modal không bị tràn màn hình, các nút bấm cân đối, đóng/mở mượt mà.
     - *Thời điểm chụp ảnh:* **Chụp ảnh Modal avatar trên 360px.**

---

## E. DANH MỤC TỆP TIN VÀ BẰNG CHỨNG HÌNH ẢNH HỆ THỐNG

Các bằng chứng kiểm nghiệm trực quan tự động đã được lưu trữ tại thư mục Artifacts của phiên làm việc (`de7af886-4453-4c5f-b312-816842f0772b`):

1. **S2-01 Preview Desktop 1440:** `excel_import_preview_desktop_1440.png`
2. **S2-01 Preview Mobile 360:** `excel_import_preview_mobile_360.png`
3. **S2-01 Import Result Breakdown:** `excel_import_result_desktop_1440.png`
4. **S2-02 Profile Page Desktop 1440:** `profile_desktop_1440.png`
5. **S2-02 Profile Page Mobile 360:** `profile_mobile_360.png`
6. **S2-03 Avatar Modal Desktop 1440:** `avatar_modal_desktop_1440.png`
7. **S2-03 Avatar Modal Mobile 360:** `avatar_modal_mobile_360.png`

---

## F. KẾT LUẬN & ĐỀ XUẤT TIẾP THEO

1. **Phạm vi hoàn thiện:** Cả ba User Story **S2-01 (SCRUM-49)**, **S2-02 (SCRUM-50)**, và **S2-03 (SCRUM-51)** đã hoàn thành toàn bộ yêu cầu kỹ thuật:
   - Backend API hoạt động chính xác với đầy đủ xác thực, phân quyền 7 vai trò, transaction an toàn và sinh thumbnail vật lý.
   - Frontend hiển thị đẹp mắt, validation chặt chẽ bằng tiếng Việt, hỗ trợ responsive hoàn hảo từ 1920px xuống đến 360px.
   - Toàn bộ các bài kiểm thử tự động (Unit, Integration, E2E) đạt tỷ lệ **100% PASS** (275/275 Backend tests, 187/187 Frontend tests, 40+ E2E scenarios).
   - Đã khắc phục triệt để lỗ hổng cho phép tự ý đổi `department` trong hồ sơ cá nhân.
2. **Bảo toàn an toàn:** Toàn bộ công việc được bảo toàn nguyên vẹn trên nhánh `feature/rbac-backlog-hardening`, không merge vào `dev`/`main`, không làm ảnh hưởng đến dữ liệu người dùng thật.
3. **Sẵn sàng chuyển giao:** Đề nghị Product Owner thực hiện kiểm thử thủ công theo bảng checklist tại **Mục D** để chính thức nghiệm thu Sprint 2 (S2-01, S2-02, S2-03) trước khi chuyển tiếp sang **S2-04**.
