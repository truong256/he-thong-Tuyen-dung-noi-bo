// ============================================
// LẤY ELEMENT TỪ DOM
// ============================================

const loginForm = document.getElementById("loginForm");
const email = document.getElementById("email");
const password = document.getElementById("password");
const remember = document.getElementById("remember");
const showPassword = document.getElementById("showPassword");
const loginButton = document.getElementById("loginButton");
const googleButton = document.getElementById("googleButton");
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const generalError = document.getElementById("generalError");

// API URL (có thể tùy biến qua config hoặc môi trường)
const API_BASE_URL = "http://localhost:8080";
const LOGIN_API_ENDPOINT = `${API_BASE_URL}/api/auth/login`;

let lockCountdownTimer = null;

// ============================================
// HIỂN THỊ LỖI
// ============================================

function showError(input, errorElement, message) {
    if (input) {
        input.classList.add("input-error");
    }
    if (errorElement) {
        errorElement.textContent = message;
    }
}

function clearError(input, errorElement) {
    if (input) {
        input.classList.remove("input-error");
    }
    if (errorElement) {
        errorElement.textContent = "";
    }
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
// VALIDATE EMAIL & FORM
// ============================================

function isValidEmail(value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
}

function validateForm() {
    let valid = true;
    clearAllErrors();

    const emailValue = email.value.trim();
    if (emailValue === "") {
        showError(email, emailError, "Vui lòng nhập email công ty.");
        valid = false;
    } else if (!isValidEmail(emailValue)) {
        showError(email, emailError, "Email không đúng định dạng.");
        valid = false;
    }

    const passwordValue = password.value;
    if (passwordValue.trim() === "") {
        showError(password, passwordError, "Vui lòng nhập mật khẩu.");
        valid = false;
    }

    return valid;
}

// ============================================
// HIỆN / ẨN PASSWORD
// ============================================

if (showPassword) {
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

// ============================================
// XÓA LỖI KHI USER NHẬP
// ============================================

if (email) {
    email.addEventListener("input", function () {
        if (email.value.trim() !== "") {
            clearError(email, emailError);
        }
    });
}

if (password) {
    password.addEventListener("input", function () {
        if (password.value.trim() !== "") {
            clearError(password, passwordError);
        }
    });
}

// ============================================
// QUẢN LÝ COUNTDOWN KHÓA TẠM THỜI TỪ BACKEND
// ============================================

function formatRemainingSeconds(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function handleServerAccountLock(lockedUntilIsoString, customMessage) {
    if (lockCountdownTimer) {
        clearInterval(lockCountdownTimer);
        lockCountdownTimer = null;
    }

    loginButton.disabled = true;

    const lockedUntilMs = lockedUntilIsoString ? new Date(lockedUntilIsoString).getTime() : (Date.now() + 15 * 60 * 1000);

    function updateLockMessage() {
        const remainingMs = lockedUntilMs - Date.now();
        if (remainingMs <= 0) {
            clearInterval(lockCountdownTimer);
            lockCountdownTimer = null;
            loginButton.disabled = false;
            generalError.textContent = "Hết thời gian khóa. Bạn có thể thử đăng nhập lại.";
            generalError.classList.add("show");
            return;
        }

        const remainingSec = Math.ceil(remainingMs / 1000);
        generalError.textContent = customMessage
            ? `${customMessage} (Thử lại sau ${formatRemainingSeconds(remainingSec)})`
            : `Tài khoản tạm thời bị khóa. Vui lòng thử lại sau ${formatRemainingSeconds(remainingSec)}.`;
        generalError.classList.add("show");
    }

    updateLockMessage();
    lockCountdownTimer = setInterval(updateLockMessage, 1000);
}

// ============================================
// ĐIỀU HƯỚNG THEO VAI TRÒ (AC1)
// ============================================

function getHomeUrlForRole(role) {
    const normalizedRole = (role || "").toUpperCase();
    const roleRoutes = {
        "ADMIN": "dashboard.html?role=admin",
        "HR_MANAGER": "dashboard.html?role=hr_manager",
        "RECRUITER": "dashboard.html?role=recruiter",
        "HIRING_MANAGER": "dashboard.html?role=hiring_manager",
        "INTERVIEWER": "dashboard.html?role=interviewer",
        "APPROVER": "dashboard.html?role=approver",
        "CANDIDATE": "dashboard.html?role=candidate"
    };

    return roleRoutes[normalizedRole] || "dashboard.html";
}

// ============================================
// XỬ LÝ SUBMIT ĐĂNG NHẬP (API THỰC TẾ)
// ============================================

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!validateForm()) {
        return;
    }

    const emailValue = email.value.trim();
    const passwordValue = password.value;

    const originalButtonHtml = loginButton.innerHTML;
    loginButton.disabled = true;
    loginButton.innerHTML = "<span>Đang đăng nhập...</span>";

    try {
        const response = await fetch(LOGIN_API_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                email: emailValue,
                password: passwordValue
            })
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
            // Đăng nhập thành công (HTTP 200)
            if (lockCountdownTimer) {
                clearInterval(lockCountdownTimer);
                lockCountdownTimer = null;
            }

            // Lưu trữ session/tokens an toàn
            if (data.accessToken) {
                localStorage.setItem("accessToken", data.accessToken);
            }
            if (data.refreshToken) {
                localStorage.setItem("refreshToken", data.refreshToken);
            }
            if (data.user) {
                localStorage.setItem("currentUser", JSON.stringify(data.user));
            }

            // Ghi nhớ email nếu được chọn
            if (remember && remember.checked) {
                localStorage.setItem("rememberEmail", emailValue);
            } else {
                localStorage.removeItem("rememberEmail");
            }

            generalError.textContent = "Đăng nhập thành công! Đang chuyển hướng...";
            generalError.style.background = "#effcf4";
            generalError.style.borderColor = "#b8e7ca";
            generalError.style.color = "#198754";
            generalError.classList.add("show");

            // Điều hướng đến trang chủ vai trò tương ứng (AC1)
            const destinationUrl = getHomeUrlForRole(data.user ? data.user.role : null);
            setTimeout(() => {
                window.location.href = destinationUrl;
            }, 600);

        } else if (response.status === 423) {
            // Tài khoản bị khóa tạm thời phía server (AC3)
            handleServerAccountLock(data.lockedUntil, data.message);
        } else {
            // Sai thông tin đăng nhập: AC2 thông báo chung (chống user enumeration)
            const genericMessage = data.message || "Email hoặc mật khẩu không chính xác.";
            generalError.textContent = genericMessage;
            generalError.style.background = "";
            generalError.style.borderColor = "";
            generalError.style.color = "";
            generalError.classList.add("show");
            loginButton.disabled = false;
            loginButton.innerHTML = originalButtonHtml;
        }

    } catch (networkError) {
        console.error("Network or server connection error:", networkError);
        generalError.textContent = "Không thể kết nối đến máy chủ xác thực. Vui lòng kiểm tra mạng hoặc máy chủ.";
        generalError.style.background = "";
        generalError.style.borderColor = "";
        generalError.style.color = "";
        generalError.classList.add("show");
        loginButton.disabled = false;
        loginButton.innerHTML = originalButtonHtml;
    }
});

// ============================================
// GOOGLE LOGIN & FORGOT PASSWORD (OUT OF SCOPE SCRUM-6)
// ============================================

if (googleButton) {
    googleButton.addEventListener("click", function () {
        alert("Chức năng đăng nhập Google sẽ được kết nối với Google OAuth ở Sprint tiếp theo.");
    });
}

const forgotPasswordLink = document.getElementById("forgotPassword");
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", function (event) {
        event.preventDefault();
        alert("Chức năng khôi phục mật khẩu thuộc SCRUM-7 (S1-03).");
    });
}

// ============================================
// KHỞI TẠO TRANG
// ============================================

window.addEventListener("DOMContentLoaded", function () {
    const savedEmail = localStorage.getItem("rememberEmail");
    if (savedEmail && email) {
        email.value = savedEmail;
        if (remember) {
            remember.checked = true;
        }
    }
});