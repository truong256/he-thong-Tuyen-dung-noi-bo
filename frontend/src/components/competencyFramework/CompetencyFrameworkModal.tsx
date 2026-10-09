import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  CompetencyFramework,
  CompetencyCriterion,
  CreateCompetencyFrameworkPayload,
  UpdateCompetencyFrameworkPayload,
  FRAMEWORK_CATEGORIES,
} from '../../types/competencyFramework';
import { JobTitle } from '../../types/jobTitle';
import { jobTitleApi } from '../../api/jobTitle';

interface CompetencyFrameworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateCompetencyFrameworkPayload | UpdateCompetencyFrameworkPayload) => Promise<void>;
  framework?: CompetencyFramework | null;
}

export const CompetencyFrameworkModal: React.FC<CompetencyFrameworkModalProps> = ({
  isOpen,
  onClose,
  onSave,
  framework,
}) => {
  const isEditing = Boolean(framework);

  // Form states
  const [competencyName, setCompetencyName] = useState('');
  const [category, setCategory] = useState<string>('KỸ THUẬT');
  const [description, setDescription] = useState('');
  const [selectedJobTitleIds, setSelectedJobTitleIds] = useState<number[]>([]);

  // Criteria state
  const [criteria, setCriteria] = useState<CompetencyCriterion[]>([
    { criterionCode: 'CRIT_01', criterionName: '', description: '', weightPercent: 100 },
  ]);

  // Available job titles
  const [availableJobTitles, setAvailableJobTitles] = useState<JobTitle[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load available job titles on mount or when opening modal
  useEffect(() => {
    let isMounted = true;
    jobTitleApi
      .getJobTitles()
      .then((res) => {
        if (isMounted && res) setAvailableJobTitles(res);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Initialize form when framework prop changes
  useEffect(() => {
    if (framework) {
      setCompetencyName(framework.competencyName);
      setCategory(framework.category || 'KỸ THUẬT');
      setDescription(framework.description || '');
      setSelectedJobTitleIds(framework.jobTitles ? framework.jobTitles.map((jt) => jt.id) : []);

      if (framework.criteria && framework.criteria.length > 0) {
        setCriteria(
          framework.criteria.map((c) => ({
            id: c.id,
            criterionCode: c.criterionCode,
            criterionName: c.criterionName,
            description: c.description || '',
            weightPercent: c.weightPercent,
            active: c.active !== false,
          }))
        );
      } else {
        setCriteria([{ criterionCode: 'CRIT_01', criterionName: '', description: '', weightPercent: 100 }]);
      }
    } else {
      setCompetencyName('');
      setCategory('KỸ THUẬT');
      setDescription('');
      setSelectedJobTitleIds([]);
      setCriteria([
        { criterionCode: 'CRIT_01', criterionName: '', description: '', weightPercent: 50 },
        { criterionCode: 'CRIT_02', criterionName: '', description: '', weightPercent: 50 },
      ]);
    }
    setErrorMessage(null);
  }, [framework, isOpen]);

  // Real-time weight calculation (SCRUM-77)
  const totalWeight = useMemo(() => {
    return criteria.reduce((sum, c) => sum + (Number(c.weightPercent) || 0), 0);
  }, [criteria]);

  // Duplicate code check
  const duplicateCodes = useMemo(() => {
    const counts = new Map<string, number>();
    criteria.forEach((c) => {
      const code = c.criterionCode?.trim().toUpperCase();
      if (code) counts.set(code, (counts.get(code) || 0) + 1);
    });
    return Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([code]) => code);
  }, [criteria]);

  // Validation status
  const isWeightValid = totalWeight === 100;
  const isFormValid =
    competencyName.trim().length > 0 &&
    criteria.length > 0 &&
    isWeightValid &&
    duplicateCodes.length === 0 &&
    criteria.every(
      (c) =>
        c.criterionCode.trim().length > 0 &&
        c.criterionName.trim().length > 0 &&
        c.weightPercent > 0 &&
        c.weightPercent <= 100
    );

  const handleAddCriterion = () => {
    const nextIdx = criteria.length + 1;
    const nextCode = `CRIT_${String(nextIdx).padStart(2, '0')}`;
    setCriteria((prev) => [
      ...prev,
      { criterionCode: nextCode, criterionName: '', description: '', weightPercent: 0 },
    ]);
  };

  const handleRemoveCriterion = (index: number) => {
    if (criteria.length <= 1) return;
    setCriteria((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCriterionChange = (
    index: number,
    field: keyof CompetencyCriterion,
    value: any
  ) => {
    setCriteria((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleToggleJobTitle = (titleId: number) => {
    setSelectedJobTitleIds((prev) =>
      prev.includes(titleId) ? prev.filter((id) => id !== titleId) : [...prev, titleId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload: CreateCompetencyFrameworkPayload = {
      competencyName: competencyName.trim(),
      category: category.trim(),
      description: description.trim() || undefined,
      criteria: criteria.map((c) => ({
        id: c.id,
        criterionCode: c.criterionCode.trim().toUpperCase(),
        criterionName: c.criterionName.trim(),
        description: c.description?.trim() || undefined,
        weightPercent: Number(c.weightPercent),
        active: c.active !== false,
      })),
      jobTitleIds: selectedJobTitleIds,
    };

    try {
      await onSave(payload);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể lưu khung năng lực.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cf-modal-overlay" role="dialog" aria-modal="true">
      <div className="cf-modal-card">
        {/* Header */}
        <div className="cf-modal-header">
          <h2>
            {isEditing ? 'Chỉnh sửa Khung Năng lực' : 'Tạo mới Khung Năng lực'}
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
        <form onSubmit={handleSubmit} className="cf-modal-body">
          {errorMessage && (
            <div className="cf-alert error" role="alert">
              <AlertCircle size={16} style={{ display: 'inline', marginRight: 6 }} />
              {errorMessage}
            </div>
          )}

          {/* Basic Info */}
          <div className="cf-form-row">
            <div className="cf-form-group">
              <label htmlFor="cf-name">
                Tên khung năng lực <span className="required">*</span>
              </label>
              <input
                id="cf-name"
                type="text"
                className="cf-form-input"
                placeholder="Ví dụ: Năng lực Lập trình & Kiến trúc Backend"
                value={competencyName}
                onChange={(e) => setCompetencyName(e.target.value)}
                required
                maxLength={100}
              />
            </div>

            <div className="cf-form-group">
              <label htmlFor="cf-category">Danh mục chuyên môn</label>
              <select
                id="cf-category"
                className="cf-form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {FRAMEWORK_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="cf-form-group">
            <label htmlFor="cf-desc">Mô tả mục tiêu đánh giá</label>
            <textarea
              id="cf-desc"
              className="cf-form-textarea"
              placeholder="Mô tả phạm vi ứng dụng và tiêu chuẩn đánh giá của khung năng lực này..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Real-time Weight Banner (SCRUM-77) */}
          <div
            className={`cf-weight-banner ${
              totalWeight === 100 ? 'success' : totalWeight < 100 ? 'warning' : 'error'
            }`}
          >
            <div className="cf-weight-banner-left">
              {totalWeight === 100 ? (
                <CheckCircle2 size={24} />
              ) : (
                <AlertTriangle size={24} />
              )}
              <div>
                <div className="cf-weight-banner-title">
                  Tổng trọng số hiện tại: {totalWeight}%
                </div>
                <div className="cf-weight-banner-subtitle">
                  {totalWeight === 100 && 'Tổng trọng số đạt chuẩn chính xác 100% — Sẵn sàng lưu.'}
                  {totalWeight < 100 &&
                    `Cảnh báo: Còn thiếu ${100 - totalWeight}% để đạt 100%. Vui lòng điều chỉnh.`}
                  {totalWeight > 100 &&
                    `Cảnh báo: Vượt quá ${totalWeight - 100}%. Tổng trọng số phải bằng chính xác 100%.`}
                </div>
              </div>
            </div>

            <div className="cf-weight-progress-wrap" title={`Tiến độ trọng số: ${totalWeight}%`}>
              <div
                className="cf-weight-progress-bar"
                style={{ width: `${Math.min(totalWeight, 100)}%` }}
              />
            </div>
          </div>

          {/* Duplicate Code Error */}
          {duplicateCodes.length > 0 && (
            <div className="cf-alert error">
              <AlertCircle size={16} style={{ display: 'inline', marginRight: 6 }} />
              Phát hiện trùng lặp mã tiêu chí: <strong>{duplicateCodes.join(', ')}</strong>. Mỗi tiêu chí trong khung phải có mã duy nhất.
            </div>
          )}

          {/* Criteria Dynamic Table */}
          <div className="cf-criteria-section">
            <div className="cf-criteria-header">
              <h3>Danh sách Tiêu chí Năng lực ({criteria.length})</h3>
              <button
                type="button"
                className="cf-btn-secondary"
                onClick={handleAddCriterion}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                Thêm tiêu chí
              </button>
            </div>

            <table className="cf-criteria-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Mã tiêu chí *</th>
                  <th style={{ width: '220px' }}>Tên tiêu chí *</th>
                  <th>Mô tả chi tiết</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Trọng số (%) *</th>
                  <th style={{ width: '50px', textAlign: 'center' }}>Xóa</th>
                </tr>
              </thead>
              <tbody>
                {criteria.map((c, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="text"
                        className="cf-form-input cf-criteria-input-code"
                        placeholder="BE_01"
                        value={c.criterionCode}
                        onChange={(e) =>
                          handleCriterionChange(index, 'criterionCode', e.target.value)
                        }
                        required
                        maxLength={50}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="cf-form-input"
                        placeholder="Tên tiêu chí năng lực"
                        value={c.criterionName}
                        onChange={(e) =>
                          handleCriterionChange(index, 'criterionName', e.target.value)
                        }
                        required
                        maxLength={150}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="cf-form-input"
                        placeholder="Mô tả tiêu chuẩn..."
                        value={c.description || ''}
                        onChange={(e) =>
                          handleCriterionChange(index, 'description', e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="cf-form-input cf-criteria-input-weight"
                        placeholder="%"
                        min={1}
                        max={100}
                        value={c.weightPercent || ''}
                        onChange={(e) =>
                          handleCriterionChange(
                            index,
                            'weightPercent',
                            parseInt(e.target.value, 10) || 0
                          )
                        }
                        required
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="cf-icon-btn danger"
                        title="Xóa tiêu chí"
                        disabled={criteria.length <= 1}
                        onClick={() => handleRemoveCriterion(index)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Multi Job Titles Association (TC08, TC09) */}
          <div className="cf-form-group">
            <label>
              Gán áp dụng cho Chức danh công việc ({selectedJobTitleIds.length} đã chọn)
            </label>
            <span style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
              Một khung năng lực có thể dùng chung cho nhiều chức danh (ví dụ: Backend Developer, Senior Backend Engineer).
            </span>

            <div className="cf-job-selector-box">
              {availableJobTitles.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '13px', padding: '8px' }}>
                  Đang tải danh sách chức danh...
                </div>
              ) : (
                availableJobTitles.map((jt) => (
                  <label key={jt.id} className="cf-job-checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedJobTitleIds.includes(jt.id)}
                      onChange={() => handleToggleJobTitle(jt.id)}
                    />
                    <span>
                      <strong>{jt.code}</strong> - {jt.title}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="cf-modal-footer">
          <button
            type="button"
            className="cf-btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="cf-btn-primary"
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? 'Đang lưu...' : isEditing ? 'Cập nhật khung' : 'Tạo khung năng lực'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompetencyFrameworkModal;
