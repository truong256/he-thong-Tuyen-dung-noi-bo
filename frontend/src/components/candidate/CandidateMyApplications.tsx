import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Mail,
  RefreshCw,
  XCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import withdrawalApi from '../../api/withdrawal';
import { CandidateApplicationPortalItem } from '../../types/withdrawal';

interface Props {
  onRefresh?: () => void;
}

export const CandidateMyApplications: React.FC<Props> = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<CandidateApplicationPortalItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'WITHDRAWN'>('ALL');

  // Modal withdrawal state
  const [selectedApp, setSelectedApp] = useState<CandidateApplicationPortalItem | null>(null);
  const [withdrawReason, setWithdrawReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string>('');

  const loadApplications = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const data = await withdrawalApi.getMyApplications();
      setApplications(data || []);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể tải danh sách hồ sơ ứng tuyển. Vui lòng thử lại sau.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleOpenWithdrawModal = (app: CandidateApplicationPortalItem) => {
    setSelectedApp(app);
    setWithdrawReason('');
    setModalError('');
  };

  const handleCloseWithdrawModal = () => {
    if (isSubmitting) return;
    setSelectedApp(null);
    setWithdrawReason('');
    setModalError('');
  };

  const handleConfirmWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setModalError('');

      const res = await withdrawalApi.withdrawByCandidate(
        selectedApp.id,
        withdrawReason.trim() ? withdrawReason.trim() : undefined
      );

      if (res.success) {
        setSuccessToast(`Đã rút hồ sơ ứng tuyển vị trí "${selectedApp.positionTitle}" thành công.`);
        // Update local list
        setApplications((prev) =>
          prev.map((item) =>
            item.id === selectedApp.id
              ? {
                  ...item,
                  withdrawn: true,
                  stage: 'WITHDRAWN',
                  withdrawnAt: new Date().toISOString(),
                  withdrawalReason: withdrawReason.trim() || undefined,
                }
              : item
          )
        );
        handleCloseWithdrawModal();
      } else {
        setModalError(res.message || 'Rút hồ sơ không thành công. Vui lòng thử lại.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Đã có lỗi xảy ra khi gửi yêu cầu rút hồ sơ.';
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStageBadge = (stage: string, withdrawn: boolean) => {
    if (withdrawn || stage === 'WITHDRAWN' || stage === 'Ứng viên rút') {
      return (
        <span
          style={{
            background: '#F1F5F9',
            color: '#64748B',
            border: '1px solid #CBD5E1',
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <XCircle size={13} />
          Ứng viên đã rút
        </span>
      );
    }

    switch (stage?.toUpperCase()) {
      case 'SCREENING':
        return (
          <span
            style={{
              background: '#EFF6FF',
              color: '#1D4ED8',
              border: '1px solid #BFDBFE',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Clock size={13} />
            Đang sàng lọc
          </span>
        );
      case 'APPLIED':
        return (
          <span
            style={{
              background: '#ECFDF5',
              color: '#047857',
              border: '1px solid #A7F3D0',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <CheckCircle2 size={13} />
            Đã nộp đơn
          </span>
        );
      case 'INTERVIEWING':
        return (
          <span
            style={{
              background: '#FFFBEB',
              color: '#B45309',
              border: '1px solid #FDE68A',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            Phỏng vấn
          </span>
        );
      case 'HIRED':
        return (
          <span
            style={{
              background: '#F0FDF4',
              color: '#15803D',
              border: '1px solid #BBF7D0',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            Trúng tuyển
          </span>
        );
      default:
        return (
          <span
            style={{
              background: '#F8FAFC',
              color: '#475569',
              border: '1px solid #E2E8F0',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            {stage || 'Đang xử lý'}
          </span>
        );
    }
  };

  return (
    <div style={{ marginTop: '24px', marginBottom: '24px' }}>
      {/* Toast Notification */}
      {successToast && (
        <div
          style={{
            background: '#ECFDF5',
            color: '#065F46',
            border: '1px solid #A7F3D0',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.925rem',
            fontWeight: 500,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} color="#059669" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast('')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#047857' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Applications Section */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}
      >
        {/* Section Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} color="#2563EB" />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>
                Hồ sơ ứng tuyển của tôi
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
                Theo dõi tiến độ tuyển dụng và quản lý quyền rút hồ sơ (S4-06)
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={loadApplications}
              disabled={isLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#334155',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} className={isLoading ? 'spinning' : ''} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px' }}>
          {/* Banner hướng dẫn kiểm thử S4-06 Email Link */}
          <div
            style={{
              background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)',
              border: '1px solid #BFDBFE',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Mail size={20} color="#1D4ED8" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#1E40AF', fontSize: '0.925rem' }}>
                  Kiểm thử luồng Rút hồ sơ qua Liên kết Email (S4-06 AC1)
                </strong>
                <p style={{ margin: '4px 0 0 0', color: '#334155', fontSize: '0.85rem' }}>
                  Hệ thống tự động nhúng mã liên kết rút hồ sơ an toàn trong email xác nhận khi bạn nộp đơn. Bạn có thể kiểm tra trực tiếp giao diện rút hồ sơ tại trang công khai:
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/candidate/withdraw?token=demo-withdraw-token-123')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#2563EB',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '0.85rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                whiteSpace: 'nowrap',
              }}
            >
              <span>Xem trang rút qua Email mẫu</span>
              <ExternalLink size={14} />
            </button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748B' }}>
              <RefreshCw size={24} className="spinning" style={{ margin: '0 auto 8px auto' }} />
              <p>Đang tải danh sách hồ sơ ứng tuyển của bạn...</p>
            </div>
          )}

          {/* Error State */}
          {!isLoading && errorMessage && (
            <div
              style={{
                background: '#FEF2F2',
                color: '#991B1B',
                border: '1px solid #FECACA',
                padding: '12px 16px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !errorMessage && applications.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
              <FileText size={36} color="#CBD5E1" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#334155' }}>
                Bạn chưa nộp hồ sơ ứng tuyển nào
              </h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.875rem' }}>
                Hãy khám phá các vị trí tuyển dụng đang mở để tìm cơ hội phù hợp với bạn.
              </p>
              <button
                type="button"
                onClick={() => navigate('/careers')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Khám phá việc làm đang mở
              </button>
            </div>
          )}

          {/* Applications List / Table */}
          {!isLoading && !errorMessage && applications.length > 0 && (() => {
            const isWithdrawnApp = (app: CandidateApplicationPortalItem) =>
              app.withdrawn || app.stage === 'WITHDRAWN' || app.stage === 'Ứng viên rút';

            const activeApps = applications.filter((app) => !isWithdrawnApp(app));
            const withdrawnApps = applications.filter((app) => isWithdrawnApp(app));

            const filteredApplications =
              filterTab === 'ACTIVE'
                ? activeApps
                : filterTab === 'WITHDRAWN'
                ? withdrawnApps
                : applications;

            return (
              <div>
                {/* Status Filter Tabs */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    borderBottom: '1px solid #E2E8F0',
                    paddingBottom: '12px',
                    marginBottom: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setFilterTab('ALL')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: filterTab === 'ALL' ? '1px solid #2563EB' : '1px solid #E2E8F0',
                        background: filterTab === 'ALL' ? '#EFF6FF' : '#FFFFFF',
                        color: filterTab === 'ALL' ? '#1D4ED8' : '#64748B',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Tất cả ({applications.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTab('ACTIVE')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: filterTab === 'ACTIVE' ? '1px solid #059669' : '1px solid #E2E8F0',
                        background: filterTab === 'ACTIVE' ? '#ECFDF5' : '#FFFFFF',
                        color: filterTab === 'ACTIVE' ? '#047857' : '#64748B',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Đang ứng tuyển ({activeApps.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTab('WITHDRAWN')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: filterTab === 'WITHDRAWN' ? '1px solid #DC2626' : '1px solid #E2E8F0',
                        background: filterTab === 'WITHDRAWN' ? '#FEF2F2' : '#FFFFFF',
                        color: filterTab === 'WITHDRAWN' ? '#B91C1C' : '#64748B',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Đã rút ({withdrawnApps.length})
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748B' }}>
                    <Info size={14} color="#3B82F6" />
                    <span>Hồ sơ đã rút được lưu lại làm lịch sử và đã loại khỏi danh sách xét duyệt của Recruiter.</span>
                  </div>
                </div>

                {filteredApplications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 16px', color: '#64748B' }}>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>
                      {filterTab === 'ACTIVE'
                        ? 'Bạn hiện không có hồ sơ nào đang ứng tuyển.'
                        : 'Không có hồ sơ nào đã rút.'}
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#475569', fontSize: '0.85rem' }}>
                          <th style={{ padding: '10px 12px' }}>MÃ & VỊ TRÍ ỨNG TUYỂN</th>
                          <th style={{ padding: '10px 12px' }}>TRẠNG THÁI</th>
                          <th style={{ padding: '10px 12px' }}>THÔNG TIN THỰC HIỆN</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>THAO TÁC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredApplications.map((app) => {
                          const isWithdrawn = isWithdrawnApp(app);
                          return (
                            <tr
                              key={app.id}
                              style={{
                                borderBottom: '1px solid #F1F5F9',
                                background: isWithdrawn ? '#F8FAFC' : '#FFFFFF',
                                transition: 'background 0.15s ease',
                              }}
                            >
                        {/* Position info */}
                        <td style={{ padding: '14px 12px', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 600, color: isWithdrawn ? '#64748B' : '#0F172A' }}>
                            {app.positionTitle || 'Vị trí tuyển dụng'}
                          </div>
                          {app.requisitionCode && (
                            <span
                              style={{
                                display: 'inline-block',
                                background: '#E2E8F0',
                                color: '#475569',
                                fontSize: '0.75rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                marginTop: '4px',
                                fontFamily: 'monospace',
                              }}
                            >
                              {app.requisitionCode}
                            </span>
                          )}
                        </td>

                        {/* Stage badge */}
                        <td style={{ padding: '14px 12px', verticalAlign: 'middle' }}>
                          {getStageBadge(app.stage, isWithdrawn)}
                        </td>

                        {/* Extra details (withdrawal date/reason) */}
                        <td style={{ padding: '14px 12px', verticalAlign: 'middle', fontSize: '0.85rem' }}>
                          {isWithdrawn ? (
                            <div>
                              <div style={{ color: '#DC2626', fontWeight: 500 }}>
                                Đã dừng tuyển dụng
                              </div>
                              {app.withdrawnAt && (
                                <div style={{ color: '#64748B', fontSize: '0.8rem' }}>
                                  Vào lúc: {new Date(app.withdrawnAt).toLocaleString('vi-VN')}
                                </div>
                              )}
                              {app.withdrawalReason && (
                                <div
                                  style={{
                                    color: '#475569',
                                    fontStyle: 'italic',
                                    fontSize: '0.8rem',
                                    marginTop: '2px',
                                  }}
                                >
                                  Lý do: "{app.withdrawalReason}"
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#059669', fontSize: '0.85rem' }}>
                              Đang trong quá trình xét duyệt hồ sơ
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 12px', verticalAlign: 'middle', textAlign: 'right' }}>
                          {!isWithdrawn ? (
                            <button
                              type="button"
                              onClick={() => handleOpenWithdrawModal(app)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 14px',
                                borderRadius: '8px',
                                border: '1px solid #FCA5A5',
                                background: '#FEF2F2',
                                color: '#DC2626',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#DC2626';
                                e.currentTarget.style.color = '#FFFFFF';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#FEF2F2';
                                e.currentTarget.style.color = '#DC2626';
                              }}
                              title="Rút hồ sơ ứng tuyển vị trí này"
                            >
                              <AlertTriangle size={14} />
                              <span>Rút hồ sơ</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.825rem', color: '#94A3B8' }}>
                              Đã hoàn tất rút
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedApp && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: '#FEF2F2',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DC2626',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#991B1B', fontWeight: 700 }}>
                  Xác nhận rút hồ sơ ứng tuyển
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#7F1D1D' }}>
                  Thao tác này sẽ chính thức dừng quá trình tuyển dụng của bạn
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmWithdraw} style={{ padding: '24px' }}>
              {modalError && (
                <div
                  style={{
                    background: '#FEF2F2',
                    color: '#991B1B',
                    border: '1px solid #FECACA',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '0.875rem',
                  }}
                >
                  {modalError}
                </div>
              )}

              <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#1E293B', lineHeight: 1.5 }}>
                Bạn đang yêu cầu rút hồ sơ cho vị trí:{' '}
                <strong style={{ color: '#0F172A' }}>{selectedApp.positionTitle}</strong>{' '}
                {selectedApp.requisitionCode && `(Mã: ${selectedApp.requisitionCode})`}.
              </p>

              <div
                style={{
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  color: '#92400E',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  lineHeight: 1.4,
                  marginBottom: '16px',
                }}
              >
                ⚠️ <strong>Lưu ý:</strong> Sau khi rút, hồ sơ của bạn sẽ được chuyển sang trạng thái "Ứng viên rút" và biến mất khỏi danh sách ứng viên đang hoạt động của nhà tuyển dụng.
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="portal-withdraw-reason"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}
                >
                  Lý do rút hồ sơ (không bắt buộc):
                </label>
                <textarea
                  id="portal-withdraw-reason"
                  rows={3}
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  placeholder="Ví dụ: Tôi đã nhận lời mời làm việc tại nơi khác, kế hoạch cá nhân thay đổi..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                  disabled={isSubmitting}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCloseWithdrawModal}
                  disabled={isSubmitting}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#334155',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#DC2626',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)',
                  }}
                >
                  {isSubmitting && <RefreshCw size={14} className="spinning" />}
                  <span>{isSubmitting ? 'Đang xử lý...' : 'Xác nhận rút hồ sơ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateMyApplications;
