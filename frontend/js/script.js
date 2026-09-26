// ============================================
// LẤY ELEMENT
// ============================================

const loginForm =
    document.getElementById("loginForm");

const email =
    document.getElementById("email");

const password =
    document.getElementById("password");

const remember =
    document.getElementById("remember");

const showPassword =
    document.getElementById("showPassword");

const loginButton =
    document.getElementById("loginButton");

const googleButton =
    document.getElementById("googleButton");

const emailError =
    document.getElementById("emailError");

const passwordError =
    document.getElementById("passwordError");

const generalError =
    document.getElementById("generalError");


// ============================================
// CẤU HÌNH
// ============================================

const MAX_ATTEMPTS = 5;

// 15 phút
const LOCK_TIME = 15 * 60 * 1000;


// ============================================
// LOCAL STORAGE
// ============================================

function getFailedAttempts() {

    return Number(
        localStorage.getItem("loginFailedAttempts") || 0
    );

}


function setFailedAttempts(value) {

    localStorage.setItem(
        "loginFailedAttempts",
        value
    );

}


function getLockTime() {

    return Number(
        localStorage.getItem("loginLockedUntil") || 0
    );

}


function setLockTime(time) {

    localStorage.setItem(
        "loginLockedUntil",
        time
    );

}


// ============================================
// HIỂN THỊ LỖI
// ============================================

function showError(input, errorElement, message) {

    input.classList.add("input-error");

    errorElement.textContent = message;

}


function clearError(input, errorElement) {

    input.classList.remove("input-error");

    errorElement.textContent = "";

}


function clearAllErrors() {

    clearError(email, emailError);

    clearError(password, passwordError);

    generalError.textContent = "";

    generalError.classList.remove("show");

}


// ============================================
// VALIDATE EMAIL
// ============================================

function isValidEmail(value) {

    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailRegex.test(value);

}


// ============================================
// VALIDATE FORM
// ============================================

function validateForm() {

    let valid = true;

    clearAllErrors();


    // -----------------------------
    // EMAIL
    // -----------------------------

    const emailValue =
        email.value.trim();


    if (emailValue === "") {

        showError(
            email,
            emailError,
            "Vui lòng nhập email công ty."
        );

        valid = false;

    }

    else if (!isValidEmail(emailValue)) {

        showError(
            email,
            emailError,
            "Email không đúng định dạng."
        );

        valid = false;

    }


    // -----------------------------
    // PASSWORD
    // -----------------------------

    const passwordValue =
        password.value;


    if (passwordValue.trim() === "") {

        showError(
            password,
            passwordError,
            "Vui lòng nhập mật khẩu."
        );

        valid = false;

    }


    return valid;

}


// ============================================
// HIỆN / ẨN PASSWORD
// ============================================

showPassword.addEventListener(
    "click",
    function () {

        if (password.type === "password") {

            password.type = "text";

            showPassword.textContent = "🙈";

        }

        else {

            password.type = "password";

            showPassword.textContent = "👁";

        }

    }
);


// ============================================
// XÓA LỖI KHI USER NHẬP
// ============================================

email.addEventListener(
    "input",
    function () {

        if (email.value.trim() !== "") {

            clearError(
                email,
                emailError
            );

        }

    }
);


password.addEventListener(
    "input",
    function () {

        if (password.value.trim() !== "") {

            clearError(
                password,
                passwordError
            );

        }

    }
);


// ============================================
// KIỂM TRA ĐANG BỊ KHÓA
// ============================================

function isAccountLocked() {

    const lockedUntil =
        getLockTime();

    if (!lockedUntil) {
        return false;
    }


    const now =
        Date.now();


    // Nếu đã hết 15 phút
    if (now >= lockedUntil) {

        localStorage.removeItem(
            "loginLockedUntil"
        );

        localStorage.removeItem(
            "loginFailedAttempts"
        );

        return false;

    }


    return true;

}


// ============================================
// HIỂN THỊ THỜI GIAN KHÓA
// ============================================

function getRemainingTime() {

    const lockedUntil =
        getLockTime();

    const remaining =
        lockedUntil - Date.now();


    if (remaining <= 0) {
        return 0;
    }


    return Math.ceil(
        remaining / 1000
    );

}


function formatTime(seconds) {

    const minutes =
        Math.floor(seconds / 60);

    const secs =
        seconds % 60;


    return `${minutes}:${String(secs).padStart(2, "0")}`;

}


// ============================================
// HIỂN THỊ TRẠNG THÁI KHÓA
// ============================================

let lockTimer = null;


function showLockMessage() {

    if (!isAccountLocked()) {

        loginButton.disabled = false;

        return;

    }


    loginButton.disabled = true;


    const seconds =
        getRemainingTime();


    generalError.textContent =
        `Tài khoản đang bị khóa. Vui lòng thử lại sau ${formatTime(seconds)}.`;

    generalError.classList.add("show");


    if (lockTimer) {
        clearInterval(lockTimer);
    }


    lockTimer = setInterval(
        function () {

            if (!isAccountLocked()) {

                clearInterval(lockTimer);

                generalError.classList.remove(
                    "show"
                );

                loginButton.disabled = false;

                return;

            }


            const remaining =
                getRemainingTime();


            generalError.textContent =
                `Tài khoản đang bị khóa. Vui lòng thử lại sau ${formatTime(remaining)}.`;

        },
        1000
    );

}


// ============================================
// ĐĂNG NHẬP
// ============================================

loginForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();


        // --------------------------------
        // Kiểm tra tài khoản đang khóa
        // --------------------------------

        if (isAccountLocked()) {

            showLockMessage();

            return;

        }


        // --------------------------------
        // Kiểm tra input
        // --------------------------------

        if (!validateForm()) {

            return;

        }


        const emailValue =
            email.value.trim();

        const passwordValue =
            password.value;


        // --------------------------------
        // DEMO TÀI KHOẢN
        // --------------------------------
        //
        // Sau này thay phần này bằng API
        // backend của bạn.
        //

        const DEMO_EMAIL =
            "admin@company.com";

        const DEMO_PASSWORD =
            "123456";


        // --------------------------------
        // KIỂM TRA ĐĂNG NHẬP
        // --------------------------------

        if (
            emailValue !== DEMO_EMAIL ||
            passwordValue !== DEMO_PASSWORD
        ) {

            let attempts =
                getFailedAttempts();

            attempts++;

            setFailedAttempts(attempts);


            // -----------------------------
            // ĐỦ 5 LẦN
            // -----------------------------

            if (attempts >= MAX_ATTEMPTS) {

                const lockedUntil =
                    Date.now() + LOCK_TIME;

                setLockTime(lockedUntil);


                generalError.textContent =
                    "Bạn đã đăng nhập sai 5 lần. Tài khoản bị khóa trong 15 phút.";

                generalError.classList.add(
                    "show"
                );


                loginButton.disabled = true;


                showLockMessage();


                return;

            }


            // -----------------------------
            // CHƯA ĐỦ 5 LẦN
            // -----------------------------

            const remainingAttempts =
                MAX_ATTEMPTS - attempts;


            generalError.textContent =
                `Email hoặc mật khẩu không chính xác. Bạn còn ${remainingAttempts} lần thử.`;

            generalError.classList.add(
                "show"
            );


            return;

        }


        // =================================
        // ĐĂNG NHẬP THÀNH CÔNG
        // =================================

        localStorage.removeItem(
            "loginFailedAttempts"
        );

        localStorage.removeItem(
            "loginLockedUntil"
        );


        // Ghi nhớ email
        if (remember.checked) {

            localStorage.setItem(
                "rememberEmail",
                emailValue
            );

        }

        else {

            localStorage.removeItem(
                "rememberEmail"
            );

        }


        generalError.textContent =
            "Đăng nhập thành công!";

        generalError.style.background =
            "#effcf4";

        generalError.style.borderColor =
            "#b8e7ca";

        generalError.style.color =
            "#198754";

        generalError.classList.add(
            "show"
        );


        // Demo chuyển trang
        setTimeout(
            function () {

                alert(
                    "Đăng nhập thành công!"
                );

                // Sau này:
                // window.location.href = "dashboard.html";

            },
            500
        );

    }
);


// ============================================
// GOOGLE LOGIN
// ============================================

googleButton.addEventListener(
    "click",
    function () {

        alert(
            "Chức năng đăng nhập Google sẽ được kết nối với Google OAuth ở backend."
        );

    }
);


// ============================================
// QUÊN MẬT KHẨU
// ============================================

document
    .getElementById("forgotPassword")
    .addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            alert(
                "Chức năng khôi phục mật khẩu."
            );

        }
    );


// ============================================
// LOAD EMAIL ĐÃ GHI NHỚ
// ============================================

window.addEventListener(
    "DOMContentLoaded",
    function () {

        const savedEmail =
            localStorage.getItem(
                "rememberEmail"
            );


        if (savedEmail) {

            email.value =
                savedEmail;

            remember.checked =
                true;

        }


        // Kiểm tra khóa khi mở trang
        if (isAccountLocked()) {

            showLockMessage();

        }

    }
);