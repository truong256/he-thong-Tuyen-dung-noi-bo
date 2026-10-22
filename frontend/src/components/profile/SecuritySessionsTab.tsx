import React, { useMemo } from 'react';
import { KeyRound, ShieldCheck, CheckCircle2, Monitor } from 'lucide-react';

interface SecuritySessionsTabProps {
  onOpenPasswordModal: () => void;
}

export const SecuritySessionsTab: React.FC<SecuritySessionsTabProps> = ({ onOpenPasswordModal }) => {
  // Client environment detection for Current Session
  const deviceInfo = useMemo(() => {
    if (typeof window === 'undefined' || !navigator) {
      return { os: 'Hệ điều hành Windows', browser: 'Trình duyệt Web' };
    }
    const ua = navigator.userAgent;
    let os = 'Windows';
    if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    let browser = 'Edge / Chrome';
    if (ua.includes('Edg/')) browser = 'Microsoft Edge';
    else if (ua.includes('Chrome/')) browser = 'Google Chrome';
    else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
    else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Apple Safari';

    return { os, browser };
  }, []);

  return (
    <div className="profile-security-card" role="tabpanel" id="panel-security" aria-labelledby="tab-security">
      {/* Header */}
      <div className="profile-card-header-clean">
        <div className="profile-card-title-group">
          <h2 className="profile-section-title">Bảo mật tài khoản & Phiên làm việc</h2>
          <p className="profile-section-desc">
            Kiểm soát mật khẩu, quản lý phiên đăng nhập hiện tại và cấu hình chính sách an toàn thông tin.
          </p>
        </div>
      </div>

      <div className="profile-security-sections-list">
        {/* Section 1: Password Management */}
        <section className="profile-security-item" aria-labelledby="sec-pwd-title">
          <div className="profile-security-item-main">
            <div className="profile-security-item-header">
              <div className="profile-security-icon-badge primary">
                <KeyRound size={18} />
              </div>
              <div>
                <h3 id="sec-pwd-title" className="profile-security-item-title">
                  Mật khẩu tài khoản
                </h3>
                <p className="profile-security-item-desc">
                  Mật khẩu được mã hóa một chiều bằng thuật toán BCrypt với Salt ngẫu nhiên trên máy chủ.
                </p>
              </div>
            </div>

            <div className="profile-security-pills-row">
              <div className="profile-security-pill">
                <span className="pill-label">Độ dài tối thiểu:</span>
                <span className="pill-value">8 ký tự</span>
              </div>
              <div className="profile-security-pill">
                <span className="pill-label">Yêu cầu bảo mật:</span>
                <span className="pill-value">Chữ cái, Chữ số & Ký tự đặc biệt</span>
              </div>
              <div className="profile-security-pill">
                <span className="pill-label">Trạng thái:</span>
                <span className="pill-value text-success">Đã kích hoạt</span>
              </div>
            </div>
          </div>

          <div className="profile-security-item-action">
            <button
              type="button"
              className="btn btn-secondary profile-btn-action"
              onClick={onOpenPasswordModal}
            >
              <KeyRound size={14} />
              <span>Đổi mật khẩu</span>
            </button>
          </div>
        </section>

        {/* Section 2: Current Session */}
        <section className="profile-security-item" aria-labelledby="sec-session-title">
          <div className="profile-security-item-main">
            <div className="profile-security-item-header">
              <div className="profile-security-icon-badge success">
                <Monitor size={18} />
              </div>
              <div>
                <h3 id="sec-session-title" className="profile-security-item-title">
                  Phiên đăng nhập hiện tại
                </h3>
                <p className="profile-security-item-desc">
                  Thiết bị đang truy cập và thực hiện thao tác quản trị trên hệ thống.
                </p>
              </div>
            </div>

            <div className="profile-security-session-details">
              <div className="profile-session-device-row">
                <div className="device-info-name">
                  <strong>{deviceInfo.os}</strong> · {deviceInfo.browser}
                  <span className="device-current-tag">Thiết bị này</span>
                </div>
                <div className="device-meta-text">
                  Giao thức kết nối HTTP/TLS an toàn · Phiên làm việc đang hoạt động
                </div>
              </div>
            </div>

            <div className="profile-security-status-note">
              <CheckCircle2 size={15} className="text-success" />
              <span>Phiên làm việc hiện tại đang được mã hóa an toàn</span>
            </div>
          </div>
        </section>

        {/* Section 3: Token & Brute-force Policies */}
        <section className="profile-security-item" aria-labelledby="sec-policies-title">
          <div className="profile-security-item-main">
            <div className="profile-security-item-header">
              <div className="profile-security-icon-badge info">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 id="sec-policies-title" className="profile-security-item-title">
                  Phiên đăng nhập & Token
                </h3>
                <p className="profile-security-item-desc">
                  Hệ thống kiểm soát bảo mật đa tầng bằng JWT Access Token, xoay vòng Refresh Token và phát hiện bất thường.
                </p>
              </div>
            </div>

            <div className="profile-security-pills-row">
              <div className="profile-security-pill">
                <span className="pill-label">Hiệu lực Access Token:</span>
                <span className="pill-value">60 phút</span>
              </div>
              <div className="profile-security-pill">
                <span className="pill-label">Hiệu lực Refresh Token:</span>
                <span className="pill-value">7 ngày</span>
              </div>
              <div className="profile-security-pill">
                <span className="pill-label">Hết hạn khi không hoạt động:</span>
                <span className="pill-value">30 giây</span>
              </div>
              <div className="profile-security-pill">
                <span className="pill-label">Khóa tự động chống brute-force:</span>
                <span className="pill-value">15 phút (sau 5 lần sai)</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SecuritySessionsTab;
