// ============================================
// LẤY ELEMENT
// ============================================
const mainContainer = document.getElementById("mainContainer");
const loginForm = document.getElementById("loginForm");
const email = document.getElementById("email");
const password = document.getElementById("password");
const remember = document.getElementById("remember");
const showPassword = document.getElementById("showPassword");
const loginButton = document.getElementById("loginButton");
const googleButton = document.getElementById("googleButton");
const forgotPassword = document.getElementById("forgotPassword");
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const generalError = document.getElementById("generalError");

const heroSection = document.getElementById("heroSection");
const loginSection = document.getElementById("loginSection");
const accountSection = document.getElementById("accountSection");

const searchAccount = document.getElementById("searchAccount");
const roleFilter = document.getElementById("roleFilter");
const statusFilter = document.getElementById("statusFilter");
const resetFilter = document.getElementById("resetFilter");
const accountList = document.getElementById("accountList");
const noResult = document.getElementById("noResult");

// ============================================
// CẤU HÌNH & TRẠNG THÁI
// ============================================
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 phút
let lockTimer = null;

// ============================================
// LOCAL STORAGE HELPERS
// ============================================
function getFailedAttempts() {
    return Number(localStorage.getItem("loginFailedAttempts") || 0);
}

function setFailedAttempts(value) {
    localStorage.setItem("loginFailedAttempts", value);
}

function getLockTime() {
    return Number(localStorage.getItem("loginLockedUntil") || 0);
}

function setLockTime(time) {
    localStorage.setItem("loginLockedUntil", time);
}

// ============================================
// XỬ LÝ LỖI
// ============================================
function showError(input, errorElement, message) {
    if (input) input.classList.add("input-error");
    if (errorElement) errorElement.textContent = message;
}

function clearError(input, errorElement) {
    if (input) input.classList.remove("input-error");
    if (errorElement) errorElement.textContent = "";
}

function clearAllErrors() {
    clearError(email, emailError);
    clearError(password, passwordError);

    if (generalError) {
        generalError.textContent = "";
        generalError.classList.remove("show");
        generalError.style.background = "";
        generalError.style.borderColor = "";
        generalError.style.color = "";
    }
}

// ============================================
// VALIDATE FORM
// ============================================
function isValidEmail(val) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val);
}

function validateForm() {
    let valid = true;
    clearAllErrors();

    const emailValue = email ? email.value.trim() : "";
    if (emailValue === "") {
        showError(email, emailError, "Vui lòng nhập email công ty.");
        valid = false;
    } else if (!isValidEmail(emailValue)) {
        showError(email, emailError, "Email không đúng định dạng.");
        valid = false;
    }

    const passwordValue = password ? password.value : "";
    if (passwordValue.trim() === "") {
        showError(password, passwordError, "Vui lòng nhập mật khẩu.");
        valid = false;
    }

    return valid;
}

// ============================================
// HIỆN / ẨN PASSWORD
// ============================================
if (showPassword && password) {
    showPassword.addEventListener("click", function () {
        if (password.type === "password") {
            password.type = "text";
            showPassword.textContent = "🙈";
        } else {
            password.type = "password";
            showPassword.textContent = "👁";
        }
    });
}

// Xóa lỗi input khi nhập
if (email) {
    email.addEventListener("input", function () {
        if (email.value.trim() !== "") clearError(email, emailError);
    });
}

if (password) {
    password.addEventListener("input", function () {
        if (password.value.trim() !== "") clearError(password, passwordError);
    });
}

// ============================================
// XỬ LÝ KHÓA TÀI KHOẢN
// ============================================
function isAccountLocked() {
    const lockedUntil = getLockTime();
    if (!lockedUntil) return false;

    const now = Date.now();
    if (now >= lockedUntil) {
        localStorage.removeItem("loginLockedUntil");
        localStorage.removeItem("loginFailedAttempts");
        return false;
    }
    return true;
}

function getRemainingTime() {
    const lockedUntil = getLockTime();
    const remaining = lockedUntil - Date.now();
    return remaining <= 0 ? 0 : Math.ceil(remaining / 1000);
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function showLockMessage() {
    if (!isAccountLocked()) {
        if (loginButton) loginButton.disabled = false;
        if (generalError) generalError.classList.remove("show");
        if (lockTimer) clearInterval(lockTimer);
        return;
    }

    if (loginButton) loginButton.disabled = true;

    const updateTimerDisplay = () => {
        if (!isAccountLocked()) {
            clearInterval(lockTimer);
            if (generalError) generalError.classList.remove("show");
            if (loginButton) loginButton.disabled = false;
            return;
        }

        const remaining = getRemainingTime();
        if (generalError) {
            generalError.textContent = `Tài khoản đang bị khóa do nhập sai nhiều lần. Vui lòng thử lại sau ${formatTime(remaining)}.`;
            generalError.classList.add("show");
        }
    };

    updateTimerDisplay();

    if (lockTimer) clearInterval(lockTimer);
    lockTimer = setInterval(updateTimerDisplay, 1000);
}

// ============================================
// CHUYỂN MÀN HÌNH QUẢN LÝ TÀI KHOẢN
// ============================================
// ĐOẠN ĐÃ SỬA (thêm đúng 1 dòng để không bị bó hẹp giao diện):
function showAccountManagement() {
    const loginPage = document.querySelector(".login-page");
    if (loginPage) {
        loginPage.style.display = "block"; // <--- THÊM DÒNG NÀY để thẻ cha không ép flex
    }

    if (heroSection) {
        heroSection.style.display = "none";
    }

    if (loginSection) {
        loginSection.style.display = "none";
    }

    if (accountSection) {
        accountSection.style.display = "block";
        accountSection.style.width = "100%";
        accountSection.style.minHeight = "100vh";
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    if (accountList) {
        renderAccounts(accounts);
    }
}

// ============================================
// DỮ LIỆU TÀI KHOẢN DEMO
// ============================================
const accounts = [
    { name: "Nguyễn Văn A", email: "nguyenvana@company.com", phone: "0987654321", role: "admin", status: "active" },
    { name: "Trần Văn B", email: "tranvanb@company.com", phone: "0912345678", role: "hr", status: "active" },
    { name: "Lê Văn C", email: "levanc@company.com", phone: "0901234567", role: "employee", status: "pending" },
    { name: "Phạm Thị D", email: "phamthid@company.com", phone: "0978123456", role: "employee", status: "locked" },
    { name: "Hoàng Văn E", email: "hoangvane@company.com", phone: "0965432109", role: "hr", status: "active" }
];

function getRoleName(role) {
    const roles = { admin: "Admin", hr: "HR", employee: "Nhân viên" };
    return roles[role] || role;
}

function getStatusName(status) {
    const statuses = { active: "Hoạt động", pending: "Chờ duyệt", locked: "Đã khóa" };
    return statuses[status] || status;
}

// ============================================
// RENDER DANH SÁCH (CHỐNG XSS)
// ============================================
function renderAccounts(data) {
    if (!accountList) return;
    accountList.innerHTML = "";

    if (data.length === 0) {
        if (noResult) noResult.classList.add("show");
        return;
    }

    if (noResult) noResult.classList.remove("show");

    data.forEach(account => {
        const item = document.createElement("div");
        item.className = "account-item";

        const infoDiv = document.createElement("div");
        infoDiv.className = "account-info";

        const nameDiv = document.createElement("div");
        nameDiv.className = "account-name";
        nameDiv.textContent = account.name;

        const emailDiv = document.createElement("div");
        emailDiv.className = "account-email";
        emailDiv.textContent = account.email;

        const phoneDiv = document.createElement("div");
        phoneDiv.className = "account-phone";
        phoneDiv.textContent = account.phone;

        infoDiv.appendChild(nameDiv);
        infoDiv.appendChild(emailDiv);
        infoDiv.appendChild(phoneDiv);

        const metaDiv = document.createElement("div");
        metaDiv.className = "account-meta";

        const roleSpan = document.createElement("span");
        roleSpan.className = "account-role";
        roleSpan.textContent = getRoleName(account.role);

        const statusSpan = document.createElement("span");
        statusSpan.className = `account-status ${account.status}`;
        statusSpan.textContent = getStatusName(account.status);

        metaDiv.appendChild(roleSpan);
        metaDiv.appendChild(statusSpan);

        item.appendChild(infoDiv);
        item.appendChild(metaDiv);

        accountList.appendChild(item);
    });
}

// ============================================
// TÌM KIẾM & LỌC
// ============================================
function filterAccounts() {
    if (!searchAccount || !roleFilter || !statusFilter) return;

    const keyword = searchAccount.value.trim().toLowerCase();
    const selectedRole = roleFilter.value;
    const selectedStatus = statusFilter.value;

    const result = accounts.filter(account => {
        const matchName = account.name.toLowerCase().includes(keyword);
        const matchEmail = account.email.toLowerCase().includes(keyword);
        const matchPhone = account.phone.includes(keyword);
        const matchKeyword = matchName || matchEmail || matchPhone;

        const matchRole = selectedRole === "" || account.role === selectedRole;
        const matchStatus = selectedStatus === "" || account.status === selectedStatus;

        return matchKeyword && matchRole && matchStatus;
    });

    renderAccounts(result);
}

if (searchAccount) searchAccount.addEventListener("input", filterAccounts);
if (roleFilter) roleFilter.addEventListener("change", filterAccounts);
if (statusFilter) statusFilter.addEventListener("change", filterAccounts);

if (resetFilter) {
    resetFilter.addEventListener("click", function () {
        if (searchAccount) searchAccount.value = "";
        if (roleFilter) roleFilter.value = "";
        if (statusFilter) statusFilter.value = "";
        renderAccounts(accounts);
    });
}

// ============================================
// XỬ LÝ SUBMIT FORM ĐĂNG NHẬP
// ============================================
if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();

        if (isAccountLocked()) {
            showLockMessage();
            return;
        }

        if (!validateForm()) return;

        const emailValue = email.value.trim();
        const passwordValue = password.value;

        const DEMO_EMAIL = "admin@company.com";
        const DEMO_PASSWORD = "123456";

        if (emailValue !== DEMO_EMAIL || passwordValue !== DEMO_PASSWORD) {
            let attempts = getFailedAttempts() + 1;
            setFailedAttempts(attempts);

            if (attempts >= MAX_ATTEMPTS) {
                setLockTime(Date.now() + LOCK_TIME);
                showLockMessage();
                return;
            }

            const remainingAttempts = MAX_ATTEMPTS - attempts;
            if (generalError) {
                generalError.textContent = `Email hoặc mật khẩu không chính xác. Bạn còn ${remainingAttempts} lần thử.`;
                generalError.classList.add("show");
            }
            return;
        }

        // Đăng nhập thành công
        localStorage.removeItem("loginFailedAttempts");
        localStorage.removeItem("loginLockedUntil");

        if (remember && remember.checked) {
            localStorage.setItem("rememberEmail", emailValue);
        } else {
            localStorage.removeItem("rememberEmail");
        }

        if (generalError) {
            generalError.textContent = "Đăng nhập thành công!";
            generalError.style.background = "#effcf4";
            generalError.style.borderColor = "#b8e7ca";
            generalError.style.color = "#198754";
            generalError.classList.add("show");
        }

        setTimeout(() => {
            showAccountManagement();
        }, 600);
    });
}

// ============================================
// NÚT PHỤ & KHỞI TẠO TRANG
// ============================================
if (googleButton) {
    googleButton.addEventListener("click", function () {
        alert("Chức năng đăng nhập Google sẽ được kết nối với Google OAuth ở backend.");
    });
}

if (forgotPassword) {
    forgotPassword.addEventListener("click", function (e) {
        e.preventDefault();
        alert("Chức năng khôi phục mật khẩu đang được phát triển.");
    });
}

window.addEventListener("DOMContentLoaded", function () {
    if (accountSection) {
        accountSection.style.display = "none";
    }

    const savedEmail = localStorage.getItem("rememberEmail");
    if (savedEmail && email) {
        email.value = savedEmail;
        if (remember) remember.checked = true;
    }

    if (isAccountLocked()) {
        showLockMessage();
    }
});