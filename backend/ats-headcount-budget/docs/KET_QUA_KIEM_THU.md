# Kết quả kiểm thử (SCRUM-127) — chạy bằng: npm run verify

```
PASS src/headcount-budget/headcount-budget.service.spec.ts (6.037 s)
PASS src/requisitions/requisitions.service.spec.ts
PASS src/common/guards.spec.ts
------------------------------|---------|----------|---------|---------|-------------------
File                          | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
------------------------------|---------|----------|---------|---------|-------------------
All files                     |   97.48 |    84.28 |     100 |   97.17 |                   
  headcount-budget.service.ts |   96.09 |       80 |     100 |   95.65 | 106-112,182,282   
  requisitions.service.ts     |     100 |       95 |     100 |     100 | 67                
------------------------------|---------|----------|---------|---------|-------------------
Test Suites: 3 passed, 3 total
Tests:       48 passed, 48 total
PASS test/headcount-budget.e2e-spec.ts (6.815 s)
      ✓ không có token => 401 (9 ms)
      ✓ token rác => 401 (3 ms)
      ✓ sai mật khẩu => 401, thông báo chung (93 ms)
      ✓ hmIt KHÔNG được tạo ngân sách => 403 (3 ms)
      ✓ recruiter KHÔNG được tạo ngân sách => 403 (3 ms)
      ✓ approver KHÔNG được tạo ngân sách => 403 (3 ms)
      ✓ interviewer KHÔNG được tạo ngân sách => 403 (4 ms)
      ✓ hmIt KHÔNG xem được danh sách ngân sách đầy đủ => 403 (3 ms)
      ✓ recruiter KHÔNG xem được danh sách ngân sách đầy đủ => 403 (3 ms)
      ✓ interviewer KHÔNG xem được danh sách ngân sách đầy đủ => 403 (3 ms)
      ✓ hmIt KHÔNG sửa/xoá được ngân sách => 403 (7 ms)
      ✓ recruiter KHÔNG sửa/xoá được ngân sách => 403 (5 ms)
      ✓ approver KHÔNG sửa/xoá được ngân sách => 403 (5 ms)
      ✓ interviewer KHÔNG sửa/xoá được ngân sách => 403 (6 ms)
      ✓ Interviewer không xem được headcount còn lại (4 ms)
      ✓ chỉ HR Manager/Admin đọc được nhật ký ghi đè (16 ms)
      ✓ Approver xem được ngân sách (R) kèm số liệu lương (7 ms)
      ✓ Hiring Manager chỉ xem headcount còn lại của phòng ban mình, KHÔNG thấy số liệu lương (7 ms)
      ✓ từ chối số âm, không nguyên, năm sai, field lạ => 400 (31 ms)
      ✓ trùng phòng ban + năm => 409 (5 ms)
      ✓ AC1: HR Manager khai báo ngân sách phòng Marketing theo năm (VND) (12 ms)
      ✓ AC1: HR Manager cập nhật ngân sách (33 ms)
      ✓ AC2: tạo yêu cầu mới trả về số headcount còn lại của phòng ban (8 ms)
      ✓ Hiring Manager không tạo yêu cầu cho phòng ban khác => 403 (4 ms)
      ✓ POST /check xem trước vượt chỉ tiêu mà không thay đổi dữ liệu (7 ms)
      ✓ duyệt trong chỉ tiêu (4/5) thành công (29 ms)
      ✓ AC3: yêu cầu vượt chỉ tiêu (2 > còn 1) bị CHẶN với mã 409 (16 ms)
      ✓ AC3: Approver / Admin / Hiring Manager gửi ghi đè => 403 (11 ms)
      ✓ AC3: HR Manager ghi đè không có lý do => 400 (13 ms)
      ✓ AC3+AC4: HR Manager ghi đè kèm lý do => APPROVED và có nhật ký (24 ms)
      ✓ Technical note: huỷ yêu cầu đã duyệt => headcount được trả lại (32 ms)
      ✓ Technical note: tiền lương VND — vượt ngân sách lương cũng bị chặn (23 ms)
      ✓ không hạ chỉ tiêu thấp hơn số đã dùng (IT đã dùng 4) (12 ms)
      ✓ nhật ký ngân sách ghi cả tạo và sửa (11 ms)
      ✓ xoá ngân sách chưa dùng thành công; ngân sách đã dùng bị chặn (14 ms)
Test Suites: 1 passed, 1 total
Tests:       35 passed, 35 total
```
