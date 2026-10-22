import React from 'react';
import { X, Award, Briefcase, Edit2, Layers, CheckCircle2 } from 'lucide-react';
import { CompetencyFramework } from '../../types/competencyFramework';

interface CompetencyFrameworkDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  framework: CompetencyFramework | null;
  onEdit?: (framework: CompetencyFramework) => void;
  canEdit?: boolean;
}

export const CompetencyFrameworkDetailModal: React.FC<CompetencyFrameworkDetailModalProps> = ({
  isOpen,
  onClose,
  framework,
  onEdit,
  canEdit = false,
}) => {
  if (!isOpen || !framework) return null;

  return (
    <div className="cf-modal-overlay" role="dialog" aria-modal="true">
      <div className="cf-modal-card">
        {/* Header */}
        <div className="cf-modal-header">
          <h2>
            <Award size={20} style={{ color: '#2563eb' }} />
            Chi tiết Khung Năng lực
          </h2>
          <button
            type="button"
            className="cf-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="cf-modal-body">
          {/* Main Info Card */}
          <div style={{ background: '#f8fafc', padding: '18px 20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span className="cf-badge-category tech" style={{ marginBottom: '8px' }}>
                  {framework.category || 'CHUNG'}
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '4px 0 6px 0' }}>
                  {framework.competencyName}
                </h3>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                  {framework.description || 'Chưa có mô tả mục tiêu đánh giá.'}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="cf-weight-badge success" style={{ fontSize: '14px', padding: '6px 12px' }}>
                  <CheckCircle2 size={16} /> Tổng trọng số: {framework.weightPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Job Titles Associated */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={16} style={{ color: '#64748b' }} />
              Chức danh công việc đang áp dụng ({framework.jobTitles?.length || 0})
            </h4>

            {(!framework.jobTitles || framework.jobTitles.length === 0) ? (
              <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
                Chưa có chức danh nào được gắn với khung năng lực này.
              </p>
            ) : (
              <div className="cf-job-titles-wrap">
                {framework.jobTitles.map((jt) => (
                  <span key={jt.id} className="cf-jt-tag" style={{ padding: '6px 12px', fontSize: '13px' }}>
                    <strong>{jt.code}</strong> - {jt.title}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Criteria List */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} style={{ color: '#64748b' }} />
              Các tiêu chí đánh giá ({framework.criteria?.length || 0})
            </h4>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
              <table className="cf-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: '120px' }}>Mã tiêu chí</th>
                    <th>Tên tiêu chí & Mô tả</th>
                    <th style={{ width: '180px', textAlign: 'right' }}>Trọng số & Tỷ trọng</th>
                  </tr>
                </thead>
                <tbody>
                  {framework.criteria?.map((c) => (
                    <tr key={c.id || c.criterionCode}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                          {c.criterionCode}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{c.criterionName}</div>
                        {c.description && (
                          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                            {c.description}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                          {c.weightPercent}%
                        </div>
                        <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${c.weightPercent}%`,
                              background: '#2563eb',
                              borderRadius: '999px',
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="cf-modal-footer">
          <button type="button" className="cf-btn-secondary" onClick={onClose}>
            Đóng
          </button>
          {canEdit && onEdit && (
            <button
              type="button"
              className="cf-btn-primary"
              onClick={() => {
                onClose();
                onEdit(framework);
              }}
            >
              <Edit2 size={16} /> Chỉnh sửa khung
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompetencyFrameworkDetailModal;
