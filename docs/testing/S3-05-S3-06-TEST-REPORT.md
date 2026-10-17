# Báo cáo kiểm thử S3-05 / S3-06

Ngày kiểm tra: 17/10/2026. Baseline: `origin/dev` tại `efc2c23`.
Nhánh: `fix/s3-05-s3-06-complete-testing`. Không merge.

## Kết luận và phạm vi bằng chứng

- **S3-05: PARTIAL** — luồng sao chép được kiểm tra bằng JUnit/MockMvc, Vitest và trình duyệt thật; chưa kiểm chứng tích hợp dịch vụ ngân sách PostgreSQL.
- **S3-06: FAILED ở tiêu chí migration / PARTIAL ở xác minh PostgreSQL** — các luồng phân công, phạm vi truy cập và chuyển giao đã có test; chuỗi Flyway hiện tại không hợp lệ vì migration trùng phiên bản, có sẵn trên dev. Chưa có PostgreSQL để kiểm chứng V27/V29 và cạnh tranh giao dịch trên PostgreSQL.
- **8 lỗi chức năng đã sửa**, mỗi nhóm có bằng chứng regression RED → GREEN. Một assertion thông báo lương cũ cũng được cập nhật đúng thông báo hiện hành, giữ nguyên kiểm tra HTTP 400 và nhánh có giải trình. Vấn đề nền chưa sửa: chuỗi migration trùng phiên bản. Không tính lỗi harness ban đầu hoặc lỗi được bắt trong quá trình review là lỗi tồn tại thêm trên dev.
- Giữ giao diện, CSS và các route hiện tại. Chỉ thay đổi ba lớp Java của clone/assignment, repository khóa parent, API clone và thêm migration V29; các file còn lại là kiểm thử/tài liệu.

Bảng dưới đếm **28 test case người dùng yêu cầu**, không phải số method JUnit/Vitest. PASS được ghi rõ tầng bằng chứng; PASS trên H2 không có nghĩa PASS trên PostgreSQL.

| Scrum | Tổng test | PASS | FAIL | BLOCKED | Lỗi chức năng đã sửa |
|---|---:|---:|---:|---:|---:|
| S3-05 | 12 | 11 | 0 | 1 | 4 |
| S3-06 | 16 | 14 | 1 | 1 | 4 |

## Ma trận S3-05

| ID | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| TC05-01 | PASS | MockMvc clone trả 201; Playwright bấm nút trên UI thật, mở form bản sao. |
| TC05-02 | PASS | `clone_preservesBusinessFieldsAndDistinctDates_resetsApproval`, các test fallback/empty; clone API Vitest; JD hiển thị trong form thật. |
| TC05-03 | PASS | API tạo ID/mã mới khác nguồn; browser xác nhận ID khác. |
| TC05-04 | PASS | API và DB H2 tạo `DRAFT`. |
| TC05-05 | PASS | `clonedDraftHasNoAssignmentsOrApprovalState_andEditingLeavesSourceUntouched`: nguồn có snapshot/lịch sử duyệt; bản sao không có, các trường submitted/approved/rejection được reset. |
| TC05-06 | PASS | Nguồn có phân công/lịch sử; bản sao không kế thừa. |
| TC05-07 | BLOCKED | Service clone không gọi reserve/charge, regression không gọi approval workflow; chưa chạy tích hợp với dịch vụ ngân sách/database thật. Không suy ra PASS ngân sách từ việc tạo DRAFT. |
| TC05-08 | PASS | PUT chỉnh sửa bản sao, flush/reload DB; tiêu đề nguồn không đổi. |
| TC05-09 | PASS | MockMvc ID không tồn tại → 404. |
| TC05-10 | PASS | Candidate bị 403; trưởng bộ phận khác phạm vi bị 403. |
| TC05-11 | PASS | Vitest gọi hàm API sản phẩm hai lần khi POST còn pending: chỉ một POST, cùng bản sao; có thể sao chép mới sau khi hoàn tất và retry sau lỗi. Phạm vi bảo vệ là cùng tab/browser, không phải idempotency liên thiết bị. |
| TC05-12 | PASS | Playwright thật: thông báo sao chép, form chỉnh sửa đúng bản sao/JD, kiểm tra ở 5 viewport. |

Mapping đối chiếu với DTO/entity và đường ghi hiện có:

- `salaryMin`/`salaryMax` là trường DTO chuẩn. Luồng create/update ghi đồng thời `proposedMinSalary`/`proposedMaxSalary`, nên chỉ dùng các trường proposed làm fallback khi canonical **null/undefined**; giá trị 0 được giữ. Normalize cả alias để editor cũ không ưu tiên dữ liệu stale.
- `candidateRequirements` là canonical; `requirements` là alias đường ghi cũ. Chỉ fallback khi null, giữ chuỗi rỗng có chủ ý. Không đưa lại nội dung legacy đã được xóa.
- `neededDate` và `targetDate` là hai cột riêng. Giữ cả hai khi đều có giá trị; chỉ fallback khi một cột thiếu. Đã sửa việc đảo thứ tự tham số DTO ở Java và gộp ngày ở frontend.
- Không dùng `minSalary`/`maxSalary` làm alias requisition: DTO requisition không có chúng, trong khi JobTitle có các trường này với ý nghĩa khung lương chuẩn.
- Clone giữ currency, benefits, workLocation, workLocationId, employmentTypeId, workingModel; không sao chép trạng thái duyệt/phân công.

## Ma trận S3-06

| ID | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| TC06-01 | PASS | Bulk API và modal trình duyệt thật lưu một primary. |
| TC06-02 | PASS | JUnit/Vitest + browser lưu hai support. |
| TC06-03 | PASS | `granularEndpointRejectsASecondPrimary`: API cũ bị 400 khi đã có primary khác. V29 bổ sung unique partial index, chưa chạy PostgreSQL. |
| TC06-04 | PASS | Primary lặp trong support và support lặp được normalize; DB/API chỉ có danh sách duy nhất. |
| TC06-05 | PASS | Đổi primary qua bulk API; người cũ thành support khi được chọn. |
| TC06-06 | PASS | HANDOVER có old/new user, người thực hiện, lý do; browser lưu lý do bàn giao. |
| TC06-07 | PASS | API lịch sử và tab lịch sử trên browser thật. |
| TC06-08 | PASS | INACTIVE, LOCKED và ACTIVE nhưng lockedUntil trong tương lai bị từ chối; không có partial writes; tài khoản khóa tạm thời bị loại khỏi picker. |
| TC06-09 | PASS | HR_MANAGER không có role Recruiter được dùng làm đối tượng phân công → 400. |
| TC06-10 | PASS | Recruiter gọi PUT phân công → 403. |
| TC06-11 | PASS | Primary/support đọc requisition và ứng viên được giao; API phân công có phạm vi. |
| TC06-12 | PASS | Recruiter ngoài phạm vi bị 403 ở requisition, candidate, assignments và assignments/history. |
| TC06-13 | PASS | API GET sau flush và refresh browser giữ primary/support. |
| TC06-14 | BLOCKED | Test H2 thực chứng bulk writer phải chờ khóa parent rồi commit đúng một primary. Chưa stress hai service writers, bulk/granular/unassign cạnh tranh trên PostgreSQL; không coi kiểm thử khóa H2 là đủ cho tiêu chí này. |
| TC06-15 | PASS | Vitest modal: thiếu primary, 1+2 người, lý do handover, lọc, history; browser thật ở 1920×1080, 1440×900, 1366×768, 768×1024, 390×844. |
| TC06-16 | FAIL | `Flyway.info()` với thư mục migration thật báo `Found more than one migration with version 24`; còn cặp version 25 trùng. Đây là lỗi discovery độc lập cú pháp PostgreSQL. Chạy SQL V27/V29 trên PostgreSQL vẫn BLOCKED, hai test opt-in không được tính PASS. |

## Lỗi và bằng chứng sửa

Commit chứa toàn bộ các sửa lỗi B05-01…B06-04 và test: `e6900608f5eaa1319f758bf1eef0074e78fec26e` — `fix(sprint3): test and harden S3-05 S3-06`.

| Bug ID | Mức độ | Expected → Actual trước sửa | Nguyên nhân / file sửa | Regression chứng minh |
|---|---|---|---|---|
| B05-01 | Major | Giữ trường nghiệp vụ → mất currency/benefits/location/model | clone thiếu phép gán; overload DTO gán VND/null. `RecruitmentRequisitionService.java` | `clone_preservesBusinessFieldsAndDistinctDates_resetsApproval`: USD trước sửa thành VND; sau sửa giữ đầy đủ và reset approval. |
| B05-02 | Major | Giữ hai ngày riêng → backend đảo ngày, frontend gộp ngày | Thứ tự overload DTO và clone mapper. Java service + `frontend/src/api/requisition.ts` | Java distinct dates; Vitest dates trước sửa target 2027-01-01 thành 2027-02-01; sau sửa đúng. |
| B05-03 | Major | Hai click đang pending chỉ một bản sao → hai POST | Không có bảo vệ in-flight. `frontend/src/api/requisition.ts` | `coalesces overlapping clone requests for the same source`: 2 POST → 1 POST; settled/retry hoạt động. |
| B05-04 | Major | Giữ requirements đã xóa → khôi phục nội dung legacy | Backend dùng isBlank để fallback. `RecruitmentRequisitionService.java`; normalize aliases trong clone mapper | `clone_doesNotReplaceExplicitEmptyRequirementsWithLegacyText`: trước sửa trả stale text; sau sửa chuỗi rỗng. Vitest kiểm tra cả alias editor. |
| B06-01 | High | Người ngoài phạm vi 403 → đọc được phân công/lịch sử (200) | Chỉ kiểm permission chung, thiếu object scope. `RequisitionAssignmentService.java` tái sử dụng `RequisitionService.getById` | `unassignedRecruiterCannotReadAssignmentsOrHistory`: 200 → 403. |
| B06-02 | High | Một primary → granular endpoint lưu hai primary | Legacy API không kiểm tra primary đang có. Assignment service + V29 | `granularEndpointRejectsASecondPrimary`: 204 → 400, DB H2 còn một primary; unique index PostgreSQL chưa xác minh. |
| B06-03 | Major | Tài khoản khóa tạm thời không được phân công → vẫn 200 | Chỉ kiểm status, bỏ lockedUntil. Assignment service | `temporarilyLockedActiveRecruiterCannotBeAssigned`: 200 → 400, loại khỏi danh sách khả dụng. |
| B06-04 | High | Assignment writer phải chờ giao dịch parent → ghi xuyên qua parent lock | Không khóa parent, nhất là khi chưa có child assignment. `RecruitmentRequisitionRepository.java`, assignment service | `assignmentWaitsForParentLock_thenCommitsExactlyOnePrimary`: trước sửa finished=true khi parent đang khóa; sau sửa chờ, rồi lưu đúng. |

V29 là migration mới, không sửa checksum V27. Service khóa parent ở cả bulk, granular và unassign; flush hạ/xóa primary cũ trước khi promote. Index mới cố ý fail nếu dữ liệu cũ đã có hai primary; không tự xóa/đổi phân công của người dùng.

## Vấn đề có sẵn, không che giấu bằng test

**BASE-01 — assertion test cũ đã sửa, không đổi sản phẩm:** `RbacIntegrationTest.requisitionValidationPastDateAndSalaryStandard`, dòng 698. HTTP 400 đúng; expected `Dải lương đề xuất nằm ngoài khung chuẩn của chức danh, bắt buộc nhập giải trình.` nhưng actual `Dải lương nằm ngoài khung lương tiêu chuẩn của chức danh. Vui lòng nhập lý do giải trình dải lương.` Đã chạy đúng method trên bản xuất sạch `origin/dev` và nhận cùng failure. Root cause là literal thông báo đã lỗi thời: API vẫn từ chối đúng HTTP 400, thông báo hiện hành vẫn nêu đúng lỗi vượt khung và thiếu giải trình; cùng test còn kiểm tra nhánh có giải trình trả 201. Đã cập nhật duy nhất expected literal sang thông báo hiện hành, giữ nguyên tất cả assertion trạng thái và các nhánh nghiệp vụ. Không nới lỏng assertion hoặc đổi service để che lỗi sản phẩm.

**BASE-02 — migration chain FAIL:**

- V24__recruitment_requisition_s2_10.sql trùng version với V24__versioned_requisition_approval_configurations.sql.
- V25__s3_02_approval_actions_and_logs.sql trùng version với V25__versioned_requisition_approval_configurations.sql.
- Hai script versioned configuration V24/V25 còn có cùng nội dung. Đã tái hiện bằng Flyway resolver thật trên database H2 memory riêng; lỗi phát sinh trước thực thi SQL migration.
- Không tự rename/xóa migration đã có: cần đối chiếu `flyway_schema_history` của database đang dùng để tránh phá validation/checksum và dữ liệu Sprint 2/3. Không chạy repair, clean hay reset database.

## Môi trường, thực thi và dữ liệu

- Frontend `npm ci` thành công. Java 21.0.12 được chuẩn bị tách biệt; source/target vẫn 21. Không hạ yêu cầu Java.
- Maven dùng proxy runtime bên ngoài repo; startup Java agent Mockito để tránh hạn chế self-attach của môi trường. Không thay dependency/POM để làm test PASS.
- JUnit/MockMvc chạy service, security/JWT, repository/SQL thật trên H2; không mock toàn bộ integration.
- Browser Chromium 153 + Playwright chạy frontend Vite và backend Spring HTTP thật, database H2 memory riêng. Không giả lập response API. Không dùng kết quả này thay cho PostgreSQL.
- Fixtures tạo mật khẩu ngẫu nhiên, 1 HR Manager, 3 Recruiter và 1 Candidate không có quyền phân công. Không thay tài khoản thật. JSON thông tin đăng nhập chỉ nằm ở file tạm, không commit.
- `S305S306BrowserFixture` bắt buộc database H2 memory qua command-line overrides; khi dừng JVM toàn bộ dữ liệu biến mất. Draft browser tạo được xóa theo đúng ID của test. Các test MockMvc rollback; concurrency dùng database memory riêng, đóng context sau class.
- Test generator Excel có sẵn tự ghi lại năm file test-fixtures khi chạy toàn suite. Đã khôi phục đúng năm output do generator tạo về nội dung baseline; không đưa chúng vào PR.
- Test PostgreSQL opt-in chỉ dùng database có tên chứa `test`, tạo schema UUID và chỉ DROP schema do chính test tạo. Biến: `S306_POSTGRES_TEST_URL`, `S306_POSTGRES_TEST_USER`, `S306_POSTGRES_TEST_PASSWORD`. Khi chưa cấu hình, hai tests SKIPPED/BLOCKED, không phải PASS.
- Kiểm thử browser lần đầu bị lỗi prerequisite/namespace của harness; một lần sau có 4/5 PASS do sửa frontend trong lúc Vite đang watch làm reload đóng modal tại 1366. Chạy cuối được thực hiện sau khi ngừng sửa mã ứng dụng; chỉ kết quả cuối dùng để kết luận.

## Lệnh tái chạy

```bash
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend test -- --run
npm --prefix frontend run build
cd backend/auth-service
./mvnw test
```

Môi trường hạn chế attach có thể thêm `-DargLine="-javaagent:<path-to-mockito-core-5.23.0.jar>"`; lần chạy này dùng đúng cách đó. Đây là flag môi trường, không phải điều kiện bỏ test.

Để chạy browser với dữ liệu riêng:

```bash
cd backend/auth-service
./mvnw test-compile dependency:build-classpath -Dmdep.outputFile=target/test-classpath.txt
S306_E2E_FIXTURE_FILE=/tmp/s306-fixture.json java \
  -cp "target/test-classes:target/classes:$(cat target/test-classpath.txt)" \
  com.example.auth_service.fixtures.S305S306BrowserFixture
# Terminal khác, sau khi có S305_S306_BROWSER_FIXTURE_READY:
cd frontend
S306_E2E_FIXTURE_FILE=/tmp/s306-fixture.json npx playwright test --config=playwright.s305-s306.config.ts
```

Trên Windows dùng `mvnw.cmd`, dấu `;` trong Java classpath và cú pháp biến môi trường PowerShell. Cấu hình browser mặc định dùng Chromium Playwright đã cài; biến `S306_BROWSER_EXECUTABLE`/`S306_BROWSER_ARGS` chỉ dành cho browser được chuẩn bị ngoài repo.

Để chạy PostgreSQL sau khi có database test:

```bash
./mvnw test -Dtest=RequisitionAssignmentPostgresTest
```

`completeFlywayChainAppliesToEmptyPostgresSchema` cố ý kiểm tra toàn chain thật, sẽ phát hiện lỗi version đang tồn tại; không mock hoặc bỏ migration để làm test xanh.

## Phạm vi ảnh hưởng và file

Code sản phẩm:

- `backend/auth-service/src/main/java/com/example/auth_service/service/RecruitmentRequisitionService.java`
- `backend/auth-service/src/main/java/com/example/auth_service/service/RequisitionAssignmentService.java`
- `backend/auth-service/src/main/java/com/example/auth_service/repository/RecruitmentRequisitionRepository.java`
- `backend/auth-service/src/main/resources/db/migration/V29__one_primary_recruiter_per_requisition.sql`
- `frontend/src/api/requisition.ts`

Kiểm thử/tài liệu:

- `backend/auth-service/src/test/java/com/example/auth_service/security/RbacIntegrationTest.java` (chỉ đồng bộ expected wording, không thay đổi hành vi)
- `backend/auth-service/src/test/java/com/example/auth_service/service/RecruitmentRequisitionServiceTest.java`
- `backend/auth-service/src/test/java/com/example/auth_service/service/RequisitionAssignmentServiceTest.java`
- `backend/auth-service/src/test/java/com/example/auth_service/controller/RecruitmentRequisitionIntegrationTest.java`
- `backend/auth-service/src/test/java/com/example/auth_service/controller/RequisitionAssignmentIntegrationTest.java`
- `backend/auth-service/src/test/java/com/example/auth_service/controller/RequisitionAssignmentConcurrencyTest.java`
- `backend/auth-service/src/test/java/com/example/auth_service/migration/RequisitionAssignmentPostgresTest.java`
- `backend/auth-service/src/test/java/com/example/auth_service/fixtures/S305S306BrowserFixture.java`
- `frontend/src/tests/requisitionCloneApi.test.ts`
- `frontend/src/tests/AssignRecruiterModal.test.tsx`
- `frontend/e2e/s305-s306-real.spec.ts`
- `frontend/playwright.s305-s306.config.ts`
- `docs/superpowers/plans/2026-10-17-s3-05-s3-06-testing.md`
- `docs/testing/S3-05-S3-06-TEST-REPORT.md`

Không đổi UI/CSS, auth/session/RBAC permission matrix, SMTP, bộ dữ liệu hiện tại, main hoặc các API của Scrum khác. DTO trả thêm đúng các trường đã có trong record nên tác động lên các GET của RecruitmentRequisitionService được chạy qua full regression. Không thể khẳng định toàn hệ thống sạch lỗi vì còn BASE-02 và PostgreSQL chưa chạy.

Review độc lập đã kiểm tra scope, lock/flush, DTO và fixture. Hai finding quan trọng (empty requirements, stale frontend aliases) đã có test RED → GREEN; giới hạn kiểm thử concurrent PostgreSQL được giữ BLOCKED.

## Kết quả chạy cuối và commit

| Kiểm tra | Kết quả cuối |
|---|---|
| Frontend typecheck | PASS |
| Frontend ESLint | PASS |
| Frontend Vitest | **265 PASS / 265**, 31 suites |
| Frontend production build | PASS; cảnh báo chunk size hiện có, không sửa bundle ngoài phạm vi |
| Backend trọng tâm | **46 PASS / 46**, 5 lớp test clone/assignment/integration/concurrency |
| Backend toàn bộ | **503 discovered: 501 PASS, 0 FAIL, 0 ERROR, 2 SKIPPED** (hai test PostgreSQL opt-in) |
| Clean baseline salary assertion | Tái hiện FAIL trên origin/dev; sau đồng bộ wording, toàn bộ backend PASS như trên |
| Playwright backend/frontend HTTP thật | **5 PASS / 5**: 1920×1080, 1440×900, 1366×768, 768×1024, 390×844; lần cuối 1.4 phút |
| Migration resolver thật | **FAIL**: version 24 trùng; version 25 còn trùng, chưa sửa migration cũ |
| PostgreSQL V27/V29 + full chain | BLOCKED: chưa có PostgreSQL test; hai JUnit opt-in không được tính PASS |
| Concurrent service writers trên PostgreSQL | BLOCKED |
| Tích hợp ngân sách khi clone | BLOCKED |
| git diff --check | PASS |

Đã xem ảnh modal sao chép/phân công/lịch sử từ trình duyệt và kiểm tra flow ở đủ 5 viewport; kiểm tra không tràn ngang document và không có pageerror JavaScript. Không suy ra PASS mọi trạng thái accessibility/focus chỉ từ các ảnh này.

- Commit mã nguồn và tests: `e6900608f5eaa1319f758bf1eef0074e78fec26e` (áp dụng cho toàn bộ Bug ID trong bảng).
- Báo cáo được commit riêng sau commit mã nguồn để tham chiếu SHA chính xác.
- `dev` đã tiến thêm commit `f8d6dc6` trong lúc thực hiện, chỉ sửa ba file UI tin tuyển dụng ngoài diff này. PR vẫn base `dev`; các thay đổi đó được giữ nguyên, không reset/rebase đè chúng.
- Tạo PR **draft** để review do còn migration FAIL và PostgreSQL/ngân sách BLOCKED. Không merge và không đánh dấu DONE.
