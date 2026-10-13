-- V28: Ràng buộc duy nhất 1-1 cho số điện thoại người dùng (users.phone)
-- 1. Đảm bảo cột phone tồn tại với kiểu VARCHAR(20)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- 2. Chuyển các giá trị rỗng/khoảng trắng thành NULL để không coi chuỗi rỗng là một số điện thoại
UPDATE users
SET phone = NULL
WHERE phone IS NOT NULL AND TRIM(phone) = '';

-- 3. Chuẩn hóa dữ liệu số điện thoại hiện có trong DB (xóa ký tự định dạng, đổi +84/84 về 0)
UPDATE users
SET phone = REGEXP_REPLACE(REGEXP_REPLACE(TRIM(phone), '[\s\-\.\(\)]+', '', 'g'), '^(\+84|84)', '0')
WHERE phone IS NOT NULL;

-- 4. Kiểm tra dữ liệu trùng lặp trước khi tạo UNIQUE index
-- Nếu phát hiện số điện thoại trùng nhau giữa các tài khoản, xuất danh sách ID tài khoản và số điện thoại liên quan
DO $$
DECLARE
    dup_row RECORD;
    found_dup BOOLEAN := FALSE;
    details_msg TEXT := 'Phát hiện số điện thoại bị trùng lặp giữa các tài khoản:';
BEGIN
    FOR dup_row IN
        SELECT phone, string_agg(id::text, ', ' ORDER BY id) AS user_ids, count(*) AS total
        FROM users
        WHERE phone IS NOT NULL
        GROUP BY phone
        HAVING count(*) > 1
    LOOP
        found_dup := TRUE;
        RAISE WARNING 'Số điện thoại % bị trùng tại các User ID: [%]', dup_row.phone, dup_row.user_ids;
        details_msg := details_msg || format(' [Số: %s, User IDs: (%s)]', dup_row.phone, dup_row.user_ids);
    END LOOP;

    IF found_dup THEN
        RAISE EXCEPTION '%', details_msg;
    END IF;
END $$;

-- 5. Tạo UNIQUE Index trên số điện thoại đã chuẩn hóa (bỏ qua NULL để đảm bảo an toàn cho tài khoản cũ)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users(phone) WHERE phone IS NOT NULL;
