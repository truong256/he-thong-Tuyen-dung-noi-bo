import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  X,
  UserCheck,
  Calendar,
  FileCheck,
  ShieldCheck,
  CornerDownRight,
  Loader2,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { approvalApi } from '../../api/approval';
import { RequisitionApprovalTimeline, ApprovalStep } from '../../types/approval';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/approval-timeline.css';

interface ApprovalTimelineModalProps {
  requisitionId: number;
  isOpen: boolean;
  onClose: () => void;
  canApprove?: boolean;
  onStatusChange?: () => void;
}

export const ApprovalTimelineModal: React.FC<ApprovalTimelineModalProps> = ({
  requisitionId,
  isOpen,
  onClose,
  canApprove = false,
  onStatusChange,
}) => {
  let user: any = null;
  try {
    const auth = useAuth();
    user = auth?.user;
  } catch {
    user = null;
  }
  const [timeline, setTimeline] = useState<RequisitionApprovalTimeline | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Approval actions
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionComments, setActionComments] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const loadTimeline = useCallback(async () => {
    if (!requisitionId || !isOpen) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await approvalApi.getTimeline(requisitionId);
      setTimeline(data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Bạn không có quyền xem lịch sử phê duyệt của yêu cầu tuyển dụng này.');
      } else {
        setError(err.response?.data?.message || 'Không thể tải lịch sử phê duyệt.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [requisitionId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadTimeline();
      setActionComments('');
      setActionError(null);
    }
  }, [isOpen, loadTimeline]);

  if (!isOpen) return null;

  const handleApprove = async () => {
    if (!timeline) return;
    setIsSubmittingAction(true);
    setActionError(null);
    try {
      const updated = await approvalApi.approve(timeline.requisitionId, actionComments.trim() || undefined);
      setTimeline(updated);
      setActionComments('');
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Có lỗi xảy ra khi phê duyệt.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleReject = async () => {
    if (!timeline) return;
    if (!actionComments.trim()) {
      setActionError('Vui lòng nhập lý do từ chối vào ô bình luận.');
      return;
    }
    setIsSubmittingAction(true);
    setActionError(null);
    try {
      const updated = await approvalApi.reject(
        timeline.requisitionId,
        actionComments.trim(),
        actionComments.trim()
      );
      setTimeline(updated);
      setActionComments('');
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Có lỗi xảy ra khi từ chối.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!timeline) return;
    if (!actionComments.trim()) {
      setActionError('Vui lòng nhập nội dung yêu cầu bổ sung vào ô ý kiến phản hồi.');
      return;
    }
    setIsSubmittingAction(true);
    setActionError(null);
    try {
      const updated = await approvalApi.requestChanges(
        timeline.requisitionId,
        actionComments.trim()
      );
      setTimeline(updated);
      setActionComments('');
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Có lỗi xảy ra khi yêu cầu bổ sung thông tin.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const formatTimestamp = (iso?: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const renderStepDot = (step: ApprovalStep) => {
    if (step.status === 'COMPLETED') {
      return (
        <div className="atl-step-dot completed" title="Đã duyệt">
          <CheckCircle2 size={20} />
        </div>
      );
    }
    if (step.status === 'REJECTED') {
      return (
        <div className="atl-step-dot rejected" title="Bị từ chối">
          <XCircle size={20} />
        </div>
      );
    }
    if (step.status === 'REQUEST_CHANGES') {
      return (
        <div className="atl-step-dot request-changes" title="Yêu cầu bổ sung">
          <AlertCircle size={20} />
        </div>
      );
    }
    if (step.isCurrentStep || step.status === 'PENDING') {
      return (
        <div className="atl-step-dot current-pending" title="Đang chờ duyệt">
          <Clock size={20} />
        </div>
      );
    }
    return (
      <div className="atl-step-dot upcoming" title="Chưa tới lượt">
        <span>{step.stepOrder}</span>
      </div>
    );
  };

  const getStepBadgeText = (step: ApprovalStep) => {
    if (step.status === 'COMPLETED') return 'ĐÃ DUYỆT';
    if (step.status === 'REJECTED') return 'TỪ CHỐI';
    if (step.status === 'REQUEST_CHANGES') return 'YÊU CẦU BỔ SUNG';
    if (step.isCurrentStep || step.status === 'PENDING') return 'ĐANG CHỜ DUYỆT';
    return 'CHƯA TỚI LƯỢT';
  };

  const getStepBadgeClass = (step: ApprovalStep) => {
    if (step.status === 'COMPLETED') return 'completed';
    if (step.status === 'REJECTED') return 'rejected';
    if (step.status === 'REQUEST_CHANGES') return 'request-changes';
    if (step.isCurrentStep || step.status === 'PENDING') return 'pending';
    return 'upcoming';
  };

  const percentCompleted = timeline
    ? Math.round((timeline.completedSteps / Math.max(1, timeline.totalSteps)) * 100)
    : 0;

  return (
    <div className="approval-timeline-modal" role="dialog" aria-modal="true" aria-labelledby="atl-modal-title">
      <div className="approval-timeline-dialog">
        {/* Header */}
        <div className="atl-header">
          <div>
            <h3 id="atl-modal-title" className="atl-header-title">
              <FileCheck size={22} color="#2563eb" />
              <span>Theo dõi tiến độ & Lịch sử phê duyệt</span>
            </h3>
            {timeline && (
              <div className="atl-header-meta">
                <span className="req-code-badge" style={{ fontSize: '0.78rem' }}>
                  {timeline.requisitionCode}
                </span>
                <span style={{ fontWeight: 600, color: '#334155' }}>{timeline.title}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            className="atl-close-btn"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="atl-body">
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
              <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              <div>Đang tải dòng thời gian phê duyệt...</div>
            </div>
          ) : error ? (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                color: '#991b1b',
              }}
            >
              <Lock size={36} style={{ margin: '0 auto 10px', color: '#ef4444' }} />
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700 }}>
                Truy cập bị từ chối
              </h4>
              <p style={{ margin: 0, fontSize: '0.88rem' }}>{error}</p>
            </div>
          ) : timeline ? (
            <>
              {/* Highlight callout: "Hồ sơ đang ở bàn ai" */}
              {timeline.isRejected ? (
                <div className="atl-desk-callout rejected">
                  <div className="atl-desk-icon">
                    <XCircle size={22} />
                  </div>
                  <div className="atl-desk-info">
                    <h4>Yêu cầu đã bị từ chối</h4>
                    <p>
                      <strong>Lý do:</strong> {timeline.rejectionReason || 'Không có lý do chi tiết'}
                    </p>
                  </div>
                </div>
              ) : timeline.isCompleted ? (
                <div className="atl-desk-callout approved">
                  <div className="atl-desk-icon">
                    <CheckCircle2 size={22} />
                  </div>
                  <div className="atl-desk-info">
                    <h4>Phê duyệt hoàn tất 100%</h4>
                    <p>
                      Yêu cầu tuyển dụng đã được thông qua tất cả các cấp và sẵn sàng để đăng tin & tạo chiến dịch tuyển dụng.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="atl-desk-callout pending">
                  <div className="atl-desk-icon">
                    <Clock size={22} />
                  </div>
                  <div className="atl-desk-info">
                    <h4>Hồ sơ đang chờ xử lý</h4>
                    <p>
                      Hồ sơ đang nằm tại bàn của: <strong>{timeline.currentWaitingOn || 'Cấp duyệt chuyên môn'}</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Progress overview */}
              <div className="atl-progress-wrapper">
                <div className="atl-progress-labels">
                  <span>Tiến độ xét duyệt ({timeline.completedSteps}/{timeline.totalSteps} bước)</span>
                  <span>{percentCompleted}%</span>
                </div>
                <div className="atl-progress-bar">
                  <div
                    className={`atl-progress-fill ${timeline.isRejected ? 'rejected' : ''}`}
                    style={{ width: `${percentCompleted}%` }}
                  />
                </div>
              </div>

              {/* Timeline Chain */}
              <div className="atl-chain">
                {timeline.steps.map((step, idx) => {
                  const isLast = idx === timeline.steps.length - 1;
                  const isStepActive = step.isCurrentStep || step.status === 'PENDING';
                  return (
                    <div key={step.stepOrder} className="atl-step-row">
                      <div className="atl-step-indicator">
                        {renderStepDot(step)}
                        {!isLast && (
                          <div
                            className={`atl-step-line ${
                              step.status === 'COMPLETED' ? 'completed' : ''
                            }`}
                          />
                        )}
                      </div>

                      <div className={`atl-step-card ${isStepActive ? 'active-card' : ''}`}>
                        <div className="atl-step-card-header">
                          <h4 className="atl-step-title">
                            Bước {step.stepOrder}: {step.stepName}
                          </h4>
                          <span className={`atl-step-badge ${getStepBadgeClass(step)}`}>
                            {getStepBadgeText(step)}
                          </span>
                        </div>

                        <div className="atl-step-meta">
                          <div className="atl-step-meta-item">
                            <UserCheck size={14} />
                            <span>
                              Người duyệt: <strong>{step.approverName || 'Chưa chỉ định'}</strong>
                            </span>
                            {step.approverRole && (
                              <span className="atl-step-role-badge">{step.approverRole}</span>
                            )}
                          </div>
                          {step.actionAt && (
                            <div className="atl-step-meta-item">
                              <Calendar size={14} />
                              <span>{formatTimestamp(step.actionAt)}</span>
                            </div>
                          )}
                        </div>

                        {step.comments && (
                          <div
                            className={`atl-step-comments ${
                              step.status === 'REJECTED' ? 'rejected' : ''
                            }`}
                          >
                            <span style={{ fontWeight: 600 }}>Ý kiến phản hồi:</span> "
                            {step.comments}"
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions (chỉ hiển thị cho người duyệt được phân công ở cấp hiện tại theo RBAC) */}
              {(() => {
                const currentPendingStep = timeline.steps.find((s) => s.isCurrentStep || s.status === 'PENDING');
                const isDesignatedApprover = currentPendingStep
                  ? (currentPendingStep.approverId == null || !user?.id || user.id === currentPendingStep.approverId)
                  : canApprove;
                return canApprove && isDesignatedApprover && !timeline.isCompleted && !timeline.isRejected ? (
                <div className="atl-action-box">
                  <h4 className="atl-action-title">
                    <CornerDownRight size={16} /> Thao tác phê duyệt tại bước hiện tại
                  </h4>
                  <textarea
                    className="atl-action-textarea"
                    placeholder="Nhập ý kiến, ghi chú phê duyệt hoặc lý do từ chối (bắt buộc khi từ chối)..."
                    value={actionComments}
                    onChange={(e) => setActionComments(e.target.value)}
                    disabled={isSubmittingAction}
                  />
                  {actionError && (
                    <div style={{ color: '#ef4444', fontSize: '0.82rem', fontWeight: 600 }}>
                      {actionError}
                    </div>
                  )}
                  <div className="atl-action-buttons">
                    <button
                      type="button"
                      className="atl-btn-reject"
                      onClick={handleReject}
                      disabled={isSubmittingAction}
                      title="Từ chối yêu cầu tuyển dụng"
                    >
                      <XCircle size={15} />
                      Từ chối yêu cầu
                    </button>
                    <button
                      type="button"
                      className="atl-btn-request-changes"
                      onClick={handleRequestChanges}
                      disabled={isSubmittingAction}
                      title="Yêu cầu bổ sung thông tin (chuyển về bản nháp để người tạo cập nhật)"
                    >
                      <AlertCircle size={15} />
                      Yêu cầu bổ sung
                    </button>
                    <button
                      type="button"
                      className="atl-btn-approve"
                      onClick={handleApprove}
                      disabled={isSubmittingAction}
                      title="Phê duyệt chuyển bước tiếp theo"
                    >
                      {isSubmittingAction ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={15} />
                      )}
                      Phê duyệt
                    </button>
                  </div>
                </div>
              ) : null;
            })()}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="atl-footer">
          <div className="atl-footer-info">
            <ShieldCheck size={16} color="#059669" />
            <span>Nhật ký phê duyệt bất biến (Immutable Audit Trail)</span>
          </div>
          <button type="button" className="atl-btn-close" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalTimelineModal;
