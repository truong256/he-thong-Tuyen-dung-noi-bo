# Quy uoc Git va Pull Request - He thong Tuyen dung Noi bo

Ap dung tu 22/10/2026 cho cong viec moi. Nhanh cu va PR dang mo khong bi doi ten hay xoa hang loat.

## Nhanh chinh
- `main`: ban phat hanh/on dinh; chi merge thong qua PR phat hanh da duoc nghiem thu.
- `dev`: nhanh tich hop tinh nang; dich mac dinh cua PR tinh nang/bugfix.
- `feature/SCRUM-<ID>-<mo-ta>`: phat trien mot ticket Jira.
- `fix/SCRUM-<ID>-<mo-ta>`: sua loi (neu nhom cho phep fix/*).
- `refactor/SCRUM-<ID>-<mo-ta>`, `test/SCRUM-<ID>-<mo-ta>`: cong viec tuong ung co ticket.
- `integration/*`, `backup/*`: nhanh ky thuat; khong danh gia nhu feature branch va can duoc quan ly rieng.

## Quy tac ten
- Dung dung ma Jira, vi du `SCRUM-184`; khong tu chuyen ma hang muc S3-01 thanh ma Jira.
- Mo ta viet thuong, khong dau, cach nhau bang dau gach ngang `-`.
- Vi du: `feature/SCRUM-184-internal-referral-api`, `feature/SCRUM-185-internal-referral-ui`.
- Moi nhanh nen co mot ticket chinh; ticket lien quan ghi trong PR.

## Quy trinh
1. Lay cap nhat tu `origin/dev`; tao nhanh cong viec tu `dev` sau khi da xem xet local changes.
2. Commit theo Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`.
3. Mo PR den `dev`; ghi Jira ticket, thay doi, cach test, anh minh chung (neu co).
4. Can it nhat mot reviewer doc lap truoc merge, kiem tra CI/tests va khong co conflict.
5. Merge `dev` -> `main` chi khi phat hanh, co kiem thu va chap thuan.

## Xu ly cac nhanh cu
- Khong rename truc tiep nhanh dang co PR mo: co the dong PR/anh huong review.
- Khong xoa `be`, `fe`, `bug` hay nhanh sprint cu khi chua xac minh da tich hop, nguoi phu trach va con cong viec chua merge.
- Uu tien hoan thien PR dang mo, dong bo xung dot, sau do tao nhanh moi chuan cho cac thay doi tiep theo.
- Viec sua base PR tu `main` sang `dev` phai xem lai changed files, mergeability, review va CI.
