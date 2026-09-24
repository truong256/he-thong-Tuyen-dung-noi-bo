# Hệ thống Tuyển dụng Nội bộ

> Hệ thống quản lý tuyển dụng nội bộ (Applicant Tracking System - ATS) dành cho doanh nghiệp, giúp số hóa toàn bộ quy trình từ yêu cầu tuyển dụng, phê duyệt headcount, đăng tin, tiếp nhận hồ sơ, phỏng vấn, đánh giá, offer đến onboarding.

## 1. Tổng quan dự án

Hiện nay quy trình tuyển dụng nội bộ thường bị phân tán giữa Excel, Gmail, Google Drive, điện thoại và các nhóm chat. Điều này khiến thông tin ứng viên khó theo dõi, lịch sử phê duyệt thiếu minh bạch, nhận xét phỏng vấn không thống nhất và nhiều hồ sơ tiềm năng dễ bị bỏ quên.

Dự án **Hệ thống Tuyển dụng Nội bộ** được xây dựng như một nguồn dữ liệu tập trung cho toàn bộ vòng đời tuyển dụng. Mỗi yêu cầu tuyển dụng, quyết định phê duyệt, thay đổi trạng thái ứng viên, kết quả phỏng vấn và offer đều được lưu lại để có thể theo dõi và truy vết.

Backlog hiện tại gồm:

- **9 Epic**
- **76 User Story**
- **350 Story Point**
- **8 Sprint**
- **7 nhóm vai trò người dùng**

## 2. Bài toán cần giải quyết

Hệ thống tập trung giải quyết các vấn đề chính:

- Không có một nơi duy nhất để biết một vị trí tuyển dụng đang ở giai đoạn nào.
- Yêu cầu tuyển dụng và headcount được duyệt qua email hoặc trao đổi miệng, khó truy vết.
- CV nằm rải rác ở nhiều nguồn và khó tái sử dụng cho các vị trí sau.
- Nhận xét phỏng vấn thiếu tiêu chí chung nên khó so sánh ứng viên khách quan.
- Ứng viên không được cập nhật trạng thái đầy đủ, ảnh hưởng trải nghiệm và thương hiệu tuyển dụng.
- Recruiter mất nhiều thời gian cho các thao tác thủ công như lọc hồ sơ, đặt lịch, gửi email và tổng hợp báo cáo.

## 3. Mục tiêu sản phẩm

Hệ thống hướng tới việc:

1. Quản lý trọn vòng đời tuyển dụng trên một nền tảng duy nhất.
2. Bảo đảm mọi headcount đều có lịch sử phê duyệt rõ ràng.
3. Chuẩn hóa việc đánh giá ứng viên bằng khung năng lực và phiếu đánh giá.
4. Hỗ trợ recruiter xử lý hồ sơ nhanh hơn bằng pipeline trực quan.
5. Cải thiện trải nghiệm ứng viên thông qua tra cứu trạng thái và thông báo theo từng giai đoạn.
6. Cung cấp dashboard và báo cáo để HR Manager theo dõi hiệu quả tuyển dụng.
7. Bảo vệ dữ liệu cá nhân của ứng viên bằng phân quyền và nhật ký truy cập.

## 4. Vai trò người dùng

| Vai trò | Mục tiêu chính |
| --- | --- |
| **Candidate - Ứng viên** | Nộp CV, theo dõi hồ sơ, xác nhận lịch phỏng vấn và phản hồi offer |
| **Recruiter - Nhân viên tuyển dụng** | Sàng lọc CV, điều phối pipeline, đặt lịch phỏng vấn, soạn offer |
| **Hiring Manager - Trưởng bộ phận** | Tạo yêu cầu tuyển dụng, theo dõi ứng viên của vị trí và đưa ra quyết định tuyển |
| **Interviewer - Người phỏng vấn** | Xem lịch, đọc CV và nộp phiếu đánh giá theo khung năng lực |
| **HR Manager - Trưởng phòng Nhân sự** | Quản lý toàn bộ hoạt động tuyển dụng, ngân sách headcount và báo cáo |
| **Approver - Người duyệt** | Phê duyệt yêu cầu tuyển dụng và các offer vượt hạn mức |
| **Admin - Quản trị hệ thống** | Quản lý tài khoản, vai trò, danh mục dùng chung và nhật ký hệ thống |

## 5. Các nhóm chức năng chính

Backlog được chia thành 9 Epic:

| Epic | Nhóm chức năng | Nội dung chính |
| --- | --- | --- |
| **EP-01** | Tài khoản, Phân quyền & Hồ sơ | Đăng nhập, khôi phục mật khẩu, RBAC, quản trị tài khoản và hồ sơ cá nhân |
| **EP-02** | Danh mục Tổ chức & Vị trí | Phòng ban, chức danh, dải lương, khung năng lực, ngân hàng câu hỏi |
| **EP-03** | Yêu cầu tuyển dụng & Phê duyệt | Requisition, duyệt nhiều cấp, ngân sách headcount, phân công recruiter |
| **EP-04** | Đăng tin & Cổng ứng tuyển | Soạn tin, xuất bản việc làm, nộp CV, tra cứu trạng thái, referral |
| **EP-05** | Hồ sơ ứng viên & Pipeline | Hồ sơ hợp nhất, phát hiện trùng, sàng lọc, kanban và talent pool |
| **EP-06** | Phỏng vấn & Đánh giá | Đặt lịch, chống trùng lịch, thư mời, câu hỏi gợi ý, phiếu đánh giá |
| **EP-07** | Offer & Onboarding | Đề xuất offer, duyệt lương, thư mời nhận việc và checklist ngày đầu |
| **EP-08** | Thông báo & Email tự động | Email theo giai đoạn, thông báo trong ứng dụng, nhật ký gửi và SLA reminder |
| **EP-09** | Báo cáo & Dashboard | Funnel, conversion rate, time-to-hire, cost-per-hire và hiệu quả nguồn ứng viên |

## 6. Phạm vi dự án

### Trong phạm vi

- Xác thực và phân quyền theo vai trò.
- Quản trị người dùng nội bộ.
- Danh mục phòng ban, chức danh và khung năng lực.
- Yêu cầu tuyển dụng và luồng phê duyệt nhiều cấp.
- Quản lý ngân sách headcount.
- Đăng tin tuyển dụng.
- Cổng ứng tuyển công khai.
- Nộp CV và tra cứu trạng thái hồ sơ.
- Referral nội bộ.
- Quản lý hồ sơ ứng viên và phát hiện hồ sơ trùng.
- Pipeline tuyển dụng dạng Kanban.
- Đặt lịch phỏng vấn và phát hiện xung đột lịch.
- Phiếu đánh giá theo khung năng lực.
- So sánh ứng viên.
- Offer và quy trình phê duyệt offer.
- Checklist onboarding.
- Email tự động và thông báo trong hệ thống.
- Dashboard và báo cáo tuyển dụng.

### Ngoài phạm vi hiện tại

- AI bóc tách CV hoặc so khớp ngữ nghĩa JD với hồ sơ.
- Tự động đăng tin lên VietnamWorks, TopCV hoặc LinkedIn.
- Đồng bộ hai chiều với Google Calendar hoặc Outlook.
- Phỏng vấn video trực tiếp trong ứng dụng.
- Bài kiểm tra năng lực trực tuyến và chấm tự động.
- Ký số hợp đồng lao động.
- Quản lý nhân sự sau khi nhận việc như chấm công, tính lương hoặc đánh giá định kỳ.
- Ứng dụng mobile native.

## 7. Kiến trúc và công nghệ dự kiến

| Tầng | Công nghệ / định hướng |
| --- | --- |
| **Frontend** | React + TypeScript |
| **Backend** | Spring Boot (Java) hoặc NestJS - chốt theo stack của mentor trước khi triển khai |
| **Database** | PostgreSQL |
| **Authentication** | JWT Access Token + Refresh Token |
| **File Storage** | Object Storage cho CV và tài liệu ứng viên |
| **Email** | SMTP nội bộ kết hợp hàng đợi xử lý bất đồng bộ |
| **API** | RESTful API |
| **Deployment** | Môi trường staging với CI/CD |

## 8. Yêu cầu phi chức năng

- Danh sách ứng viên phản hồi dưới **1,5 giây** với khoảng **20.000 hồ sơ** và **200 vị trí**.
- Hỗ trợ khoảng **400 người dùng nội bộ**.
- Cổng ứng tuyển công khai chịu được khoảng **100 lượt nộp hồ sơ/giờ**.
- Mọi endpoint phải kiểm tra quyền ở **server**, không chỉ ẩn chức năng trên giao diện.
- Mật khẩu phải được băm an toàn bằng bcrypt hoặc cơ chế tương đương.
- Cổng ứng tuyển cần chống spam và giới hạn tần suất truy cập.
- Ghi nhật ký truy cập đối với dữ liệu ứng viên.
- Hỗ trợ xóa hồ sơ theo yêu cầu của ứng viên.
- Giao diện responsive từ độ rộng **360px**.
- Ngôn ngữ sử dụng: **Tiếng Việt**.
- Múi giờ: **Asia/Ho_Chi_Minh**.
- Tiền tệ: **VND**.
- Database và tệp CV được sao lưu hằng ngày, giữ tối thiểu 7 bản gần nhất.

## 9. Kế hoạch phát triển

| Sprint | Chủ đề | Kết quả mục tiêu |
| --- | --- | --- |
| **Sprint 1** | Tài khoản & phân quyền | 7 vai trò đăng nhập được và chỉ thấy đúng chức năng được cấp |
| **Sprint 2** | Danh mục tổ chức & vị trí | Có cấu trúc tổ chức, khung năng lực và yêu cầu tuyển dụng đầu tiên |
| **Sprint 3** | Phê duyệt & đăng tin | Một headcount đi hết quy trình duyệt và trở thành tin tuyển dụng |
| **Sprint 4** | Cổng ứng tuyển | Ứng viên có thể nộp CV trên điện thoại và tra cứu trạng thái |
| **Sprint 5** | Hồ sơ ứng viên & pipeline | Recruiter điều phối ứng viên trên bảng Kanban |
| **Sprint 6** | Phỏng vấn & đánh giá | Đặt lịch, gửi thư mời và nộp phiếu đánh giá |
| **Sprint 7** | Offer & onboarding | Offer được tạo, duyệt, gửi và ứng viên phản hồi |
| **Sprint 8** | Thông báo & báo cáo | Hoàn thiện dashboard, funnel và time-to-hire |

## 10. Tiêu chuẩn hoàn thành

Một User Story chỉ được xem là hoàn thành khi:

- Tất cả Acceptance Criteria đã được kiểm chứng.
- Code đã được review và merge vào nhánh chính.
- Có unit test cho tầng service; phần code mới hướng tới độ phủ tối thiểu **60%**.
- Build, lint và test đều pass trên CI.
- Chức năng đã deploy và chạy được trên staging.
- Phân quyền được kiểm tra ở tầng server.
- Giao diện hoạt động đúng trên màn hình từ 360px.
- Không còn lỗi mức Major trở lên.
- Product Owner đã nghiệm thu trên staging.

## 11. Cấu trúc repository

```text
he-thong-quan-ly-noi-bo/
├── frontend/   # Ứng dụng giao diện người dùng
├── backend/    # API, nghiệp vụ và truy cập dữ liệu
└── README.md
```

Cấu trúc chi tiết của từng module sẽ được bổ sung khi đội dự án chốt framework backend và bắt đầu Sprint 1.

## 12. Định hướng nghiệp vụ quan trọng

- Mọi quyết định tuyển dụng quan trọng phải có khả năng truy vết.
- Dữ liệu ứng viên chỉ được hiển thị cho đúng người có quyền.
- Thay đổi khung năng lực không được làm sai lệch các phiếu đánh giá đã nộp trước đó.
- Luồng phê duyệt phải lưu được người duyệt, thời điểm và kết quả.
- Hồ sơ ứng viên trùng cần được phát hiện để tránh phân tán lịch sử.
- Recruiter cần nhìn được toàn bộ pipeline của một vị trí trên một màn hình.
- Quyết định tuyển nên dựa trên dữ liệu từ nhiều vòng phỏng vấn và cùng một bộ tiêu chí.

## 13. Trạng thái hiện tại

Repository hiện đang ở giai đoạn **khởi tạo dự án và chuẩn hóa backlog**. Hai thư mục `frontend` và `backend` đã được tạo để chuẩn bị cho quá trình phát triển.

Tài liệu backlog là nguồn tham chiếu chính cho Epic, User Story, Acceptance Criteria, Sprint Planning và nghiệm thu trong quá trình thực tập.

---

**Dự án thực tập - Hệ thống Tuyển dụng Nội bộ**
