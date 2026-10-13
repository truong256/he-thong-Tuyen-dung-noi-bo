import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  Users,
  History,
  AlertCircle,
  ArrowRight,
  Clock,
  Search,
  Check,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  Requisition,
  AssignableRecruiter,
  RequisitionAssignments,
  AssignmentHistoryItem,
} from '../../types/requisition';
import requisitionApi from '../../api/requisition';

interface AssignRecruiterModalProps {
  isOpen: boolean;
  onClose: () => void;
  requisition: Requisition | null;
  onSuccess?: () => void;
}

export const AssignRecruiterModal: React.FC<AssignRecruiterModalProps> = ({
  isOpen,
  onClose,
  requisition,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'assign' | 'history'>('assign');
  const [recruiters, setRecruiters] = useState<AssignableRecruiter[]>([]);
  const [, setAssignments] = useState<RequisitionAssignments | null>(null);
  const [history, setHistory] = useState<AssignmentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [primaryRecruiterId, setPrimaryRecruiterId] = useState<number | null>(null);
  const [supportRecruiterIds, setSupportRecruiterIds] = useState<number[]>([]);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Initial primary recruiter for handover detection
  const [initialPrimaryId, setInitialPrimaryId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!requisition) return;
    setIsLoading(true);
    setError(null);
    try {
      const [recList, assignRes, histRes] = await Promise.all([
        requisitionApi.getAssignableRecruiters(),
        requisitionApi.getAssignments(requisition.id),
        requisitionApi.getAssignmentHistory(requisition.id),
      ]);
      setRecruiters(recList || []);
      setAssignments(assignRes || null);
      setHistory(histRes || []);

      const primaryId = assignRes?.primaryRecruiter?.userId || null;
      setPrimaryRecruiterId(primaryId);
      setInitialPrimaryId(primaryId);

      const supportIds = assignRes?.supportRecruiters?.map((s) => s.userId) || [];
      setSupportRecruiterIds(supportIds);
      setReason('');
      setNotes('');
    } catch (err: any) {
      console.error('Failed to load assignment data:', err);
      setError(err.response?.data?.message || 'Không thể tải thông tin phân công.');
    } finally {
      setIsLoading(false);
    }
  }, [requisition]);

  useEffect(() => {
    if (isOpen && requisition) {
      setActiveTab('assign');
      loadData();
    }
  }, [isOpen, requisition, loadData]);

  // Is changing primary recruiter (Handover)
  const isHandover = initialPrimaryId !== null && primaryRecruiterId !== null && primaryRecruiterId !== initialPrimaryId;

  const initialPrimaryRecruiter = recruiters.find((r) => r.id === initialPrimaryId);
  const newPrimaryRecruiter = recruiters.find((r) => r.id === primaryRecruiterId);

  const handleToggleSupport = (userId: number) => {
    if (userId === primaryRecruiterId) return; // Cannot be both
    setSupportRecruiterIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectPrimary = (userId: number) => {
    setPrimaryRecruiterId(userId);
    // Automatically remove from support if previously selected
    setSupportRecruiterIds((prev) => prev.filter((id) => id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requisition) return;

    if (!primaryRecruiterId) {
      setError('Vui lòng chỉ định một Recruiter chính chịu trách nhiệm.');
      return;
    }

    if (isHandover && !reason.trim()) {
      setError('Vui lòng nhập lý do chuyển giao người phụ trách chính.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await requisitionApi.assignRecruiters(requisition.id, {
        primaryRecruiterId,
        supportRecruiterIds,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error assigning recruiters:', err);
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu phân công.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRecruiters = recruiters.filter(
    (r) =>
      r.fullName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      r.email.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (r.department && r.department.toLowerCase().includes(searchKeyword.toLowerCase()))
  );

  const formatDateTime = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Phân công Recruiter phụ trách"
      subtitle={
        requisition ? (
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary, #64748b)' }}>
            Mã yêu cầu: <strong style={{ color: 'var(--color-text-primary, #0f172a)' }}>{requisition.requisitionCode}</strong> — {requisition.title}
          </span>
        ) : undefined
      }
      icon={<Users size={20} />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            style={{
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--color-border, #e2e8f0)',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('assign')}
            style={{
              padding: '8px 16px',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'assign' ? 'var(--color-primary, #0284c7)' : 'var(--color-text-secondary, #64748b)',
              borderBottom: activeTab === 'assign' ? '2px solid var(--color-primary, #0284c7)' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <UserCheck size={16} />
            Phân công người phụ trách
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              padding: '8px 16px',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'history' ? 'var(--color-primary, #0284c7)' : 'var(--color-text-secondary, #64748b)',
              borderBottom: activeTab === 'history' ? '2px solid var(--color-primary, #0284c7)' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <History size={16} />
            Lịch sử chuyển giao ({history.length})
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
            Đang tải dữ liệu phân công...
          </div>
        ) : activeTab === 'assign' ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Handover Notice Banner when Primary is changing */}
            {isHandover && (
              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fef3c7',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 600, fontSize: '0.875rem' }}>
                  <AlertCircle size={18} />
                  <span>Chuyển giao quyền phụ trách chính (Handover)</span>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#78350f', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span>Từ: <strong>{initialPrimaryRecruiter?.fullName || 'Chưa rõ'}</strong></span>
                  <ArrowRight size={14} />
                  <span>Sang: <strong>{newPrimaryRecruiter?.fullName || 'Người mới'}</strong></span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#92400e' }}>
                  Toàn bộ quyền điều phối và dữ liệu ứng viên của vị trí này sẽ được chuyển giao. Hệ thống sẽ lưu vết lịch sử vĩnh viễn.
                </p>
              </div>
            )}

            {/* Search filter for recruiters */}
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
              <input
                type="text"
                placeholder="Tìm recruiter theo tên, email hoặc phòng ban..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border, #cbd5e1)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Recruiter Selector Table / List */}
            <div
              style={{
                border: '1px solid var(--color-border, #e2e8f0)',
                borderRadius: '8px',
                maxHeight: '260px',
                overflowY: 'auto',
              }}
            >
              {filteredRecruiters.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                  Không tìm thấy tài khoản Recruiter nào phù hợp.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px', fontWeight: 600, color: '#475569' }}>Recruiter</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', textAlign: 'center', width: '130px' }}>
                        Phụ trách chính
                      </th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', textAlign: 'center', width: '110px' }}>
                        Hỗ trợ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecruiters.map((r) => {
                      const isPrimary = primaryRecruiterId === r.id;
                      const isSupport = supportRecruiterIds.includes(r.id);

                      return (
                        <tr
                          key={r.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: isPrimary ? '#f0fdf4' : isSupport ? '#f8fafc' : 'transparent',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{r.fullName}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {r.email} {r.department && `• ${r.department}`}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                              <input
                                type="radio"
                                name="primaryRecruiter"
                                checked={isPrimary}
                                onChange={() => handleSelectPrimary(r.id)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#16a34a' }}
                              />
                            </label>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <label style={{ cursor: isPrimary ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isSupport}
                                disabled={isPrimary}
                                onChange={() => handleToggleSupport(r.id)}
                                style={{ width: '16px', height: '16px', cursor: isPrimary ? 'not-allowed' : 'pointer' }}
                              />
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Handover Reason & Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Lý do phân công / chuyển giao {isHandover && <span style={{ color: '#dc2626' }}>*</span>}
                </label>
                <input
                  type="text"
                  placeholder={isHandover ? 'Bắt buộc: Nhập lý do chuyển giao người phụ trách...' : 'Ví dụ: Phân công chiến dịch quý 4...'}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border, #cbd5e1)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                  required={isHandover}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Ghi chú bàn giao công việc
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú thêm về trạng thái pipeline, ứng viên đang phỏng vấn, lưu ý..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border, #cbd5e1)',
                    fontSize: '0.875rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Hủy
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                <Check size={16} />
                Lưu phân công
              </Button>
            </div>
          </form>
        ) : (
          /* Handover History Tab */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {history.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                <Clock size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>Chưa có lịch sử chuyển giao hoặc phân công nào cho vị trí này.</p>
              </div>
            ) : (
              <div
                style={{
                  border: '1px solid var(--color-border, #e2e8f0)',
                  borderRadius: '8px',
                  maxHeight: '380px',
                  overflowY: 'auto',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px', color: '#475569' }}>Thời gian</th>
                      <th style={{ padding: '10px 12px', color: '#475569' }}>Hành động</th>
                      <th style={{ padding: '10px 12px', color: '#475569' }}>Người phụ trách</th>
                      <th style={{ padding: '10px 12px', color: '#475569' }}>Người thực hiện</th>
                      <th style={{ padding: '10px 12px', color: '#475569' }}>Lý do & Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#64748b' }}>
                          {formatDateTime(item.createdAt)}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {item.action === 'HANDOVER' ? (
                            <Badge variant="warning">Chuyển giao</Badge>
                          ) : item.action === 'ASSIGNED' ? (
                            <Badge variant="success">Phân công</Badge>
                          ) : item.action === 'UNASSIGNED' ? (
                            <Badge variant="danger">Thu hồi</Badge>
                          ) : (
                            <Badge variant="neutral">{item.action}</Badge>
                          )}
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            {item.assignmentType === 'PRIMARY' ? 'Chính' : 'Hỗ trợ'}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.userFullName}</div>
                          {item.previousUserFullName && (
                            <div style={{ fontSize: '0.75rem', color: '#b45309' }}>
                              Từ: {item.previousUserFullName}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>
                          {item.performedByFullName || 'Hệ thống'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ color: '#334155' }}>{item.reason || '—'}</div>
                          {item.notes && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                              Ghi chú: {item.notes}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Button type="button" variant="outline" onClick={onClose}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AssignRecruiterModal;
