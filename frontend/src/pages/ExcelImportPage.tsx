import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowLeft,
  RefreshCw,
  FileCheck,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import adminApi from '../api/admin';
import {
  ExcelImportPreviewResponse,
  ExcelImportResultResponse,
  ExcelImportRowPreview,
  parseAndFormatRoles,
} from '../types/excel';
import '../styles/excel-import.css';
import { resetActivity } from '../utils/idleTracker';

export const ExcelImportPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Process states
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Data states
  const [previewData, setPreviewData] = useState<ExcelImportPreviewResponse | null>(null);
  const [importResult, setImportResult] = useState<ExcelImportResultResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Table filter & pagination
  const [filterMode, setFilterMode] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const showToast = (text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Step 1: Download Template
  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    setErrorMessage(null);
    try {
      const blob = await adminApi.downloadImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Mau_nhap_nhan_su.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Đã tải tệp Excel mẫu thành công!');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể tải file mẫu từ máy chủ. Vui lòng thử lại sau.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // Reset file selection
  const handleReset = () => {
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
    setErrorMessage(null);
    setCurrentPage(1);
    setFilterMode('ALL');
    setToastMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Validate and select file
  const processSelectedFile = async (selectedFile: File) => {
    setErrorMessage(null);
    setImportResult(null);

    const validExtensions = ['.xlsx', '.xls'];
    const fileNameLower = selectedFile.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => fileNameLower.endsWith(ext));

    if (!hasValidExt) {
      setErrorMessage('Định dạng tệp không được hỗ trợ. Vui lòng chỉ chọn tệp Excel (.xlsx hoặc .xls).');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMessage('Dung lượng tệp vượt quá giới hạn cho phép (tối đa 10 MB).');
      return;
    }

    setFile(selectedFile);
    setIsPreviewing(true);
    setCurrentPage(1);

    try {
      const preview = await adminApi.previewImportExcel(selectedFile);
      setPreviewData(preview);
      resetActivity();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể đọc tệp Excel. Vui lòng kiểm tra lại định dạng tệp.';
      setErrorMessage(msg);
      setPreviewData(null);
      showToast(msg, 'error');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processSelectedFile(selected);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processSelectedFile(droppedFile);
    }
  };

  // Step 5: Execute Import
  const handleExecuteImport = async () => {
    if (!file || !previewData || previewData.validCount === 0 || isImporting) {
      return;
    }

    setIsImporting(true);
    setErrorMessage(null);
    resetActivity();

    try {
      const result = await adminApi.executeImportExcel(file);
      setImportResult(result);
      resetActivity();
      if (result.successCount > 0) {
        showToast(`Đã nhập thành công ${result.successCount} nhân sự vào hệ thống!`, 'success');
      } else {
        showToast('Không có nhân sự nào được nhập vào hệ thống.', 'warning');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Quá trình nhập dữ liệu thất bại. Vui lòng thử lại sau.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Filtered rows for table
  const displayedRows: ExcelImportRowPreview[] = (previewData?.rows || []).filter((r) => {
    if (filterMode === 'VALID') return r.valid;
    if (filterMode === 'INVALID') return !r.valid;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(displayedRows.length / pageSize));
  const paginatedRows = displayedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Determine current active step (1 to 6)
  const currentStep = importResult
    ? 6
    : isImporting
    ? 5
    : previewData
    ? (previewData.invalidCount > 0 ? 4 : 5)
    : file
    ? 3
    : 2;

  return (
    <div className="excel-import-container" data-testid="excel-import-page">
      {/* Floating Standard Toast Notification (Fixed Top-Right, Auto Height, Never blocks Stepper) */}
      {toastMessage && (
        <div
          className={`excel-import-toast ${toastMessage.type}`}
          role="status"
          aria-live="polite"
          data-testid="toast-notification"
        >
          <div className="toast-content">
            {toastMessage.type === 'success' && <CheckCircle2 size={18} />}
            {toastMessage.type === 'error' && <AlertCircle size={18} />}
            {toastMessage.type === 'warning' && <AlertTriangle size={18} />}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            className="toast-close-btn"
            onClick={() => setToastMessage(null)}
            aria-label="Đóng thông báo"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header & Back link */}
      <div style={{ marginBottom: 24 }}>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => navigate('/admin/users')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12, padding: '6px 12px', fontSize: '0.875rem' }}
          aria-label="Quay lại danh sách người dùng"
        >
          <ArrowLeft size={16} />
          <span>Quay lại Quản lý tài khoản</span>
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: 0 }}>
              Nhập danh sách nhân sự từ Excel
            </h1>
            <p style={{ color: 'var(--text-muted, #64748b)', margin: '4px 0 0', fontSize: '0.95rem' }}>
              Tạo hàng loạt tài khoản người dùng nội bộ từ tệp Excel chuẩn với kiểm tra dữ liệu theo từng dòng và hỗ trợ partial success.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-outline"
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTemplate || isImporting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            data-testid="btn-download-template"
            aria-label="Tải tệp Excel mẫu"
          >
            {isDownloadingTemplate ? <RefreshCw size={16} className="spin-animation" /> : <Download size={16} />}
            <span>{isDownloadingTemplate ? 'Đang tải file mẫu...' : 'Tải tệp Excel mẫu'}</span>
          </button>
        </div>
      </div>

      {/* 6-Step Stepper Bar */}
      <div className="excel-import-stepper" role="region" aria-label="Quy trình nhập dữ liệu">
        {[
          { step: 1, title: 'Tải mẫu' },
          { step: 2, title: 'Chọn tệp' },
          { step: 3, title: 'Xem trước' },
          { step: 4, title: 'Kiểm tra lỗi' },
          { step: 5, title: 'Xác nhận nhập' },
          { step: 6, title: 'Kết quả' },
        ].map((item) => {
          const isPassed = currentStep > item.step;
          const isCurrent = currentStep === item.step;
          const stateClass = isCurrent ? 'current' : isPassed ? 'passed' : 'upcoming';
          return (
            <div key={item.step} className={`excel-import-step-item ${stateClass}`}>
              <div className="excel-import-step-circle">
                {isPassed ? '✓' : item.step}
              </div>
              <span style={{ whiteSpace: 'nowrap' }}>{item.title}</span>
            </div>
          );
        })}
      </div>

      {/* Error alert banner */}
      {errorMessage && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '14px 16px',
            marginBottom: 20,
            borderRadius: '12px',
            background: 'var(--danger-bg, #fef2f2)',
            border: '1px solid var(--danger-border, #fecaca)',
            color: 'var(--danger, #dc2626)',
            fontSize: '0.9rem',
          }}
        >
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Đã xảy ra lỗi:</strong>
            <div style={{ marginTop: 2 }}>{errorMessage}</div>
          </div>
        </div>
      )}

      {/* Section 1: File Picker & Upload Card */}
      {!importResult && (
        <div className="excel-import-card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: '0 0 16px', color: 'var(--text-main, #0f172a)' }}>
            1. Chọn tệp dữ liệu Excel
          </h2>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? 'var(--primary, #2563eb)' : '#cbd5e1'}`,
              borderRadius: '12px',
              background: isDragging ? '#eff6ff' : '#f8fafc',
              padding: '36px 20px',
              textAlign: 'center',
              cursor: isImporting || isPreviewing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <input
              ref={fileInputRef}
              id="excel-file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileInputChange}
              disabled={isImporting || isPreviewing}
              style={{ display: 'none' }}
              data-testid="excel-file-input"
              aria-label="Chọn file Excel"
            />

            <UploadCloud
              size={48}
              style={{
                color: isDragging ? '#2563eb' : '#94a3b8',
                margin: '0 auto 12px',
              }}
            />

            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main, #0f172a)', margin: '0 0 6px' }}>
              Kéo và thả tệp Excel vào đây hoặc <span style={{ color: '#2563eb' }}>duyệt tệp</span>
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', margin: 0 }}>
              Hỗ trợ định dạng .xlsx, .xls • Dung lượng tối đa: 10 MB
            </p>
          </div>

          {/* Selected File Details */}
          {file && (
            <div
              style={{
                marginTop: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                padding: '12px 16px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <FileSpreadsheet size={24} style={{ color: '#059669' }} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)', fontSize: '0.95rem' }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                    {(file.size / 1024).toFixed(1)} KB • Tệp sẵn sàng phân tích
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-outline"
                onClick={handleReset}
                disabled={isImporting || isPreviewing}
                style={{ fontSize: '0.85rem', padding: '6px 14px' }}
                aria-label="Bỏ chọn tệp hiện tại"
              >
                Bỏ chọn tệp
              </button>
            </div>
          )}

          {isPreviewing && (
            <div
              role="status"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 16,
                color: '#2563eb',
                fontWeight: 500,
                fontSize: '0.9rem',
              }}
            >
              <RefreshCw size={18} className="spin-animation" />
              <span>Đang phân tích cấu trúc và kiểm tra dữ liệu từng dòng...</span>
            </div>
          )}
        </div>
      )}

      {/* Section 2: Preview & Validation Table */}
      {previewData && !importResult && (
        <div className="excel-import-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, color: 'var(--text-main, #0f172a)' }}>
              2. Xem trước & Kiểm tra dữ liệu từng dòng
            </h2>

            {/* Filter Toggle */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn ${filterMode === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setFilterMode('ALL'); setCurrentPage(1); }}
                style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                aria-label="Hiển thị tất cả các dòng"
              >
                Tất cả ({previewData.totalRows})
              </button>
              <button
                type="button"
                className={`btn ${filterMode === 'VALID' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setFilterMode('VALID'); setCurrentPage(1); }}
                style={{ fontSize: '0.8rem', padding: '4px 12px', color: filterMode === 'VALID' ? '#fff' : '#059669' }}
                aria-label="Chỉ hiển thị dòng hợp lệ"
              >
                Hợp lệ ({previewData.validCount})
              </button>
              <button
                type="button"
                className={`btn ${filterMode === 'INVALID' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setFilterMode('INVALID'); setCurrentPage(1); }}
                style={{ fontSize: '0.8rem', padding: '4px 12px', color: filterMode === 'INVALID' ? '#fff' : '#dc2626' }}
                aria-label="Chỉ hiển thị dòng có lỗi"
              >
                Có lỗi ({previewData.invalidCount})
              </button>
            </div>
          </div>

          {/* Validation Summary Statistics Chips */}
          <div className="excel-import-kpi-grid">
            <div className="excel-import-kpi-card">
              <div className="excel-import-kpi-title">Tổng số dòng phát hiện</div>
              <div className="excel-import-kpi-value">{previewData.totalRows}</div>
            </div>

            <div className="excel-import-kpi-card success">
              <div className="excel-import-kpi-title">Dòng hợp lệ sẵn sàng nhập</div>
              <div className="excel-import-kpi-value">{previewData.validCount}</div>
            </div>

            <div className="excel-import-kpi-card danger">
              <div className="excel-import-kpi-title">Dòng dữ liệu có lỗi</div>
              <div className="excel-import-kpi-value">{previewData.invalidCount}</div>
            </div>
          </div>

          {/* Business rule info notice */}
          {previewData.invalidCount > 0 && previewData.validCount > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                marginBottom: 16,
                borderRadius: '8px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                color: '#d97706',
                fontSize: '0.85rem',
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>
                Cơ chế Partial Success: <strong>{previewData.validCount} dòng hợp lệ</strong> sẵn sàng được nhập vào hệ thống. <strong>{previewData.invalidCount} dòng có lỗi</strong> sẽ bị bỏ qua và ghi nhận trong báo cáo.
              </span>
            </div>
          )}

          {previewData.validCount === 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                marginBottom: 16,
                borderRadius: '8px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: '0.85rem',
              }}
            >
              <XCircle size={18} style={{ flexShrink: 0 }} />
              <span>
                Tất cả các dòng dữ liệu trong tệp đều có lỗi. Vui lòng sửa lại các lỗi được đánh dấu trước khi nhập vào hệ thống.
              </span>
            </div>
          )}

          {/* Table Wrapper (Responsive for small screens) */}
          <div className="excel-table-container" role="region" aria-label="Bảng xem trước dữ liệu Excel" tabIndex={0}>
            <table className="excel-table" data-testid="preview-table">
              <thead>
                <tr>
                  <th scope="col" className="center" style={{ width: 60 }}>Dòng</th>
                  <th scope="col" style={{ minWidth: 150 }}>Họ và tên</th>
                  <th scope="col" style={{ minWidth: 190 }}>Email</th>
                  <th scope="col" style={{ minWidth: 130 }}>Phòng ban</th>
                  <th scope="col" style={{ minWidth: 170 }}>Vai trò</th>
                  <th scope="col" className="center" style={{ width: 110 }}>Trạng thái</th>
                  <th scope="col" style={{ minWidth: 220 }}>Chi tiết lỗi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                      Không có dòng dữ liệu nào khớp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => {
                    const roleItems = parseAndFormatRoles(row.data.role);
                    return (
                      <tr
                        key={row.rowNumber}
                        data-testid={`row-${row.rowNumber}`}
                        className={row.valid ? '' : 'row-invalid'}
                      >
                        <td className="center" style={{ fontWeight: 600, color: '#64748b' }}>
                          {row.rowNumber}
                        </td>
                        <td style={{ fontWeight: 500, color: '#0f172a' }}>
                          {row.data.fullName || <span style={{ color: '#dc2626', fontStyle: 'italic' }}>Trống</span>}
                        </td>
                        <td style={{ color: '#334155' }}>
                          {row.data.email || <span style={{ color: '#dc2626', fontStyle: 'italic' }}>Trống</span>}
                        </td>
                        <td style={{ color: '#334155' }}>
                          {row.data.department || '—'}
                        </td>
                        <td>
                          <div className="role-chip-group">
                            {roleItems.map((item, idx) => (
                              <span
                                key={idx}
                                className={`role-chip ${item.code === 'ADMIN' ? 'admin' : item.code === 'HR_MANAGER' ? 'hr' : ''}`}
                              >
                                {item.label}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="center">
                          <span className={`badge-status ${row.valid ? 'valid' : 'invalid'}`}>
                            {row.valid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {row.valid ? 'Hợp lệ' : 'Có lỗi'}
                          </span>
                        </td>
                        <td>
                          {row.errors.length > 0 ? (
                            <ul className="excel-error-list">
                              {row.errors.map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          ) : (
                            <span style={{ color: '#059669', fontSize: '0.8rem', fontWeight: 500 }}>
                              Không có lỗi
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Hiển thị dòng {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, displayedRows.length)} trong tổng số {displayedRows.length} dòng
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                  aria-label="Trang trước"
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: '0.85rem', padding: '0 8px' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                  aria-label="Trang sau"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Section 3: Action Buttons / Confirmation */}
          <div
            style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleReset}
              disabled={isImporting}
              aria-label="Hủy bỏ và chọn tệp khác"
            >
              Hủy bỏ & Chọn lại tệp
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExecuteImport}
              disabled={previewData.validCount === 0 || isImporting}
              data-testid="btn-confirm-import"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                fontSize: '0.95rem',
                fontWeight: 600,
              }}
              aria-label={
                previewData.validCount > 0
                  ? `Xác nhận nhập ${previewData.validCount} nhân sự hợp lệ`
                  : 'Không có nhân sự hợp lệ để nhập'
              }
            >
              {isImporting ? (
                <>
                  <RefreshCw size={18} className="spin-animation" />
                  <span>Đang nhập...</span>
                </>
              ) : (
                <>
                  <FileCheck size={18} />
                  <span>
                    {previewData.validCount > 0
                      ? `Nhập ${previewData.validCount} nhân sự hợp lệ`
                      : 'Không có dòng hợp lệ'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Section 4: Import Result Report (Step 6) */}
      {importResult && (
        <div className="excel-import-card" data-testid="import-result-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: importResult.failedCount === 0 ? '#ecfdf5' : '#fffbeb',
                color: importResult.failedCount === 0 ? '#059669' : '#d97706',
                flexShrink: 0,
              }}
            >
              {importResult.failedCount === 0 ? <CheckCircle2 size={26} /> : <AlertTriangle size={26} />}
            </div>

            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'var(--text-main, #0f172a)' }}>
                Báo cáo kết quả nhập dữ liệu hoàn tất
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#64748b' }}>
                {importResult.failedCount === 0
                  ? `Toàn bộ ${importResult.successCount} nhân sự đã được nhập thành công vào hệ thống.`
                  : `Đã hoàn tất xử lý với cơ chế partial success: ${importResult.successCount} dòng thành công, ${importResult.failedCount} dòng lỗi bị bỏ qua.`}
              </p>
            </div>
          </div>

          {/* Metric cards */}
          <div className="excel-import-kpi-grid">
            <div className="excel-import-kpi-card">
              <div className="excel-import-kpi-title">Tổng số dòng xử lý</div>
              <div className="excel-import-kpi-value">{importResult.totalRows}</div>
            </div>

            <div className="excel-import-kpi-card success">
              <div className="excel-import-kpi-title">Nhập thành công</div>
              <div className="excel-import-kpi-value">{importResult.successCount}</div>
            </div>

            <div className="excel-import-kpi-card danger">
              <div className="excel-import-kpi-title">Thất bại / Bỏ qua</div>
              <div className="excel-import-kpi-value">{importResult.failedCount}</div>
            </div>
          </div>

          {/* Detail of failed rows with all 6 columns as required */}
          {importResult.failedRows && importResult.failedRows.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 12px', color: '#dc2626' }}>
                Danh sách các dòng không thể nhập ({importResult.failedRows.length} dòng):
              </h3>

              <div className="excel-table-container">
                <table className="excel-table" data-testid="failed-rows-table">
                  <thead>
                    <tr>
                      <th scope="col" className="center" style={{ width: 60 }}>Dòng</th>
                      <th scope="col" style={{ minWidth: 150 }}>Họ tên</th>
                      <th scope="col" style={{ minWidth: 190 }}>Email</th>
                      <th scope="col" style={{ minWidth: 130 }}>Phòng ban</th>
                      <th scope="col" style={{ minWidth: 160 }}>Vai trò</th>
                      <th scope="col" style={{ minWidth: 220 }}>Chi tiết lỗi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.failedRows.map((fail) => {
                      const roleItems = parseAndFormatRoles(fail.data?.role);
                      return (
                        <tr key={fail.rowNumber} className="row-invalid">
                          <td className="center" style={{ fontWeight: 600, color: '#dc2626' }}>
                            {fail.rowNumber}
                          </td>
                          <td style={{ fontWeight: 500, color: '#0f172a' }}>
                            {fail.data?.fullName || <span style={{ color: '#dc2626', fontStyle: 'italic' }}>—</span>}
                          </td>
                          <td style={{ color: '#334155' }}>
                            {fail.data?.email || <span style={{ color: '#dc2626', fontStyle: 'italic' }}>—</span>}
                          </td>
                          <td style={{ color: '#334155' }}>
                            {fail.data?.department || '—'}
                          </td>
                          <td>
                            <div className="role-chip-group">
                              {roleItems.map((item, idx) => (
                                <span
                                  key={idx}
                                  className={`role-chip ${item.code === 'ADMIN' ? 'admin' : item.code === 'HR_MANAGER' ? 'hr' : ''}`}
                                >
                                  {item.label}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <ul className="excel-error-list">
                              {fail.errors.map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action buttons at finish */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleReset}
              data-testid="btn-import-another"
              aria-label="Nhập thêm tệp Excel khác"
            >
              Nhập thêm tệp khác
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/admin/users')}
              data-testid="btn-back-users"
              aria-label="Quay lại danh sách người dùng"
            >
              Quay lại danh sách người dùng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelImportPage;