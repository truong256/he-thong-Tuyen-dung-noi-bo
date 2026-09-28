package com.example.auth_service.exception;

import java.time.Instant;

public class AccountLockedException extends RuntimeException {

    private final Instant lockedUntil;

    public AccountLockedException(String message, Instant lockedUntil) {
        super(message);
        this.lockedUntil = lockedUntil;
    }

    public AccountLockedException(Instant lockedUntil) {
        super("Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau.");
        this.lockedUntil = lockedUntil;
    }

    public Instant getLockedUntil() {
        return lockedUntil;
    }
}
