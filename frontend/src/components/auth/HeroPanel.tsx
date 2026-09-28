import React from 'react';
import useHeroTilt from '../../hooks/useHeroTilt';

export const HeroPanel: React.FC = () => {
  const { containerRef, tiltStyle, handleMouseMove, handleMouseLeave } = useHeroTilt();

  return (
    <div
      ref={containerRef}
      className="hero-panel-wrapper"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="hero-radial-glow" aria-hidden="true" />

      <div className="hero-inner-content">
        {/* Brand Header */}
        <div className="hero-brand-block">
          <span className="hero-brand-name">HR Recruit ATS</span>
        </div>

        {/* Main Headline & Description */}
        <div className="hero-text-block">
          <h1 className="hero-headline">
            Hệ thống Tuyển dụng
            <span className="hero-headline-sub">Nội bộ Toàn diện</span>
          </h1>
          <p className="hero-description">
            Quản lý xuyên suốt quy trình tuyển dụng từ yêu cầu nhân sự,
            sàng lọc ứng viên, phỏng vấn, đánh giá đến offer và onboarding.
          </p>
        </div>

        {/* Illustration Card with Floating & Tilt Animation */}
        <div className="hero-image-wrapper">
          <div
            className="hero-image-card"
            style={tiltStyle}
          >
            <img
              src="/images/recruitment-workspace.webp"
              alt="Minh họa quy trình tuyển dụng HR Recruit ATS"
              className="hero-illustration"
              loading="eager"
            />
          </div>
        </div>

        {/* Minimal Feature Highlights (NO ICONS) */}
        <div className="hero-features-minimal">
          <div className="feature-chip">
            <span className="feature-chip-index">01</span>
            <span className="feature-chip-label">Bảo mật & phân quyền 7 vai trò</span>
          </div>
          <div className="feature-chip">
            <span className="feature-chip-index">02</span>
            <span className="feature-chip-label">Quy trình tuyển dụng minh bạch</span>
          </div>
          <div className="feature-chip">
            <span className="feature-chip-index">03</span>
            <span className="feature-chip-label">Quản lý dữ liệu tập trung</span>
          </div>
        </div>

        {/* Minimal Footer */}
        <div className="hero-bottom-footer">
          <span>© 2026 HR Recruit ATS</span>
        </div>
      </div>
    </div>
  );
};

export default HeroPanel;
