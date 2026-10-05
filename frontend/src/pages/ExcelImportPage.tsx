import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties } from 'react';

type Workbook = {
  SheetNames: string[];
  Sheets: Record<string, unknown>;
};

type ExcelLibrary = {
  read: (data: ArrayBuffer) => Workbook;
  writeFile: (workbook: Workbook, filename: string) => void;
  utils: {
    sheet_to_json: (
      sheet: unknown,
      options: {
        header: number;
        raw: boolean;
        defval: string;
        blankrows: boolean;
        range: number;
      }
    ) => string[][];
    aoa_to_sheet: (data: string[][]) => unknown;
    book_new: () => Workbook;
    book_append_sheet: (
      workbook: Workbook,
      sheet: unknown,
      name: string
    ) => void;
  };
};

type PreviewRow = {
  line: number;
  values: string[];
};

const requiredHeaders = [
  'Mã nhân sự',
  'Họ tên',
  'Email',
  'Số điện thoại',
];

const cardStyle: CSSProperties = {
  background: '#fff',
  border: '1px solid #dbe2ea',
  borderRadius: 12,
  padding: 24,
  marginTop: 20,
};

const cellStyle: CSSProperties = {
  border: '1px solid #dbe2ea',
  padding: '10px 12px',
  textAlign: 'left',
  whiteSpace: 'pre-wrap',
  minWidth: 140,
};

const buttonStyle: CSSProperties = {
  padding: '8px 16px',
  cursor: 'pointer',
};

function getExcelLibrary() {
  const excel = (
    window as Window & { XLSX?: ExcelLibrary }
  ).XLSX;

  if (!excel) {
    throw new Error(
      'Chưa tải được thư viện Excel. Vui lòng tải lại trang.'
    );
  }

  return excel;
}

export default function ExcelImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [sheetName, setSheetName] = useState('');
  const [page, setPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    success: number;
    skipped: number;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  const importRef = useRef(0);

  useEffect(() => {
    return () => {
      ++requestRef.current;
      ++importRef.current;
    };
  }, []);

  function resetData() {
    ++requestRef.current;
    ++importRef.current;
    setFile(null);
    setError('');
    setHeaders([]);
    setRows([]);
    setSheetName('');
    setLoading(false);
    setImporting(false);
    setProgress(0);
    setResult(null);
    setPage(1);
  }

  function handleClear() {
    resetData();

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  function handleDownloadTemplate() {
    try {
      const excel = getExcelLibrary();
      const workbook = excel.utils.book_new();
      const sheet = excel.utils.aoa_to_sheet([
        requiredHeaders,
        ['NS001', 'Nguyễn Văn An', 'an@example.com', '0901234567'],
      ]);

      excel.utils.book_append_sheet(workbook, sheet, 'Nhân sự');
      excel.writeFile(workbook, 'Mau_nhap_nhan_su.xlsx');
      setError('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không tạo được file mẫu.'
      );
    }
  }

  async function handleSelectFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];
    resetData();
    const requestId = requestRef.current;

    if (!selectedFile) return;

    if (!/\.(xlsx|xls)$/i.test(selectedFile.name)) {
      setError('Vui lòng chọn file .xlsx hoặc .xls.');
      event.target.value = '';
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('Dung lượng file không được vượt quá 10 MB.');
      event.target.value = '';
      return;
    }

    setFile(selectedFile);
    setLoading(true);

    try {
      const excel = getExcelLibrary();
      const buffer = await selectedFile.arrayBuffer();

      if (requestId !== requestRef.current) return;

      const workbook = excel.read(buffer);
      const firstSheet = workbook.SheetNames[0];

      if (!firstSheet) {
        throw new Error('File Excel không có sheet dữ liệu.');
      }

      // Giữ dòng trống để số dòng báo lỗi khớp với Excel.
      const data = excel.utils.sheet_to_json(
        workbook.Sheets[firstSheet],
        {
          header: 1,
          raw: false,
          defval: '',
          blankrows: true,
          range: 0,
        }
      );

      const headerIndex = data.findIndex((row) =>
        row.some((value) => String(value ?? '').trim() !== '')
      );

      if (headerIndex < 0) {
        throw new Error('Sheet đầu tiên không có dữ liệu.');
      }

      const columnCount = data.reduce(
        (max, row) => Math.max(max, row.length),
        0
      );

      const nextHeaders = Array.from(
        { length: columnCount },
        (_, index) =>
          String(data[headerIndex][index] ?? '').trim()
      );

      const nextRows = data
        .slice(headerIndex + 1)
        .map((values, index) => ({
          line: headerIndex + index + 2,
          values: values.map((value) => String(value ?? '').trim()),
        }))
        .filter((row) => row.values.some((value) => value !== ''));

      setHeaders(nextHeaders);
      setRows(nextRows);
      setSheetName(firstSheet);
    } catch (err) {
      if (requestId !== requestRef.current) return;

      setError(
        err instanceof Error ? err.message : 'Không đọc được file Excel.'
      );
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }

  const missingHeaders = requiredHeaders.filter(
    (name) => !headers.includes(name)
  );

  const duplicateHeaders = requiredHeaders.filter(
    (name) => headers.filter((header) => header === name).length > 1
  );

  const schemaValid =
    missingHeaders.length === 0 && duplicateHeaders.length === 0;

  function getValue(row: PreviewRow, name: string) {
    return row.values[headers.indexOf(name)] ?? '';
  }

  const codeCounts = new Map<string, number>();

  rows.forEach((row) => {
    const code = getValue(row, 'Mã nhân sự').toLowerCase();

    if (code) {
      codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
    }
  });

  const checkedRows = rows.map((row) => {
    const errors: string[] = [];

    if (schemaValid) {
      const code = getValue(row, 'Mã nhân sự');
      const name = getValue(row, 'Họ tên');
      const email = getValue(row, 'Email');
      const phone = getValue(row, 'Số điện thoại');

      if (!code) {
        errors.push('Thiếu mã nhân sự');
      } else if ((codeCounts.get(code.toLowerCase()) ?? 0) > 1) {
        errors.push('Mã nhân sự trùng trong file');
      }

      if (!name) errors.push('Thiếu họ tên');

      if (!email) {
        errors.push('Thiếu email');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Email không hợp lệ');
      }

      if (!phone) {
        errors.push('Thiếu số điện thoại');
      } else if (!/^\+?\d{9,15}$/.test(phone)) {
        errors.push('Số điện thoại không hợp lệ');
      }
    }

    return { ...row, errors };
  });

  const validCount = schemaValid
    ? checkedRows.filter((row) => row.errors.length === 0).length
    : 0;

  const invalidCount = schemaValid ? rows.length - validCount : 0;
  const pageCount = Math.max(1, Math.ceil(rows.length / 20));
  const visibleRows = checkedRows.slice((page - 1) * 20, page * 20);
  const busy = loading || importing;

  async function handleImportDemo() {
    if (busy || !schemaValid || validCount === 0 || result) return;

    const importId = ++importRef.current;
    const success = validCount;
    const skipped = invalidCount;

    setImporting(true);
    setProgress(0);
    setResult(null);

    // Mô phỏng tiến trình để thử giao diện frontend.
    for (let value = 10; value <= 100; value += 10) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 200);
      });

      if (importId !== importRef.current) return;
      setProgress(value);
    }

    setResult({ success, skipped });
    setImporting(false);
  }

  function handleCancelImport() {
    ++importRef.current;
    setImporting(false);
    setProgress(0);
    setResult(null);
  }

  return (
    <section style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1>Nhập nhân sự từ Excel</h1>
      <p>Tải mẫu, chọn file và kiểm tra dữ liệu trước khi nhập.</p>

      <div style={cardStyle}>
        <label htmlFor="excel-file">
          <strong>Chọn file Excel</strong>
        </label>

        <p>Định dạng .xlsx, .xls. Dung lượng tối đa 10 MB.</p>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          disabled={busy}
          style={buttonStyle}
        >
          Tải file mẫu
        </button>

        <input
          ref={inputRef}
          id="excel-file"
          type="file"
          accept=".xlsx,.xls"
          onChange={handleSelectFile}
          disabled={busy}
          style={{ display: 'block', marginTop: 16, maxWidth: '100%' }}
        />

        {file ? (
          <div>
            <p><strong>File đã chọn:</strong> {file.name}</p>
            <p>
              <strong>Dung lượng:</strong>{' '}
              {(file.size / 1024).toFixed(1)} KB
            </p>

            <button
              type="button"
              onClick={handleClear}
              disabled={importing}
              style={buttonStyle}
            >
              Bỏ chọn file
            </button>
          </div>
        ) : (
          <p>Chưa chọn file Excel.</p>
        )}

        {loading && <p role="status">Đang đọc dữ liệu Excel...</p>}
        {error && (
          <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>
        )}
      </div>

      {headers.length > 0 && (
        <div style={cardStyle}>
          <h2>Xem trước dữ liệu</h2>
          <p>
            <strong>Sheet:</strong> {sheetName}
            {' — '}
            <strong>Số dòng:</strong> {rows.length}
          </p>

          <p>
            Dòng có dữ liệu đầu tiên được dùng làm tiêu đề.
            Quy tắc kiểm tra hiện dùng theo file mẫu tạm.
          </p>

          {missingHeaders.length > 0 && (
            <p role="alert" style={{ color: '#b91c1c' }}>
              Thiếu cột: {missingHeaders.join(', ')}. Vui lòng dùng file mẫu.
            </p>
          )}

          {duplicateHeaders.length > 0 && (
            <p role="alert" style={{ color: '#b91c1c' }}>
              Tiêu đề cột bị trùng: {duplicateHeaders.join(', ')}.
            </p>
          )}

          {schemaValid && (
            <p>
              <strong>Hợp lệ:</strong> {validCount}
              {' — '}
              <strong>Có lỗi:</strong> {invalidCount}
            </p>
          )}

          <div
            role="region"
            aria-label="Bảng xem trước Excel"
            tabIndex={0}
            style={{ overflow: 'auto', maxHeight: 500 }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th scope="col" style={cellStyle}>Dòng Excel</th>

                  {headers.map((header, index) => (
                    <th scope="col" key={index} style={cellStyle}>
                      {header || `Cột ${index + 1}`}
                    </th>
                  ))}

                  <th scope="col" style={cellStyle}>Lỗi dữ liệu</th>
                </tr>
              </thead>

              <tbody>
                {visibleRows.map((row) => (
                  <tr
                    key={row.line}
                    style={{
                      background: row.errors.length > 0 ? '#fff1f2' : '#fff',
                    }}
                  >
                    <td style={cellStyle}>{row.line}</td>

                    {headers.map((_, index) => (
                      <td key={index} style={cellStyle}>
                        {row.values[index] ?? ''}
                      </td>
                    ))}

                    <td
                      style={{
                        ...cellStyle,
                        color:
                          !schemaValid || row.errors.length > 0
                            ? '#b91c1c'
                            : '#15803d',
                      }}
                    >
                      {!schemaValid
                        ? 'Chưa kiểm tra: sai cấu trúc cột'
                        : row.errors.join('; ') || 'Hợp lệ'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length === 0 ? (
            <p>File chỉ có tiêu đề, chưa có dòng dữ liệu.</p>
          ) : (
            <div
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                flexWrap: 'wrap',
                marginTop: 16,
              }}
            >
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                style={buttonStyle}
              >
                Trang trước
              </button>

              <span>Trang {page}/{pageCount} — tối đa 20 dòng/trang</span>

              <button
                type="button"
                disabled={page === pageCount}
                onClick={() => setPage(page + 1)}
                style={buttonStyle}
              >
                Trang sau
              </button>
            </div>
          )}
        </div>
      )}

      {headers.length > 0 && (
        <div style={cardStyle}>
          <h2>Nhập dữ liệu — mô phỏng frontend</h2>
          <p>Chưa kết nối backend. Dữ liệu sẽ không được lưu vào hệ thống.</p>

          {schemaValid && invalidCount > 0 && (
            <p>
              Khi mô phỏng, {invalidCount} dòng có lỗi sẽ được bỏ qua.
              Bạn có thể sửa file rồi chọn lại.
            </p>
          )}

          <button
            type="button"
            onClick={handleImportDemo}
            disabled={busy || !schemaValid || validCount === 0 || !!result}
            style={buttonStyle}
          >
            {importing ? 'Đang mô phỏng...' : 'Nhập mô phỏng'}
          </button>

          {importing && (
            <div style={{ marginTop: 16 }}>
              <label htmlFor="import-progress">
                Tiến trình mô phỏng: {progress}%
              </label>

              <progress
                id="import-progress"
                value={progress}
                max={100}
                style={{ display: 'block', width: '100%', margin: '12px 0' }}
              />

              <button
                type="button"
                onClick={handleCancelImport}
                style={buttonStyle}
              >
                Hủy mô phỏng
              </button>
            </div>
          )}

          {result && (
            <div role="status" style={{ marginTop: 16 }}>
              <strong>Hoàn tất mô phỏng</strong>
              <p>Dòng hợp lệ đã mô phỏng: {result.success}</p>
              <p>Dòng có lỗi đã bỏ qua: {result.skipped}</p>
              <p>Chưa lưu dữ liệu vào hệ thống.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}