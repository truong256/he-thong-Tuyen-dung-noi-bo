import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  FileText,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Edit,
  Eye,
  Plus,
} from 'lucide-react';
import { CandidateSummary, CandidateDetail } from '../types/candidate';
import candidateApi from '../api/candidate';
import CvParsingConfirmModal from '../components/candidate/CvParsingConfirmModal';
import '../styles/candidate-management.css';

export const CandidateManagementPage: React.FC = () => {
  const [candidates, setCandidates] = useState<CandidateSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [keyword, setKeyword] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('');

  // Selected candidate for confirmation modal
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null);

  useEffect(() => {
    loadCandidates();
  }, [stageFilter]);

  const loadCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await candidateApi.list({
        keyword: keyword.trim() ? keyword.trim() : undefined,
        stage: stageFilter ? stageFilter : undefined,
        size: 50,
      });
      setCandidates(response.content || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải danh sách hồ sơ ứng viên.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCandidates();
  };

  const handleOpenDetailModal = async (candidateId: number) => {
    setLoadingDetailId(candidateId);
    setError(null);
    try {
      const detail = await candidateApi.getDetail(candidateId);
      setSelectedCandidate(detail);
      setIsModalOpen(true);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Bạn không có quyền xem chi tiết hồ sơ ứng viên này.');
    } finally {
      setLoadingDetailId(null);
    }
  };

  const handleUpdateSuccess = (updated: CandidateDetail) => {
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === updated.id
          ? {
              ...c,
              fullName: updated.fullName,
              email: updated.email,
              phone: updated.phone,
              stage: updated.stage,
              parsedStatus: updated.parsedStatus,
              isParsedConfirmed: updated.isParsedConfirmed,
            }
          : c
      )
    );
  };

  const renderParseStatusBadge = (candidate: CandidateSummary) => {
    if (candidate.isParsedConfirmed) {
      return (
        <span className="badge-status badge-confirmed" title="Recruiter đã xác nhận thông tin từ CV">
          <CheckCircle size={12} /> Đã xác nhận
        </span>
      );
    }

    switch (candidate.parsedStatus) {
      case 'SUCCESS':
        return (
          <span className="badge-status badge-success" title="Đã bóc tách họ tên, email, SĐT từ CV">
            <CheckCircle size={12} /> Đã bóc tách
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="badge-status badge-partial" title="Bóc tách một phần thông tin">
            <HelpCircle size={12} /> Bóc tách một phần
          </span>
        );
      case 'UNREADABLE_OR_EMPTY':
        return (
          <span className="badge-status badge-unreadable" title="Không có lớp văn bản">
            <AlertTriangle size={12} /> Không có text
          </span>
        );
      case 'FAILED':
        return (
          <span className="badge-status badge-failed" title="Lỗi bóc tách CV">
            <AlertTriangle size={12} /> Lỗi bóc tách
          </span>
        );
      default:
        return <span className="badge-status badge-neutral">Chưa có CV</span>;
    }
  };

  const renderStageBadge = (stage: string) => {
    const map: Record<string, { label: string; class: string }> = {
      APPLIED: { label: 'Ứng tuyển', class: 'badge-neutral' },
      SCREENING: { label: 'Sàng lọc', class: 'badge-partial' },
      INTERVIEWING: { label: 'Phỏng vấn', class: 'badge-confirmed' },
      OFFERED: { label: 'Đề nghị (Offer)', class: 'badge-success' },
      HIRED: { label: 'Đã tuyển dụng', class: 'badge-success' },
      REJECTED: { label: 'Từ chối', class: 'badge-failed' },
    };
    const s = map[stage] || { label: stage, class: 'badge-neutral' };
    return <span className={`badge-status ${s.class}`}>{s.label}</span>;
  };

  return (
    <div className="candidate-page-container">
      {/* Page Header */}
      <div className="candidate-header-section">
        <div className="candidate-title-group">
          <h1>Hồ sơ Ứng viên & Pipeline</h1>
          <p className="candidate-subtitle">
            Quản lý hồ sơ ứng viên, bóc tách tự động thông tin từ CV PDF và xác nhận thông tin (S4-04).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={loadCandidates}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} style={{ display: 'inline', marginRight: '6px' }} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <form className="candidate-filter-bar" onSubmit={handleSearchSubmit}>
        <div style={{ display: 'flex', flex: 1, gap: '8px', minWidth: '240px' }}>
          <input
            type="text"
            className="candidate-search-input"
            placeholder="Tìm theo họ tên, email, số điện thoại..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button type="submit" className="btn-primary" style={{ padding: '8px 14px' }}>
            <Search size={16} /> Tìm
          </button>
        </div>

        <select
          className="candidate-select"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="">Tất cả giai đoạn tuyển dụng</option>
          <option value="APPLIED">Ứng tuyển (Applied)</option>
          <option value="SCREENING">Sàng lọc (Screening)</option>
          <option value="INTERVIEWING">Phỏng vấn (Interviewing)</option>
          <option value="OFFERED">Đề nghị (Offered)</option>
          <option value="HIRED">Đã tuyển (Hired)</option>
          <option value="REJECTED">Từ chối (Rejected)</option>
        </select>
      </form>

      {/* Error Notice */}
      {error && (
        <div className="cv-danger-banner">
          <AlertTriangle size={18} />
          <div>{error}</div>
        </div>
      )}

      {/* Main Table */}
      <div className="candidate-table-wrapper">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px auto' }} />
            <p>Đang tải danh sách hồ sơ ứng viên...</p>
          </div>
        ) : candidates.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <Users size={40} style={{ margin: '0 auto 12px auto', color: '#94a3b8' }} />
            <h3 style={{ margin: '0 0 6px 0', color: '#334155' }}>Chưa có hồ sơ ứng viên nào</h3>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              Các ứng viên ứng tuyển từ Cổng việc làm hoặc được nộp hồ sơ sẽ hiển thị tại đây.
            </p>
          </div>
        ) : (
          <table className="candidate-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Thông tin Ứng viên</th>
                <th>Số điện thoại</th>
                <th>Yêu cầu tuyển dụng</th>
                <th>Bóc tách CV</th>
                <th>Giai đoạn</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((cand) => (
                <tr key={cand.id}>
                  <td style={{ fontWeight: 600, color: '#64748b' }}>#{cand.id}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{cand.fullName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{cand.email}</div>
                  </td>
                  <td>
                    {cand.phone ? (
                      <span style={{ fontFamily: 'monospace' }}>{cand.phone}</span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa cập nhật</span>
                    )}
                  </td>
                  <td>
                    <span className="badge-status badge-neutral">
                      YCTD #{cand.requisitionId}
                    </span>
                  </td>
                  <td>{renderParseStatusBadge(cand)}</td>
                  <td>{renderStageBadge(cand.stage)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
                      onClick={() => handleOpenDetailModal(cand.id)}
                      disabled={loadingDetailId === cand.id}
                      title="Xem và xác nhận thông tin bóc tách từ CV"
                    >
                      <Edit size={13} />
                      {loadingDetailId === cand.id ? 'Đang mở...' : 'Xác nhận thông tin'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CV Parsing Confirmation & Detail Modal */}
      <CvParsingConfirmModal
        candidate={selectedCandidate}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCandidate(null);
        }}
        onSuccess={handleUpdateSuccess}
      />
    </div>
  );
};

export default CandidateManagementPage;
