import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Building2,
  Briefcase,
  User,
  Hash,
} from 'lucide-react';
import withdrawalApi from '../api/withdrawal';
import { WithdrawalValidationResponse } from '../types/withdrawal';
import '../styles/withdrawal.css';

export const WithdrawApplicationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validation, setValidation] = useState<WithdrawalValidationResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const validate = useCallback(async () => {
    if (!token.trim()) {
      setIsLoading(false);
      setErrorMessage('Không tìm thấy mã liên kết rút hồ sơ. Vui lòng kiểm tra lại đường dẫn từ email.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      const data = await withdrawalApi.validateToken(token.trim());
      setValidation(data);
      if (!data.valid) {
        setErrorMessage(data.message || 'Liên kết rút hồ sơ không hợp lệ hoặc đã hết hạn.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể xác thực liên kết rút hồ sơ. Vui lòng thử lại sau.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    validate();
  }, [validate]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !token.trim()) return;

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      const result = await withdrawalApi.confirmWithdrawal({
        token: token.trim(),
        reason: reason.trim() ? reason.trim() : undefined,
      });

      if (result.success) {
        setIsSuccess(true);
      } else {
        setErrorMessage(result.message || 'Rút hồ sơ không thành công. Vui lòng thử lại.');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Đã xảy ra lỗi trong quá trình xử lý yêu cầu rút hồ sơ. Vui lòng thử lại sau.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Navigate safely back to careers page without modifying data
    navigate('/careers');
  };

  return (
    <div className="withdraw-page-container">
      <div className="withdraw-card" role="region" aria-label="Khu vực rút hồ sơ ứng tuyển">
        {/* Loading State */}
        {isLoading && (
          <div className="withdraw-loading" data-testid="withdrawal-loading">
            <div className="withdraw-spinner" aria-hidden="true" />
            <p className="withdraw-subtitle">Đang xác thực liên kết rút hồ sơ của bạn...</p>
          </div>
        )}

        {/* Success State */}
        {!isLoading && isSuccess && (
          <div>
            <div className="withdraw-card-header">
              <div className="withdraw-icon-wrapper success" aria-hidden="true">
                <CheckCircle2 size={32} />
              </div>
              <h1 className="withdraw-title">Rút hồ sơ ứng tuyển thành công</h1>
              <p className="withdraw-subtitle">
                Yêu cầu dừng ứng tuyển của bạn đã được hệ thống ghi nhận.
              </p>
            </div>
            <div className="withdraw-card-body">
              <div className="withdraw-alert withdraw-alert-success" role="status">
                <CheckCircle2 size={20} className="withdraw-alert-icon" />
                <div>
                  Hồ sơ ứng tuyển của bạn đã được chuyển sang trạng thái <strong>Ứng viên rút</strong> và được đưa ra
                  khỏi quy trình tuyển dụng đang hoạt động. Recruiter phụ trách đã nhận được thông báo.
                </div>
              </div>

              {validation && (
                <div className="withdraw-details-box">
                  <div className="withdraw-details-row">
                    <span className="withdraw-details-label">Vị trí:</span>
                    <span className="withdraw-details-value">{validation.positionTitle || 'N/A'}</span>
                  </div>
                  {validation.applicationId && (
                    <div className="withdraw-details-row">
                      <span className="withdraw-details-label">Mã hồ sơ:</span>
                      <span className="withdraw-details-value">#{validation.applicationId}</span>
                    </div>
                  )}
                </div>
              )}

              <p style={{ fontSize: '0.925rem', color: '#64748B', lineHeight: 1.5, textAlign: 'center' }}>
                Cảm ơn bạn đã quan tâm đến cơ hội nghề nghiệp tại công ty. Chúc bạn luôn thành công trong các chặng đường sự nghiệp tiếp theo!
              </p>

              <div className="withdraw-actions">
                <Link to="/careers" className="withdraw-btn withdraw-btn-primary">
                  <ArrowLeft size={18} />
                  Xem các cơ hội nghề nghiệp khác
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Already Withdrawn State */}
        {!isLoading && !isSuccess && validation && validation.alreadyWithdrawn && (
          <div>
            <div className="withdraw-card-header">
              <div className="withdraw-icon-wrapper info" aria-hidden="true">
                <CheckCircle2 size={32} />
              </div>
              <h1 className="withdraw-title">Hồ sơ đã được rút</h1>
              <p className="withdraw-subtitle">
                Hồ sơ ứng tuyển này đã dừng quá trình tuyển dụng trước đó.
              </p>
            </div>
            <div className="withdraw-card-body">
              <div className="withdraw-alert withdraw-alert-info" role="status">
                <CheckCircle2 size={20} className="withdraw-alert-icon" />
                <div>
                  Hồ sơ của bạn cho vị trí <strong>{validation.positionTitle}</strong> đã ở trạng thái đã rút. Bạn không cần thực hiện thêm thao tác nào.
                </div>
              </div>

              <div className="withdraw-details-box">
                <div className="withdraw-details-row">
                  <span className="withdraw-details-label">Vị trí ứng tuyển:</span>
                  <span className="withdraw-details-value">{validation.positionTitle}</span>
                </div>
                {validation.candidateName && (
                  <div className="withdraw-details-row">
                    <span className="withdraw-details-label">Ứng viên:</span>
                    <span className="withdraw-details-value">{validation.candidateName}</span>
                  </div>
                )}
                {validation.applicationId && (
                  <div className="withdraw-details-row">
                    <span className="withdraw-details-label">Mã hồ sơ:</span>
                    <span className="withdraw-details-value">#{validation.applicationId}</span>
                  </div>
                )}
              </div>

              <div className="withdraw-actions">
                <Link to="/careers" className="withdraw-btn withdraw-btn-primary">
                  <ArrowLeft size={18} />
                  Khám phá cơ hội nghề nghiệp khác
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Invalid or Expired Token Error State */}
        {!isLoading && !isSuccess && (!validation || !validation.valid) && !validation?.alreadyWithdrawn && (
          <div>
            <div className="withdraw-card-header">
              <div className="withdraw-icon-wrapper" aria-hidden="true">
                <XCircle size={32} />
              </div>
              <h1 className="withdraw-title">Liên kết không hợp lệ</h1>
              <p className="withdraw-subtitle">
                Không thể xử lý yêu cầu rút hồ sơ với liên kết này.
              </p>
            </div>
            <div className="withdraw-card-body">
              <div className="withdraw-alert withdraw-alert-danger" role="alert">
                <XCircle size={20} className="withdraw-alert-icon" />
                <div>{errorMessage || 'Liên kết rút hồ sơ đã hết hạn hoặc không tồn tại.'}</div>
              </div>

              <p style={{ fontSize: '0.925rem', color: '#64748B', lineHeight: 1.5 }}>
                Nếu bạn cần hỗ trợ hoặc muốn rút hồ sơ ứng tuyển, vui lòng liên hệ trực tiếp với bộ phận tuyển dụng qua email để được hỗ trợ kịp thời.
              </p>

              <div className="withdraw-actions">
                <Link to="/careers" className="withdraw-btn withdraw-btn-cancel">
                  <ArrowLeft size={18} />
                  Về trang tuyển dụng
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Active Confirmation Form State */}
        {!isLoading && !isSuccess && validation && validation.valid && !validation.alreadyWithdrawn && (
          <div>
            <div className="withdraw-card-header">
              <div className="withdraw-icon-wrapper" aria-hidden="true">
                <AlertTriangle size={30} />
              </div>
              <h1 className="withdraw-title">Xác nhận rút hồ sơ ứng tuyển</h1>
              <p className="withdraw-subtitle">
                Vui lòng xác nhận quyết định dừng tham gia tuyển dụng của bạn.
              </p>
            </div>

            <div className="withdraw-card-body">
              {errorMessage && (
                <div className="withdraw-alert withdraw-alert-danger" role="alert">
                  <XCircle size={20} className="withdraw-alert-icon" />
                  <div>{errorMessage}</div>
                </div>
              )}

              <div className="withdraw-alert withdraw-alert-warning" role="alert">
                <AlertTriangle size={20} className="withdraw-alert-icon" />
                <div>
                  <strong>Lưu ý:</strong> Thao tác này sẽ dừng toàn bộ quá trình tuyển dụng đối với hồ sơ này và không thể hoàn tác.
                </div>
              </div>

              <div className="withdraw-details-box" aria-label="Thông tin hồ sơ ứng tuyển">
                <div className="withdraw-details-row">
                  <span className="withdraw-details-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Briefcase size={16} /> Vị trí ứng tuyển:
                  </span>
                  <span className="withdraw-details-value" data-testid="position-title">
                    {validation.positionTitle || 'N/A'}
                  </span>
                </div>

                {validation.candidateName && (
                  <div className="withdraw-details-row">
                    <span className="withdraw-details-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                      <User size={16} /> Ứng viên:
                    </span>
                    <span className="withdraw-details-value" data-testid="candidate-name">
                      {validation.candidateName}
                    </span>
                  </div>
                )}

                {validation.applicationId && (
                  <div className="withdraw-details-row">
                    <span className="withdraw-details-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Hash size={16} /> Mã hồ sơ:
                    </span>
                    <span className="withdraw-details-value" data-testid="application-id">
                      #{validation.applicationId}
                    </span>
                  </div>
                )}

                {validation.departmentName && (
                  <div className="withdraw-details-row">
                    <span className="withdraw-details-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Building2 size={16} /> Phòng ban:
                    </span>
                    <span className="withdraw-details-value">
                      {validation.departmentName}
                    </span>
                  </div>
                )}
              </div>

              <form onSubmit={handleConfirm}>
                <div className="withdraw-form-group">
                  <label htmlFor="withdrawal-reason" className="withdraw-form-label">
                    Lý do rút hồ sơ
                    <span className="withdraw-form-label-optional">(không bắt buộc)</span>
                  </label>
                  <textarea
                    id="withdrawal-reason"
                    className="withdraw-textarea"
                    placeholder="Chia sẻ lý do nếu bạn muốn (ví dụ: đã nhận việc nơi khác, kế hoạch thay đổi...)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={isSubmitting}
                    maxLength={500}
                    rows={3}
                  />
                </div>

                <div className="withdraw-actions">
                  <button
                    type="button"
                    className="withdraw-btn withdraw-btn-cancel"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    id="btn-cancel-withdrawal"
                  >
                    Hủy
                  </button>

                  <button
                    type="submit"
                    className="withdraw-btn withdraw-btn-danger"
                    disabled={isSubmitting}
                    id="btn-confirm-withdrawal"
                    data-testid="btn-confirm-withdrawal"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="withdraw-btn-spinner" aria-hidden="true" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      'Xác nhận rút hồ sơ'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <div className="withdraw-footer-brand">
        Hệ thống Tuyển dụng Nội bộ &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
};

export default WithdrawApplicationPage;
