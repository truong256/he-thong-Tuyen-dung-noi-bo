package com.example.auth_service.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class PhoneNumberUtilsTest {

    @Test
    @DisplayName("Chuẩn hóa các biến thể của cùng một số điện thoại về cùng một định dạng 10 chữ số")
    void testNormalizeEquivalence() {
        String expected = "0912345678";

        assertThat(PhoneNumberUtils.normalize("0912345678")).isEqualTo(expected);
        assertThat(PhoneNumberUtils.normalize("+84912345678")).isEqualTo(expected);
        assertThat(PhoneNumberUtils.normalize("84912345678")).isEqualTo(expected);
        assertThat(PhoneNumberUtils.normalize("0912 345 678")).isEqualTo(expected);
        assertThat(PhoneNumberUtils.normalize("0912-345-678")).isEqualTo(expected);
        assertThat(PhoneNumberUtils.normalize("0912.345.678")).isEqualTo(expected);
        assertThat(PhoneNumberUtils.normalize("(+84) 912 345 678")).isEqualTo(expected);
        assertThat(PhoneNumberUtils.normalize(" (+84) 912-345-678 ")).isEqualTo(expected);
        assertThat(PhoneNumberUtils.normalize("0084912345678")).isEqualTo(expected);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "0901234567",
            "0912345678",
            "0987654321",
            "0321234567",
            "0398765432",
            "0561234567",
            "0589876543",
            "0701234567",
            "0798765432",
            "0812345678",
            "0888888888",
            "+84912345678",
            "+84381234567",
            "84987654321"
    })
    @DisplayName("Các số điện thoại di động Việt Nam hợp lệ")
    void testValidVietnamesePhones(String rawPhone) {
        assertThat(PhoneNumberUtils.isValidVietnamesePhone(rawPhone)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "0123456789",    // Đầu số 01 (11 số cũ đã bị thu hồi)
            "0241234567",    // Điện thoại bàn Hà Nội
            "0281234567",    // Điện thoại bàn TP.HCM
            "09123456",      // Quá ngắn (8 số)
            "091234567",     // 9 số
            "09123456789",   // 11 số
            "abc1234567",    // Ký tự chữ
            "091234567a",
            "+1234567890",   // Mã quốc gia khác
            "",
            "   "
    })
    @DisplayName("Các số điện thoại không hợp lệ bị từ chối")
    void testInvalidVietnamesePhones(String rawPhone) {
        assertThat(PhoneNumberUtils.isValidVietnamesePhone(rawPhone)).isFalse();
    }

    @Test
    @DisplayName("Xử lý null và chuỗi rỗng")
    void testNullAndEmpty() {
        assertThat(PhoneNumberUtils.normalize(null)).isNull();
        assertThat(PhoneNumberUtils.normalize("")).isNull();
        assertThat(PhoneNumberUtils.normalize("   ")).isNull();
        assertThat(PhoneNumberUtils.isValidVietnamesePhone(null)).isFalse();
        assertThat(PhoneNumberUtils.isValidVietnamesePhone("")).isFalse();
    }

    @Test
    @DisplayName("Định dạng hiển thị số điện thoại")
    void testFormatDisplay() {
        assertThat(PhoneNumberUtils.formatDisplay("0912345678")).isEqualTo("0912 345 678");
        assertThat(PhoneNumberUtils.formatDisplay(null)).isNull();
        assertThat(PhoneNumberUtils.formatDisplay("123")).isEqualTo("123");
    }
}
