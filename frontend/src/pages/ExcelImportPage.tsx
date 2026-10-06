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
} from 'lucide-react';
import adminApi from '../api/admin';
import {
  ExcelImportPreviewResponse,
  ExcelImportResultResponse,
  ExcelImportRowPreview,
} from '../types/excel';

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
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Table filter & pagination
  const [filterMode, setFilterMode] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
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

    try {
      const result = await adminApi.executeImportExcel(file);
      setImportResult(result);
      if (result.successCount > 0) {
        showToast(`Đã nhập thành công ${result.successCount} nhân sự vào hệ thống!`);
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

  // Determine current active step
  const currentStep = importResult ? 6 : previewData ? 5 : file ? 3 : 2;

  return (
    <div className="admin-page" data-testid="excel-import-page" style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* Toast */}
      {toastMessage && (
        <div
          className={`toast-notification ${toastMessage.type}`}
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            borderRadius: 'var(--radius-md, 8px)',
            background: toastMessage.type === 'success' ? 'var(--success-bg, #ecfdf5)' : 'var(--danger-bg, #fef2f2)',
            color: toastMessage.type === 'success' ? 'var(--success, #059669)' : 'var(--danger, #dc2626)',
            border: `1px solid ${toastMessage.type === 'success' ? 'var(--success-border, #a7f3d0)' : 'var(--danger-border, #fecaca)'}`,
            boxShadow: 'var(--shadow-md, 0 4px 16px rgba(0,0,0,0.1))',
            fontWeight: 500,
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
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
      <div
        role="region"
        aria-label="Quy trình nhập dữ liệu"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 8,
          marginBottom: 24,
          padding: '12px 16px',
          background: 'var(--bg-card, #ffffff)',
          borderRadius: 'var(--radius-md, 12px)',
          border: '1px solid var(--border-color, #e2e8f0)',
        }}
      >
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
          return (
            <div
              key={item.step}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm, 6px)',
                background: isCurrent ? 'var(--primary-50, #eff6ff)' : 'transparent',
                color: isCurrent
                  ? 'var(--primary, #2563eb)'
                  : isPassed
                  ? 'var(--success, #059669)'
                  : 'var(--text-muted, #64748b)',
                fontWeight: isCurrent ? 600 : 500,
                fontSize: '0.85rem',
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: isCurrent
                    ? 'var(--primary, #2563eb)'
                    : isPassed
                    ? 'var(--success, #059669)'
                    : 'var(--border-color, #e2e8f0)',
                  color: isCurrent || isPassed ? '#ffffff' : 'var(--text-muted, #64748b)',
                }}
              >
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
            borderRadius: 'var(--radius-md, 12px)',
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
        <div
          style={{
            background: 'var(--bg-card, #ffffff)',
            borderRadius: 'var(--radius-md, 12px)',
            border: '1px solid var(--border-color, #e2e8f0)',
            padding: 24,
            marginBottom: 24,
            boxShadow: 'var(--shadow-card, 0 4px 20px rgba(15, 23, 42, 0.04))',
          }}
        >
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: '0 0 16px', color: 'var(--text-main, #0f172a)' }}>
            1. Chọn tệp dữ liệu Excel
          </h2>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? 'var(--primary, #2563eb)' : 'var(--border-color, #cbd5e1)'}`,
              borderRadius: 'var(--radius-md, 12px)',
              background: isDragging ? 'var(--primary-50, #eff6ff)' : 'var(--bg-subtle, #f8fafc)',
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
                color: isDragging ? 'var(--primary, #2563eb)' : 'var(--text-light, #94a3b8)',
                margin: '0 auto 12px',
              }}
            />

            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main, #0f172a)', margin: '0 0 6px' }}>
              Kéo và thả tệp Excel vào đây hoặc <span style={{ color: 'var(--primary, #2563eb)' }}>duyệt tệp</span>
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
                borderRadius: 'var(--radius-sm, 8px)',
                background: 'var(--bg-subtle, #f8fafc)',
                border: '1px solid var(--border-color, #e2e8f0)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <FileSpreadsheet size={24} style={{ color: 'var(--success, #059669)' }} />
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
                color: 'var(--primary, #2563eb)',
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
        <div
          style={{
            background: 'var(--bg-card, #ffffff)',
            borderRadius: 'var(--radius-md, 12px)',
            border: '1px solid var(--border-color, #e2e8f0)',
            padding: 24,
            marginBottom: 24,
            boxShadow: 'var(--shadow-card, 0 4px 20px rgba(15, 23, 42, 0.04))',
          }}
        >
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
                style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                aria-label="Hiển thị tất cả các dòng"
              >
                Tất cả ({previewData.totalRows})
              </button>
              <button
                type="button"
                className={`btn ${filterMode === 'VALID' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setFilterMode('VALID'); setCurrentPage(1); }}
                style={{ fontSize: '0.8rem', padding: '4px 10px', color: filterMode === 'VALID' ? '#fff' : 'var(--success, #059669)' }}
                aria-label="Chỉ hiển thị dòng hợp lệ"
              >
                Hợp lệ ({previewData.validCount})
              </button>
              <button
                type="button"
                className={`btn ${filterMode === 'INVALID' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setFilterMode('INVALID'); setCurrentPage(1); }}
                style={{ fontSize: '0.8rem', padding: '4px 10px', color: filterMode === 'INVALID' ? '#fff' : 'var(--danger, #dc2626)' }}
                aria-label="Chỉ hiển thị dòng có lỗi"
              >
                Có lỗi ({previewData.invalidCount})
              </button>
            </div>
          </div>

          {/* Validation Summary Statistics Chips */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div style={{ padding: '12px 16px', background: 'var(--bg-subtle, #f8fafc)', borderRadius: 'var(--radius-sm, 8px)', border: '1px solid var(--border-color, #e2e8f0)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>Tổng số dòng phát hiện</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{previewData.totalRows}</div>
            </div>

            <div style={{ padding: '12px 16px', background: 'var(--success-bg, #ecfdf5)', borderRadius: 'var(--radius-sm, 8px)', border: '1px solid var(--success-border, #a7f3d0)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--success, #059669)' }}>Dòng hợp lệ sẵn sàng nhập</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success, #059669)' }}>{previewData.validCount}</div>
            </div>

            <div style={{ padding: '12px 16px', background: 'var(--danger-bg, #fef2f2)', borderRadius: 'var(--radius-sm, 8px)', border: '1px solid var(--danger-border, #fecaca)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--danger, #dc2626)' }}>Dòng dữ liệu có lỗi</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--danger, #dc2626)' }}>{previewData.invalidCount}</div>
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
                borderRadius: 'var(--radius-sm, 8px)',
                background: 'var(--warning-bg, #fffbeb)',
                border: '1px solid var(--warning-border, #fde68a)',
                color: 'var(--warning, #d97706)',
                fontSize: '0.85rem',
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>
                Cơ chế Partial Success: <strong>{previewData.validCount} dòng hợp lệ</strong> vẫn sẽ được nhập vào hệ thống an toàn. <strong>{previewData.invalidCount} dòng có lỗi</strong> sẽ bị bỏ qua và ghi nhận trong báo cáo.
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
                borderRadius: 'var(--radius-sm, 8px)',
                background: 'var(--danger-bg, #fef2f2)',
                border: '1px solid var(--danger-border, #fecaca)',
                color: 'var(--danger, #dc2626)',
                fontSize: '0.85rem',
              }}
            >
              <XCircle size={18} style={{ flexShrink: 0 }} />
              <span>
                Tất cả các dòng dữ liệu trong tệp đều có lỗi. Vui lòng sửa lại các lỗi được đánh dấu đỏ trước khi nhập vào hệ thống.
              </span>
            </div>
          )}

          {/* Table Wrapper (Responsive for small screens down to 360px) */}
          <div
            role="region"
            aria-label="Bảng xem trước dữ liệu Excel"
            tabIndex={0}
            style={{
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              borderRadius: 'var(--radius-sm, 8px)',
              border: '1px solid var(--border-color, #e2e8f0)',
              marginBottom: 16,
            }}
          >
            <table
              data-testid="preview-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.875rem',
                minWidth: 680,
              }}
            >
              <thead>
                <tr style={{ background: 'var(--bg-subtle, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                  <th scope="col" style={{ padding: '10px 12px', textAlign: 'center', width: 60 }}>Dòng</th>
                  <th scope="col" style={{ padding: '10px 12px', textAlign: 'left' }}>Họ và tên</th>
                  <th scope="col" style={{ padding: '10px 12px', textAlign: 'left' }}>Email</th>
                  <th scope="col" style={{ padding: '10px 12px', textAlign: 'left' }}>Phòng ban</th>
                  <th scope="col" style={{ padding: '10px 12px', textAlign: 'left' }}>Vai trò</th>
                  <th scope="col" style={{ padding: '10px 12px', textAlign: 'center', width: 110 }}>Trạng thái</th>
                  <th scope="col" style={{ padding: '10px 12px', textAlign: 'left' }}>Chi tiết lỗi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted, #64748b)' }}>
                      Không có dòng dữ liệu nào khớp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      data-testid={`row-${row.rowNumber}`}
                      style={{
                        borderBottom: '1px solid var(--border-color, #e2e8f0)',
                        background: row.valid ? 'transparent' : '#fff5f5',
                      }}
                    >
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
                        {row.rowNumber}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--text-main, #0f172a)' }}>
                        {row.data.fullName || <span style={{ color: 'var(--danger, #dc2626)', fontStyle: 'italic' }}>Trống</span>}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-body, #334155)' }}>
                        {row.data.email || <span style={{ color: 'var(--danger, #dc2626)', fontStyle: 'italic' }}>Trống</span>}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-body, #334155)' }}>
                        {row.data.department || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-body, #334155)' }}>
                        {row.data.role || 'Người phỏng vấn'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {row.valid ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full, 9999px)',
                              background: 'var(--success-bg, #ecfdf5)',
                              color: 'var(--success, #059669)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            Hợp lệ
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full, 9999px)',
                              background: 'var(--danger-bg, #fef2f2)',
                              color: 'var(--danger, #dc2626)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            Có lỗi
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--danger, #dc2626)', fontSize: '0.8rem' }}>
                        {row.errors.length > 0 ? (
                          <ul style={{ margin: 0, paddingLeft: 16 }}>
                            {row.errors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        ) : (
                          <span style={{ color: 'var(--success, #059669)' }}>Không có lỗi</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
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
              borderTop: '1px solid var(--border-color, #e2e8f0)',
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
              aria-label={`Xác nhận nhập ${previewData.validCount} nhân sự hợp lệ`}
            >
              {isImporting ? (
                <>
                  <RefreshCw size={18} className="spin-animation" />
                  <span>Đang xử lý nhập dữ liệu...</span>
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
        <div
          data-testid="import-result-card"
          style={{
            background: 'var(--bg-card, #ffffff)',
            borderRadius: 'var(--radius-md, 12px)',
            border: '1px solid var(--border-color, #e2e8f0)',
            padding: 28,
            boxShadow: 'var(--shadow-card, 0 4px 20px rgba(15, 23, 42, 0.04))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: importResult.failedCount === 0 ? 'var(--success-bg, #ecfdf5)' : 'var(--warning-bg, #fffbeb)',
                color: importResult.failedCount === 0 ? 'var(--success, #059669)' : 'var(--warning, #d97706)',
              }}
            >
              {importResult.failedCount === 0 ? <CheckCircle2 size={26} /> : <AlertTriangle size={26} />}
            </div>

            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'var(--text-main, #0f172a)' }}>
                Báo cáo kết quả nhập dữ liệu hoàn tất
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-muted, #64748b)' }}>
                {importResult.failedCount === 0
                  ? 'Toàn bộ dữ liệu nhân sự đã được khởi tạo thành công vào hệ thống.'
                  : `Đã hoàn tất xử lý với cơ chế partial success: ${importResult.successCount} dòng thành công, ${importResult.failedCount} dòng lỗi bị bỏ qua.`}
              </p>
            </div>
          </div>

          {/* Metric cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div style={{ padding: '16px', background: 'var(--bg-subtle, #f8fafc)', borderRadius: 'var(--radius-sm, 8px)', border: '1px solid var(--border-color, #e2e8f0)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>Tổng số dòng xử lý</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{importResult.totalRows}</div>
            </div>

            <div style={{ padding: '16px', background: 'var(--success-bg, #ecfdf5)', borderRadius: 'var(--radius-sm, 8px)', border: '1px solid var(--success-border, #a7f3d0)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--success, #059669)' }}>Nhập thành công</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--success, #059669)' }}>{importResult.successCount}</div>
            </div>

            <div style={{ padding: '16px', background: 'var(--danger-bg, #fef2f2)', borderRadius: 'var(--radius-sm, 8px)', border: '1px solid var(--danger-border, #fecaca)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--danger, #dc2626)' }}>Thất bại / Bỏ qua</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--danger, #dc2626)' }}>{importResult.failedCount}</div>
            </div>
          </div>

          {/* Detail of failed rows if any */}
          {importResult.failedRows && importResult.failedRows.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 12px', color: 'var(--danger, #dc2626)' }}>
                Danh sách các dòng không thể nhập ({importResult.failedRows.length} dòng):
              </h3>

              <div
                style={{
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  borderRadius: 'var(--radius-sm, 8px)',
                  border: '1px solid var(--danger-border, #fecaca)',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--danger-bg, #fef2f2)', borderBottom: '1px solid var(--danger-border, #fecaca)' }}>
                      <th scope="col" style={{ padding: '8px 12px', textAlign: 'center', width: 60 }}>Dòng</th>
                      <th scope="col" style={{ padding: '8px 12px', textAlign: 'left' }}>Họ và tên</th>
                      <th scope="col" style={{ padding: '8px 12px', textAlign: 'left' }}>Email</th>
                      <th scope="col" style={{ padding: '8px 12px', textAlign: 'left' }}>Lý do lỗi chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.failedRows.map((fail) => (
                      <tr key={fail.rowNumber} style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>{fail.rowNumber}</td>
                        <td style={{ padding: '8px 12px' }}>{fail.data?.fullName || '—'}</td>
                        <td style={{ padding: '8px 12px' }}>{fail.data?.email || '—'}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--danger, #dc2626)' }}>
                          {fail.errors.join('; ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action buttons at finish */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
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