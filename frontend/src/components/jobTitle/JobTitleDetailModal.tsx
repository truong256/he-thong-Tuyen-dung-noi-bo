import React from 'react';
import {
  X,
  Award,
  Building2,
  DollarSign,
  Users,
  Briefcase,
  CheckCircle2,
  Calendar,
  Layers,
  Edit2,
  Power,
  ShieldCheck,
} from 'lucide-react';
import { JobTitle, LEVEL_METADATA, JOB_FAMILY_METADATA } from '../../types/jobTitle';

interface JobTitleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle: JobTitle | null;
  onEdit?: (jt: JobTitle) => void;
  onToggleStatus?: (id: number) => void;
  canEdit?: boolean;
  canViewSalary?: boolean;
}

export const JobTitleDetailModal: React.FC<JobTitleDetailModalProps> = ({
  isOpen,
  onClose,
  jobTitle,
  onEdit,
  onToggleStatus,
  canEdit = false,
  canViewSalary = false,
}) => {
  if (!isOpen || !jobTitle) return null;

  const levelInfo = LEVEL_METADATA[jobTitle.level];
  const familyInfo = JOB_FAMILY_METADATA[jobTitle.jobFamily];

  // Headcount calculation
  const stdCount = jobTitle.standardHeadcount || 0;
  const currCount = jobTitle.currentHeadcount || 0;
  const percentFilled = stdCount > 0 ? Math.min(Math.round((currCount / stdCount) * 100), 100) : 100;

  return (
    <div className="jt-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="jt-modal-container jt-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header Banner */}
        <div className="jt-detail-header">
          <div className="jt-detail-title-row">
            <div className="jt-modal-icon-badge large">
              <Award size={26} />
            </div>
            <div className="jt-detail-title-info">
              <div className="jt-title-top-meta">
                <span className="jt-code-pill">{jobTitle.code}</span>
                <span
                  className="jt-level-tag"
                  style={{ backgroundColor: levelInfo?.badgeBg, color: levelInfo?.badgeText }}
                >
                  {levelInfo?.label || jobTitle.level}
                </span>
                <span className={`jt-status-badge ${jobTitle.active ? 'active' : 'inactive'}`}>
                  {jobTitle.active ? 'Đang áp dụng' : 'Tạm ngưng'}
                </span>
              </div>
              <h2 className="jt-detail-h2">{jobTitle.title}</h2>
              <div className="jt-detail-submeta">
                <span className="jt-meta-chip">
                  <Building2 size={14} />
                  {jobTitle.departmentName || 'Chưa gán phòng ban'}
                </span>
                <span className="jt-meta-chip">
                  <Layers size={14} />
                  {familyInfo?.label || jobTitle.jobFamily}
                </span>
                <span className="jt-meta-chip">
                  <Calendar size={14} />
                  Khởi tạo: {jobTitle.createdAt}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="jt-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng chi tiết"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="jt-detail-body">
          {/* Quick Metrics Cards */}
          <div className="jt-detail-metrics-grid">
            {canViewSalary && (
              <div className="jt-metric-box">
                <div className="jt-metric-icon dollar">
                  <DollarSign size={20} />
                </div>
                <div className="jt-metric-content">
                  <span className="jt-metric-label">Dải lương tham chiếu</span>
                  <span className="jt-metric-value salary">
                    {jobTitle.salaryRangeDisplay || 'Chưa khai báo'}
                  </span>
                </div>
              </div>
            )}

            <div className="jt-metric-box">
              <div className="jt-metric-icon users">
                <Users size={20} />
              </div>
              <div className="jt-metric-content">
                <span className="jt-metric-label">Định biên & Thực tế</span>
                <div className="jt-headcount-stat">
                  <span className="jt-metric-value">
                    {currCount} / {stdCount > 0 ? stdCount : 'Không giới hạn'}
                  </span>
                  {stdCount > 0 && (
                    <span className="jt-metric-pill">{percentFilled}% đáp ứng</span>
                  )}
                </div>
                {stdCount > 0 && (
                  <div className="jt-progress-bar-bg">
                    <div
                      className="jt-progress-bar-fill"
                      style={{ width: `${percentFilled}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="jt-metric-box">
              <div className="jt-metric-icon reqs">
                <Briefcase size={20} />
              </div>
              <div className="jt-metric-content">
                <span className="jt-metric-label">Tuyển dụng đang mở</span>
                <span className="jt-metric-value req-count">
                  {jobTitle.openRequisitions > 0
                    ? `${jobTitle.openRequisitions} vị trí đang tuyển`
                    : 'Đủ định biên (Không tuyển)'}
                </span>
              </div>
            </div>
          </div>

          {/* Job Description */}
          <div className="jt-detail-section">
            <h3 className="jt-detail-section-title">Mô tả công việc chuẩn hóa</h3>
            <p className="jt-detail-description">
              {jobTitle.jobDescription || 'Chưa cập nhật mô tả chi tiết cho chức danh này.'}
            </p>
          </div>

          {/* Key Responsibilities */}
          {jobTitle.keyResponsibilities && jobTitle.keyResponsibilities.length > 0 && (
            <div className="jt-detail-section">
              <h3 className="jt-detail-section-title">Trách nhiệm & Nhiệm vụ chính</h3>
              <ul className="jt-detail-bullet-list">
                {jobTitle.keyResponsibilities.map((item, idx) => (
                  <li key={idx}>
                    <CheckCircle2 size={16} className="bullet-icon" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Requirements */}
          {jobTitle.requirements && jobTitle.requirements.length > 0 && (
            <div className="jt-detail-section">
              <h3 className="jt-detail-section-title">Yêu cầu chuyên môn & Tiêu chuẩn tuyển dụng</h3>
              <ul className="jt-detail-bullet-list reqs">
                {jobTitle.requirements.map((item, idx) => (
                  <li key={idx}>
                    <span className="bullet-dot" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Competency Framework */}
          <div className="jt-detail-section">
            <h3 className="jt-detail-section-title">Khung năng lực chuẩn hóa (S2-06)</h3>
            {jobTitle.competencyFrameworkName ? (
              <div
                className="jt-framework-linked-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  marginBottom: '10px',
                }}
              >
                <ShieldCheck size={20} style={{ color: '#16a34a', flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '0.875rem', color: '#15803d', fontWeight: 600 }}>
                    {jobTitle.competencyFrameworkName}
                  </span>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#166534' }}>
                    Đã liên kết với khung năng lực hệ thống để kiểm soát bộ tiêu chí và ngân hàng câu hỏi (S2-07).
                  </p>
                </div>
              </div>
            ) : (
              <p
                className="jt-detail-description"
                style={{ color: '#64748b', fontStyle: 'italic', marginBottom: '8px' }}
              >
                Chưa gán khung năng lực chuẩn hóa.
              </p>
            )}

            {jobTitle.competencies && jobTitle.competencies.length > 0 && (
              <div className="jt-competencies-wrap">
                {jobTitle.competencies.map((comp, idx) => (
                  <span key={idx} className="jt-comp-pill">
                    <ShieldCheck size={14} />
                    {comp}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Audit Info Footer */}
          <div className="jt-detail-audit-box">
            <span>
              Cập nhật gần nhất:{' '}
              <strong>{jobTitle.updatedAt || jobTitle.createdAt}</strong> bởi{' '}
              <strong>{jobTitle.updatedBy || 'Quản trị viên'}</strong>
            </span>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="jt-modal-footer space-between">
          <div>
            {canEdit && onToggleStatus && (
              <button
                type="button"
                className={`jt-btn-ghost ${jobTitle.active ? 'text-danger' : 'text-success'}`}
                onClick={() => onToggleStatus(jobTitle.id)}
              >
                <Power size={16} />
                <span>{jobTitle.active ? 'Tạm ngưng chức danh' : 'Kích hoạt lại'}</span>
              </button>
            )}
          </div>
          <div className="jt-footer-right-actions">
            <button type="button" className="jt-btn-outline" onClick={onClose}>
              Đóng
            </button>
            {canEdit && onEdit && (
              <button
                type="button"
                className="jt-btn-primary"
                onClick={() => {
                  onClose();
                  onEdit(jobTitle);
                }}
              >
                <Edit2 size={16} />
                <span>Chỉnh sửa thông tin</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobTitleDetailModal;
