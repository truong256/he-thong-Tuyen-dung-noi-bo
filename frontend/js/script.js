// Cấu hình tài khoản mẫu & quy tắc khóa
const VALID_EMAIL = 'hr@company.com';
const VALID_PASS = '123456';

const MAX_FAILED = 5;                        // Tối đa 5 lần
const LOCKOUT_MS = 15 * 60 * 1000;           // 15 phút

const App = {
  timerInterval: null,

  init() {
    this.bindEvents();

    // Kiểm tra ngay khi tải trang xem có đang trong thời gian bị khóa hay không
    if (this.isLocked()) {
      this.startCountdown();
    }
  },

  bindEvents() {
    const form = document.getElementById('login-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('input-email').value.trim();
      const pass = document.getElementById('input-password').value;
      this.handleLogin(email, pass);
    });

    // Bật / tắt ẩn hiện mật khẩu
    const toggleBtn = document.getElementById('btn-toggle-pass');
    toggleBtn.addEventListener('click', () => {
      const passInput = document.getElementById('input-password');
      const eyeIcon = document.getElementById('pass-eye-icon');
      if (passInput.type === 'password') {
        passInput.type = 'text';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
      } else {
        passInput.type = 'password';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
      }
    });
  },

  getFailedCount() {
    return parseInt(localStorage.getItem('failed_attempts') || '0', 10);
  },

  setFailedCount(count) {
    localStorage.setItem('failed_attempts', count.toString());
  },

  getLockUntil() {
    const val = localStorage.getItem('lockout_until');
    return val ? parseInt(val, 10) : null;
  },

  isLocked() {
    const lockUntil = this.getLockUntil();
    if (!lockUntil) return false;

    if (Date.now() < lockUntil) {
      return true;
    } else {
      // Hết 15 phút -> tự động mở khóa
      this.clearLock();
      return false;
    }
  },

  lockAccount() {
    const lockUntil = Date.now() + LOCKOUT_MS;
    localStorage.setItem('lockout_until', lockUntil.toString());
    this.startCountdown();
  },

  clearLock() {
    localStorage.removeItem('lockout_until');
    localStorage.removeItem('failed_attempts');
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.setInputsDisabled(false);
    const alertBox = document.getElementById('login-alert');
    alertBox.style.display = 'none';
  },

  setInputsDisabled(disabled) {
    document.getElementById('input-email').disabled = disabled;
    document.getElementById('input-password').disabled = disabled;
    document.getElementById('btn-submit').disabled = disabled;
  },

  startCountdown() {
    this.setInputsDisabled(true);

    const updateUI = () => {
      const lockUntil = this.getLockUntil();
      const remainingMs = lockUntil - Date.now();

      if (remainingMs <= 0) {
        this.clearLock();
        return;
      }

      const totalSec = Math.ceil(remainingMs / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      const formattedTime = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;

      const alertBox = document.getElementById('login-alert');
      alertBox.innerHTML = `
        <i class="fa-solid fa-triangle-exclamation" style="margin-right: 6px;"></i>
        <strong>Tài khoản đã bị khóa do đăng nhập sai 5 lần!</strong><br>
        Vui lòng thử lại sau: <strong>${formattedTime}</strong>
      `;
      alertBox.style.display = 'block';
    };

    updateUI();
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(updateUI, 1000);
  },

  handleLogin(email, pass) {
    if (this.isLocked()) return;

    const alertBox = document.getElementById('login-alert');
    alertBox.style.display = 'none';

    // Kiểm tra thông tin đăng nhập
    if (email === VALID_EMAIL && pass === VALID_PASS) {
      this.clearLock();
      alert('Đăng nhập thành công!');
    } else {
      let failed = this.getFailedCount() + 1;
      this.setFailedCount(failed);

      if (failed >= MAX_FAILED) {
        this.lockAccount();
      } else {
        const remaining = MAX_FAILED - failed;
        alertBox.innerHTML = `
          <i class="fa-solid fa-circle-exclamation" style="margin-right: 6px;"></i>
          Email hoặc mật khẩu không chính xác!<br>
          <small>Bạn còn <strong>${remaining}</strong> lần thử trước khi bị khóa 15 phút.</small>
        `;
        alertBox.style.display = 'block';
      }
    }
  }
};

window.addEventListener('DOMContentLoaded', () => App.init());