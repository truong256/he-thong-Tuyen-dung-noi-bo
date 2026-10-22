import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import candidateApi, { CandidateUnifiedProfile, CandidateNote } from '../api/candidate';
import '../styles/unified-profile.css';

const stageLabels: Record<string, string> = {
  APPLIED: 'Mới ứng tuyển',
  SCREENING: 'Sàng lọc',
  SHORTLISTED: 'Qua sàng lọc',
  INTERVIEW: 'Phỏng vấn',
  OFFER: 'Đề nghị tuyển dụng',
  HIRED: 'Đã tuyển',
  REJECTED: 'Từ chối',
  WITHDRAWN: 'Đã rút hồ sơ',
};

export default function CandidateUnifiedProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const applicationId = Number(id);

  const [profile, setProfile] = useState<CandidateUnifiedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // CV Preview State
  const [cvBlobUrl, setCvBlobUrl] = useState<string | null>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvError, setCvError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tags State
  const [newTagInput, setNewTagInput] = useState('');
  const [submittingTag, setSubmittingTag] = useState(false);

  // Notes State
  const [newNoteInput, setNewNoteInput] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  const loadProfile = useCallback(async () => {
    if (!applicationId || isNaN(applicationId)) {
      setError('Mã hồ sơ ứng viên không hợp lệ.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await candidateApi.getUnifiedProfile(applicationId);
      setProfile(data);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        setError('Bạn không có quyền xem hồ sơ ứng viên này hoặc vị trí nằm ngoài phạm vi phụ trách.');
      } else if (status === 401) {
        setError('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
      } else if (status === 404) {
        setError('Không tìm thấy hồ sơ ứng viên yêu cầu.');
      } else {
        setError('Không thể tải thông tin hồ sơ ứng viên. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  const loadCv = useCallback(async () => {
    if (!applicationId || isNaN(applicationId)) return;
    setCvLoading(true);
    setCvError('');
    try {
      const { blob } = await candidateApi.getCvBlob(applicationId);
      if (cvBlobUrl) {
        URL.revokeObjectURL(cvBlobUrl);
      }
      const url = URL.createObjectURL(blob);
      setCvBlobUrl(url);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        setCvError('Bạn không có quyền truy cập tệp CV của ứng viên này.');
      } else if (status === 404) {
        setCvError('Hồ sơ chưa có tệp CV hoặc tệp không tồn tại.');
      } else {
        setCvError('Lỗi tải xem trước tệp CV.');
      }
    } finally {
      setCvLoading(false);
    }
  }, [applicationId, cvBlobUrl]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (profile) {
      void loadCv();
    }
    return () => {
      if (cvBlobUrl) {
        URL.revokeObjectURL(cvBlobUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // Handlers for CV
  const handleDownloadCv = async () => {
    try {
      const { blob, fileName } = await candidateApi.getCvBlob(applicationId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `CV_${profile?.fullName || 'Candidate'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('Không thể tải tệp CV: ' + (e?.response?.data?.message || 'Lỗi server'));
    }
  };

  const handleUploadCv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setCvLoading(true);
      const updated = await candidateApi.uploadCv(applicationId, file);
      setProfile(updated);
      showSuccess('Tải lên và cập nhật CV thành công!');
      void loadCv();
    } catch (err: any) {
      alert('Lỗi tải tệp: ' + (err?.response?.data?.message || err?.message || 'Không thành công'));
    } finally {
      setCvLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handlers for Tags
  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim() || submittingTag) return;

    setSubmittingTag(true);
    try {
      const tag = await candidateApi.addTag(applicationId, newTagInput.trim());
      setProfile((prev) => {
        if (!prev) return prev;
        const exists = prev.tags.some((t) => t.id === tag.id || t.tagName.toLowerCase() === tag.tagName.toLowerCase());
        return exists ? prev : { ...prev, tags: [...prev.tags, tag] };
      });
      setNewTagInput('');
      showSuccess(`Đã thêm nhãn "${tag.tagName}"`);
    } catch (err: any) {
      alert('Lỗi thêm nhãn: ' + (err?.response?.data?.message || 'Thao tác thất bại'));
    } finally {
      setSubmittingTag(false);
    }
  };

  const handleDeleteTag = async (tagId: number, tagName: string) => {
    if (!window.confirm(`Xác nhận xóa nhãn "${tagName}"?`)) return;

    try {
      await candidateApi.deleteTag(applicationId, tagId);
      setProfile((prev) => (prev ? { ...prev, tags: prev.tags.filter((t) => t.id !== tagId) } : prev));
      showSuccess(`Đã xóa nhãn "${tagName}"`);
    } catch (err: any) {
      alert('Lỗi xóa nhãn: ' + (err?.response?.data?.message || 'Thao tác thất bại'));
    }
  };

  // Handlers for Notes
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteInput.trim() || submittingNote) return;

    setSubmittingNote(true);
    try {
      const note = await candidateApi.addNote(applicationId, newNoteInput.trim());
      setProfile((prev) => (prev ? { ...prev, notes: [note, ...prev.notes] } : prev));
      setNewNoteInput('');
      showSuccess('Đã thêm ghi chú nội bộ');
    } catch (err: any) {
      alert('Lỗi thêm ghi chú: ' + (err?.response?.data?.message || 'Thao tác thất bại'));
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleUpdateNote = async (noteId: number) => {
    if (!editingNoteText.trim()) return;

    try {
      const updated = await candidateApi.updateNote(applicationId, noteId, editingNoteText.trim());
      setProfile((prev) =>
        prev ? { ...prev, notes: prev.notes.map((n) => (n.id === noteId ? updated : n)) } : prev
      );
      setEditingNoteId(null);
      setEditingNoteText('');
      showSuccess('Đã cập nhật ghi chú');
    } catch (err: any) {
      alert('Lỗi sửa ghi chú: ' + (err?.response?.data?.message || 'Thao tác thất bại'));
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ghi chú này?')) return;

    try {
      await candidateApi.deleteNote(applicationId, noteId);
      setProfile((prev) => (prev ? { ...prev, notes: prev.notes.filter((n) => n.id !== noteId) } : prev));
      showSuccess('Đã xóa ghi chú');
    } catch (err: any) {
      alert('Lỗi xóa ghi chú: ' + (err?.response?.data?.message || 'Thao tác thất bại'));
    }
  };

  if (loading) {
    return (
      <main className="unified-profile-container">
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <h2>Đang tải hồ sơ hợp nhất...</h2>
          <p>Hệ thống đang kiểm tra quyền và tải thông tin ứng viên.</p>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="unified-profile-container">
        <div className="profile-header-bar">
          <Link to="/recruitment/candidates" className="profile-back-btn">
            ← Quay lại danh sách hồ sơ
          </Link>
        </div>
        <div className="profile-alert-box profile-alert-error" role="alert">
          <strong>Lỗi truy cập: </strong>
          {error || 'Không tìm thấy thông tin hồ sơ ứng viên.'}
        </div>
      </main>
    );
  }

  const { permissions } = profile;

  return (
    <main className="unified-profile-container">
      {/* Header bar */}
      <div className="profile-header-bar">
        <Link to="/recruitment/candidates" className="profile-back-btn">
          ← Quay lại danh sách hồ sơ
        </Link>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => void loadProfile()}
            className="profile-back-btn"
            style={{ background: '#fff' }}
          >
            Làm mới
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="profile-alert-box profile-alert-success" role="status">
          {successMessage}
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="profile-main-card">
        <div className="profile-avatar-title">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.fullName}
              className="candidate-avatar-large"
            />
          ) : (
            <div className="candidate-avatar-large">
              {profile.fullName.trim().charAt(0).toUpperCase()}
            </div>
          )}
          <div className="profile-title-group">
            <h1>{profile.fullName}</h1>
            <div className="profile-meta-sub">
              <span>{profile.email}</span>
              {profile.phone && <span>· {profile.phone}</span>}
              <span>· {profile.currentPositionTitle} ({profile.currentRequisitionCode})</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className={`profile-stage-badge stage-badge-${profile.currentStage}`}>
            {stageLabels[profile.currentStage] || profile.currentStage}
          </span>
          {profile.withdrawn && (
            <span className="profile-stage-badge stage-badge-WITHDRAWN">
              Đã rút hồ sơ
            </span>
          )}
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="profile-content-grid">
        {/* Left Column: Personal info, History, Tags, Notes */}
        <div className="profile-left-col">
          {/* 1. Thông tin cá nhân & ứng tuyển */}
          <section className="profile-card">
            <div className="profile-card-header">
              <h2>Thông tin ứng tuyển hiện tại</h2>
            </div>
            <div className="details-kv-list">
              <div className="details-kv-item">
                <span className="details-kv-label">Vị trí ứng tuyển</span>
                <span className="details-kv-value">{profile.currentPositionTitle}</span>
              </div>
              <div className="details-kv-item">
                <span className="details-kv-label">Mã yêu cầu</span>
                <span className="details-kv-value">{profile.currentRequisitionCode}</span>
              </div>
              <div className="details-kv-item">
                <span className="details-kv-label">Phòng ban</span>
                <span className="details-kv-value">{profile.currentDepartmentName || '—'}</span>
              </div>
              <div className="details-kv-item">
                <span className="details-kv-label">Ngày nộp đơn</span>
                <span className="details-kv-value">
                  {profile.appliedAt
                    ? new Date(profile.appliedAt).toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
              <div className="details-kv-item">
                <span className="details-kv-label">Email liên hệ</span>
                <span className="details-kv-value">{profile.email}</span>
              </div>
              <div className="details-kv-item">
                <span className="details-kv-label">Số điện thoại</span>
                <span className="details-kv-value">{profile.phone || 'Chưa cập nhật'}</span>
              </div>
            </div>

            {profile.coverLetter && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                <span className="details-kv-label">Thư giới thiệu (Cover Letter)</span>
                <p style={{ margin: '6px 0 0', fontSize: 14, color: '#334155', whiteSpace: 'pre-line' }}>
                  {profile.coverLetter}
                </p>
              </div>
            )}

            {profile.withdrawalReason && (
              <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 8, borderLeft: '4px solid #64748b' }}>
                <span className="details-kv-label">Lý do rút hồ sơ</span>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>
                  {profile.withdrawalReason}
                </p>
              </div>
            )}

            {profile.rejectionReason && (
              <div style={{ marginTop: 16, padding: 12, background: '#fef2f2', borderRadius: 8, borderLeft: '4px solid #ef4444' }}>
                <span className="details-kv-label" style={{ color: '#b91c1c' }}>Lý do từ chối</span>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#991b1b' }}>
                  {profile.rejectionReason}
                </p>
              </div>
            )}
          </section>

          {/* 2. Lịch sử ứng tuyển hợp nhất */}
          <section className="profile-card">
            <div className="profile-card-header">
              <h2>
                Lịch sử ứng tuyển hợp nhất
                <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>
                  ({profile.applicationHistory.length} vị trí)
                </span>
              </h2>
            </div>

            {profile.applicationHistory.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
                Không có lịch sử ứng tuyển nào khác trong phạm vi quyền được phân công.
              </p>
            ) : (
              <div className="timeline-list">
                {profile.applicationHistory.map((item) => (
                  <div
                    key={item.applicationId}
                    className={`timeline-item ${item.current ? 'is-current' : ''}`}
                  >
                    <div className="timeline-item-header">
                      <div className="timeline-title">
                        {item.positionTitle} ({item.requisitionCode})
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {item.current && (
                          <span className="current-indicator-badge">Hồ sơ hiện tại</span>
                        )}
                        <span className={`profile-stage-badge stage-badge-${item.stage}`}>
                          {stageLabels[item.stage] || item.stage}
                        </span>
                      </div>
                    </div>

                    <div className="timeline-meta">
                      {item.departmentName && <span>Phòng: {item.departmentName}</span>}
                      {item.appliedAt && (
                        <span>
                          Nộp ngày: {new Date(item.appliedAt).toLocaleDateString('vi-VN')}
                        </span>
                      )}
                      {item.withdrawn && <span style={{ color: '#ef4444' }}>Đã rút</span>}
                    </div>

                    {!item.current && (
                      <button
                        className="timeline-switch-btn"
                        onClick={() => navigate(`/recruitment/candidates/${item.applicationId}/profile`)}
                      >
                        Xem chi tiết đợt ứng tuyển này →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3. Nhãn kỹ năng & Phân loại */}
          <section className="profile-card">
            <div className="profile-card-header">
              <h2>Nhãn kỹ năng &amp; Phân loại</h2>
              {!permissions.canManageTags && (
                <span style={{ fontSize: 12, color: '#64748b' }}>(Chỉ xem)</span>
              )}
            </div>

            <div className="tag-chips-wrapper">
              {profile.tags.length === 0 ? (
                <span style={{ color: '#64748b', fontSize: 13 }}>Chưa gắn nhãn nào.</span>
              ) : (
                profile.tags.map((t) => (
                  <span key={t.id} className="tag-chip">
                    {t.tagName}
                    {permissions.canManageTags && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteTag(t.id, t.tagName)}
                        className="tag-delete-btn"
                        title={`Xóa nhãn ${t.tagName}`}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))
              )}
            </div>

            {permissions.canManageTags && (
              <form onSubmit={handleAddTag} className="tag-input-form">
                <input
                  type="text"
                  placeholder="Thêm nhãn mới (vd: Java, React, Tiếng Anh B2)..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  className="tag-text-input"
                  maxLength={50}
                />
                <button
                  type="submit"
                  disabled={!newTagInput.trim() || submittingTag}
                  className="tag-submit-btn"
                >
                  {submittingTag ? 'Đang thêm...' : 'Thêm nhãn'}
                </button>
              </form>
            )}
          </section>

          {/* 4. Ghi chú nội bộ tuyển dụng */}
          <section className="profile-card">
            <div className="profile-card-header">
              <h2>Ghi chú nội bộ tuyển dụng</h2>
              {!permissions.canAddNotes && (
                <span style={{ fontSize: 12, color: '#64748b' }}>(Chỉ xem)</span>
              )}
            </div>

            <div className="notes-list">
              {profile.notes.length === 0 ? (
                <span style={{ color: '#64748b', fontSize: 13 }}>Chưa có ghi chú nội bộ nào.</span>
              ) : (
                profile.notes.map((n) => (
                  <div key={n.id} className="note-item">
                    <div className="note-header">
                      <span className="note-author">{n.authorName}</span>
                      <span>
                        {n.createdAt ? new Date(n.createdAt).toLocaleString('vi-VN') : ''}
                      </span>
                    </div>

                    {editingNoteId === n.id ? (
                      <div style={{ marginTop: 8 }}>
                        <textarea
                          value={editingNoteText}
                          onChange={(e) => setEditingNoteText(e.target.value)}
                          style={{ width: '100%', minHeight: 60, padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          <button
                            type="button"
                            onClick={() => void handleUpdateNote(n.id)}
                            className="note-submit-btn"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                          >
                            Lưu
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingNoteId(null)}
                            style={{ padding: '4px 10px', fontSize: 12, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6 }}
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="note-content">{n.content}</div>
                        {(n.canEdit || n.canDelete) && (
                          <div className="note-actions">
                            {n.canEdit && (
                              <button
                                type="button"
                                className="note-action-link"
                                onClick={() => {
                                  setEditingNoteId(n.id);
                                  setEditingNoteText(n.content);
                                }}
                              >
                                Sửa
                              </button>
                            )}
                            {n.canDelete && (
                              <button
                                type="button"
                                className="note-action-link delete"
                                onClick={() => void handleDeleteNote(n.id)}
                              >
                                Xóa
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            {permissions.canAddNotes && (
              <form onSubmit={handleAddNote} className="note-input-form">
                <textarea
                  placeholder="Thêm ghi chú đánh giá hoặc thông tin liên lạc cho hồ sơ này..."
                  value={newNoteInput}
                  onChange={(e) => setNewNoteInput(e.target.value)}
                  maxLength={2000}
                />
                <button
                  type="submit"
                  disabled={!newNoteInput.trim() || submittingNote}
                  className="note-submit-btn"
                >
                  {submittingNote ? 'Đang lưu...' : 'Thêm ghi chú'}
                </button>
              </form>
            )}
          </section>
        </div>

        {/* Right Column: CV Preview Viewer */}
        <div className="profile-right-col">
          <section className="profile-card" style={{ position: 'sticky', top: 20 }}>
            <div className="cv-viewer-toolbar">
              <h2>CV Đính kèm</h2>

              <div className="cv-toolbar-actions">
                <button
                  type="button"
                  onClick={handleDownloadCv}
                  disabled={!cvBlobUrl || cvLoading}
                  className="cv-action-btn primary"
                  title="Tải tệp CV về máy"
                >
                  ↓ Tải xuống CV
                </button>

                {permissions.canUploadCv && (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleUploadCv}
                      accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={cvLoading}
                      className="cv-action-btn"
                      title="Tải lên tệp CV mới thay thế"
                    >
                      ↑ Cập nhật CV
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="cv-preview-container">
              {cvLoading && (
                <div className="cv-state-box">
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                  <h3>Đang tải tệp CV...</h3>
                  <p>Vui lòng đợi trong giây lát.</p>
                </div>
              )}

              {!cvLoading && cvError && (
                <div className="cv-state-box">
                  <div style={{ fontSize: 28, marginBottom: 8, color: '#ef4444' }}>⚠️</div>
                  <h3>Không thể tải xem trước CV</h3>
                  <p>{cvError}</p>
                </div>
              )}

              {!cvLoading && !cvError && cvBlobUrl && (
                <iframe
                  src={cvBlobUrl}
                  title="Xem trước CV"
                  className="cv-preview-iframe"
                />
              )}

              {!cvLoading && !cvError && !cvBlobUrl && (
                <div className="cv-state-box">
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
                  <h3>Chưa có tệp CV</h3>
                  <p>Ứng viên chưa đính kèm tệp CV cho đợt ứng tuyển này.</p>
                  {permissions.canUploadCv && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="cv-action-btn primary"
                    >
                      Tải lên CV ngay
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
