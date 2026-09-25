// Tự động dọn dẹp số lần nhập sai cũ
localStorage.removeItem("hr_failed_attempts");
localStorage.removeItem("hr_lockout_until");

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 phút
let lockoutInterval = null;

// Hàm ẩn / hiện mật khẩu
window.togglePasswordVisibility = function () {
  const passwordInput = document.getElementById("password");
  const toggleBtn = document.getElementById("toggle-password");
  if (!passwordInput || !toggleBtn) return;

  const isPassword = passwordInput.getAttribute("type") === "password";
  passwordInput.setAttribute("type", isPassword ? "text" : "password");

  if (isPassword) {
    toggleBtn.innerHTML = `
      <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </svg>
    `;
  } else {
    toggleBtn.innerHTML = `
      <svg class="w-5 h-5 text-slate-400 hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
      </svg>
    `;
  }
};

// Hàm đăng nhập toàn cục
window.doLogin = function () {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  if (isCurrentlyLocked()) {
    showLockoutUI();
    return;
  }

  const email = emailInput ? emailInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value.trim() : "";

  // Cho phép đăng nhập khi nhập hr@company.com / Admin@123 hoặc bất kỳ thông tin nào khi test
  const isValidAccount =
    (email === "hr@company.com" && password === "Admin@123") ||
    (email !== "" && password !== "");

  if (isValidAccount) {
    handleLoginSuccess(email || "hr@company.com");
  } else {
    handleFailedAttempt();
  }
};

// Hàm đăng xuất toàn cục
window.doLogout = function () {
  const dashboardView = document.getElementById("dashboard-view");
  const loginView = document.getElementById("login-view");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  if (dashboardView) dashboardView.classList.add("hidden");
  if (loginView) loginView.classList.remove("hidden");
  if (emailInput) emailInput.value = "";
  if (passwordInput) passwordInput.value = "";
};

function handleLoginSuccess(email) {
  const loginView = document.getElementById("login-view");
  const dashboardView = document.getElementById("dashboard-view");
  const userDisplayEmail = document.getElementById("user-display-email");
  const errorAlert = document.getElementById("error-alert");
  const lockoutAlert = document.getElementById("lockout-alert");

  localStorage.removeItem("hr_failed_attempts");
  localStorage.removeItem("hr_lockout_until");

  if (errorAlert) errorAlert.classList.add("hidden");
  if (lockoutAlert) lockoutAlert.classList.add("hidden");

  if (userDisplayEmail) userDisplayEmail.textContent = email;
  if (loginView) loginView.classList.add("hidden");
  if (dashboardView) dashboardView.classList.remove("hidden");
}

function handleFailedAttempt() {
  const errorAlert = document.getElementById("error-alert");
  let failedAttempts = parseInt(localStorage.getItem("hr_failed_attempts") || "0", 10) + 1;
  localStorage.setItem("hr_failed_attempts", failedAttempts.toString());

  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
    localStorage.setItem("hr_lockout_until", lockUntil.toString());
    if (errorAlert) errorAlert.classList.add("hidden");
    showLockoutUI();
  } else {
    if (errorAlert) {
      errorAlert.classList.remove("hidden");
      errorAlert.classList.remove("animate-shake");
      void errorAlert.offsetWidth;
      errorAlert.classList.add("animate-shake");
    }
  }
}

function isCurrentlyLocked() {
  const lockUntil = parseInt(localStorage.getItem("hr_lockout_until") || "0", 10);
  return Date.now() < lockUntil;
}

function showLockoutUI() {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const submitBtn = document.getElementById("submit-btn");
  const lockoutAlert = document.getElementById("lockout-alert");

  if (lockoutAlert) lockoutAlert.classList.remove("hidden");
  if (emailInput) emailInput.disabled = true;
  if (passwordInput) passwordInput.disabled = true;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add("opacity-50", "cursor-not-allowed");
  }

  if (lockoutInterval) clearInterval(lockoutInterval);
  updateCountdown();
  lockoutInterval = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
  const countdownTimer = document.getElementById("countdown-timer");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const submitBtn = document.getElementById("submit-btn");
  const lockoutAlert = document.getElementById("lockout-alert");

  const lockUntil = parseInt(localStorage.getItem("hr_lockout_until") || "0", 10);
  const remainingMs = lockUntil - Date.now();

  if (remainingMs <= 0) {
    clearInterval(lockoutInterval);
    localStorage.removeItem("hr_failed_attempts");
    localStorage.removeItem("hr_lockout_until");

    if (lockoutAlert) lockoutAlert.classList.add("hidden");
    if (emailInput) emailInput.disabled = false;
    if (passwordInput) passwordInput.disabled = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove("opacity-50", "cursor-not-allowed");
    }
    return;
  }

  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  if (countdownTimer) {
    countdownTimer.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
}

// Bắt sự kiện phím Enter
document.addEventListener("DOMContentLoaded", () => {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  [emailInput, passwordInput].forEach((input) => {
    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          window.doLogin();
        }
      });
    }
  });
});