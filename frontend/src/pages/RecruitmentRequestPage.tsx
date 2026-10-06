import { useState } from 'react';
import type { FormEvent } from 'react';

const DRAFT_KEY = 'scrum-95-96-recruitment-draft-v1';

const JOBS = [
  { name: 'Lập trình viên', min: 10000000, max: 30000000 },
  { name: 'Kiểm thử viên', min: 8000000, max: 20000000 },
  { name: 'Chuyên viên nhân sự', min: 8000000, max: 18000000 },
];

const INITIAL_FORM = {
  jobTitle: '',
  department: '',
  quantity: '',
  recruitmentType: '',
  reason: '',
  salaryMin: '',
  salaryMax: '',
  salaryExplanation: '',
  neededDate: '',
  jobDescription: '',
  candidateRequirements: '',
};

type FormData = typeof INITIAL_FORM;
type FieldName = keyof FormData;
type Errors = Partial<Record<FieldName, string>>;

function today() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function money(value: number) {
  return value.toLocaleString('vi-VN') + ' đồng';
}

function readDraft(): FormData | null {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;

  const draft: unknown = JSON.parse(raw);
  if (!draft || typeof draft !== 'object') {
    throw new Error('Bản nháp không hợp lệ.');
  }

  const result = { ...INITIAL_FORM };

  for (const key of Object.keys(INITIAL_FORM) as FieldName[]) {
    const value = (draft as Record<string, unknown>)[key];
    if (typeof value !== 'string') {
      throw new Error('Bản nháp không hợp lệ.');
    }
    result[key] = value;
  }

  return result;
}

function validate(form: FormData): Errors {
  const errors: Errors = {};

  const required: Array<[FieldName, string]> = [
    ['jobTitle', 'Vui lòng chọn chức danh.'],
    ['department', 'Vui lòng chọn phòng ban.'],
    ['quantity', 'Vui lòng nhập số lượng.'],
    ['recruitmentType', 'Vui lòng chọn loại tuyển dụng.'],
    ['reason', 'Vui lòng nhập lý do tuyển dụng.'],
    ['salaryMin', 'Vui lòng nhập lương tối thiểu.'],
    ['salaryMax', 'Vui lòng nhập lương tối đa.'],
    ['neededDate', 'Vui lòng chọn ngày cần người.'],
    ['jobDescription', 'Vui lòng nhập mô tả công việc.'],
    ['candidateRequirements', 'Vui lòng nhập yêu cầu ứng viên.'],
  ];

  required.forEach(([key, message]) => {
    if (!form[key].trim()) errors[key] = message;
  });

  const quantity = Number(form.quantity);
  if (
    form.quantity &&
    (!Number.isSafeInteger(quantity) || quantity < 1)
  ) {
    errors.quantity = 'Số lượng phải là số nguyên lớn hơn 0.';
  }

  const min = Number(form.salaryMin);
  const max = Number(form.salaryMax);

  if (
    form.salaryMin &&
    (!Number.isSafeInteger(min) || min <= 0)
  ) {
    errors.salaryMin = 'Lương phải là số nguyên lớn hơn 0.';
  }

  if (
    form.salaryMax &&
    (!Number.isSafeInteger(max) || max <= 0)
  ) {
    errors.salaryMax = 'Lương phải là số nguyên lớn hơn 0.';
  }

  if (
    form.salaryMin &&
    form.salaryMax &&
    !errors.salaryMin &&
    !errors.salaryMax &&
    min > max
  ) {
    errors.salaryMax = 'Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu.';
  }

  const job = JOBS.find((item) => item.name === form.jobTitle);
  if (form.jobTitle && !job) {
    errors.jobTitle = 'Vui lòng chọn chức danh trong danh sách.';
  }

  if (
    job &&
    form.salaryMin &&
    form.salaryMax &&
    !errors.salaryMin &&
    !errors.salaryMax &&
    (min < job.min || max > job.max) &&
    !form.salaryExplanation.trim()
  ) {
    errors.salaryExplanation =
      'Vui lòng giải trình khi dải lương nằm ngoài khung tiêu chuẩn.';
  }

  if (
    form.neededDate &&
    (
      !/^\d{4}-\d{2}-\d{2}$/.test(form.neededDate) ||
      Number.isNaN(Date.parse(form.neededDate))
    )
  ) {
    errors.neededDate = 'Ngày không hợp lệ.';
  } else if (form.neededDate && form.neededDate < today()) {
    errors.neededDate = 'Ngày cần người không được ở trong quá khứ.';
  }

  if (
    form.department &&
    !['Công nghệ thông tin', 'Nhân sự', 'Kinh doanh'].includes(form.department)
  ) {
    errors.department = 'Vui lòng chọn phòng ban trong danh sách.';
  }

  if (
    form.recruitmentType &&
    !['REPLACEMENT', 'NEW'].includes(form.recruitmentType)
  ) {
    errors.recruitmentType = 'Loại tuyển dụng không hợp lệ.';
  }

  return errors;
}

export default function RecruitmentRequestPage() {
  const [form, setForm] = useState<FormData>({ ...INITIAL_FORM });
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState('');
  const [checked, setChecked] = useState(false);

  const job = JOBS.find((item) => item.name === form.jobTitle);
  const outsideRange = Boolean(
    job &&
    form.salaryMin &&
    form.salaryMax &&
    (
      Number(form.salaryMin) < job.min ||
      Number(form.salaryMax) > job.max
    )
  );

  function update(key: FieldName, value: string) {
    const next = { ...form, [key]: value };
    setForm(next);
    setMessage('');
    if (checked) setErrors(validate(next));
  }

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      setMessage('Đã lưu bản nháp trên trình duyệt này. Có thể lưu khi chưa điền đủ.');
    } catch {
      setMessage('Không thể lưu bản nháp. Hãy kiểm tra quyền lưu trữ của trình duyệt.');
    }
  }

  function restoreDraft() {
    try {
      const draft = readDraft();
      if (!draft) {
        setMessage('Chưa có bản nháp được lưu.');
        return;
      }
      setForm(draft);
      setErrors({});
      setChecked(false);
      setMessage('Đã khôi phục bản nháp. Hãy kiểm tra lại trước khi hoàn tất.');
    } catch {
      setMessage('Không thể đọc bản nháp. Dữ liệu có thể bị lỗi hoặc trình duyệt chặn lưu trữ.');
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    setChecked(true);

    const firstError = (Object.keys(INITIAL_FORM) as FieldName[])
      .find((key) => nextErrors[key]);

    if (firstError) {
      setMessage('Vui lòng sửa các trường có thông báo lỗi.');
      document.getElementById(`request-${firstError}`)?.focus();
      return;
    }

    setMessage(
      'Thông tin hợp lệ. Đây là kiểm tra frontend; yêu cầu chưa được gửi lên máy chủ.'
    );
  }

  function field(
    key: FieldName,
    label: string,
    kind = 'text',
    options?: Array<{ value: string; label: string }>
  ) {
    const id = `request-${key}`;

    const props = {
      id,
      name: key,
      value: form[key],
      'aria-invalid': Boolean(errors[key]),
      'aria-describedby': errors[key] ? `${id}-error` : undefined,
      onChange: (
        event: React.ChangeEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >
      ) => update(key, event.target.value),
    };

    return (
      <div className="rr-field" key={key}>
        <label htmlFor={id}>
          {label}
          {key !== 'salaryExplanation' && ' *'}
          {key === 'salaryExplanation' && outsideRange && ' *'}
        </label>

        {options ? (
          <select {...props}>
            <option value="">-- Chọn --</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : kind === 'textarea' ? (
          <textarea {...props} rows={4} />
        ) : (
          <input
            {...props}
            type={kind}
            min={kind === 'date' ? today() : kind === 'number' ? 1 : undefined}
            step={kind === 'number' ? 1 : undefined}
          />
        )}

        {errors[key] && (
          <p id={`${id}-error`} className="rr-error">
            {errors[key]}
          </p>
        )}
      </div>
    );
  }

  return (
    <section className="rr-page">
      <style>{`
        .rr-page, .rr-page * { box-sizing: border-box; }
        .rr-page {
          max-width: 1000px; width: 100%; min-width: 0;
          margin: 0 auto; padding: 24px;
          color: #1e293b; font-family: Arial, sans-serif;
        }
        .rr-page h1 { font-size: 26px; margin: 0 0 12px; }
        .rr-page p { line-height: 1.6; overflow-wrap: anywhere; }
        .rr-card {
          background: #fff; border: 1px solid #dbe2ea;
          border-radius: 12px; padding: 24px; margin-top: 20px;
        }
        .rr-grid {
          display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
        }
        .rr-field { min-width: 0; margin-bottom: 18px; }
        .rr-grid .rr-field { margin-bottom: 0; }
        .rr-field label { display: block; font-weight: 600; margin-bottom: 8px; }
        .rr-field input, .rr-field select, .rr-field textarea {
          display: block; width: 100%; min-width: 0;
          padding: 11px; font: inherit; color: #1e293b;
          background: #fff; border: 1px solid #94a3b8; border-radius: 6px;
        }
        .rr-field textarea { resize: vertical; }
        .rr-field [aria-invalid="true"] { border-color: #b91c1c; }
        .rr-page :focus-visible { outline: 3px solid #2563eb; outline-offset: 2px; }
        .rr-error { color: #b91c1c; margin: 6px 0 0; font-size: 14px; }
        .rr-note { color: #475569; font-size: 14px; }
        .rr-message {
          padding: 12px; background: #eff6ff;
          border: 1px solid #93c5fd; border-radius: 6px;
        }
        .rr-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
        .rr-actions button {
          padding: 12px 18px; font: inherit; font-weight: 600;
          border: 1px solid #94a3b8; border-radius: 6px;
          cursor: pointer; background: #fff; color: #1e293b;
        }
        .rr-actions .rr-primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        @media (max-width: 600px) {
          .rr-page { padding: 12px; }
          .rr-card { padding: 16px; }
          .rr-grid { grid-template-columns: minmax(0, 1fr); }
          .rr-page h1 { font-size: 22px; }
          .rr-actions button { width: 100%; }
        }
      `}</style>

      <h1>Tạo yêu cầu tuyển dụng</h1>
      <p>Điền thông tin vị trí cần tuyển. Các trường có dấu * là bắt buộc.</p>
      <p className="rr-note">
        Bản demo frontend: danh mục và khung lương là dữ liệu mẫu.
        Bản nháp chỉ lưu trên trình duyệt này.
      </p>

      <form className="rr-card" onSubmit={handleSubmit} noValidate>
        <h2>Thông tin tuyển dụng</h2>

        <div className="rr-grid">
          {field('jobTitle', 'Chức danh', 'text',
            JOBS.map((item) => ({ value: item.name, label: item.name }))
          )}
          {field('department', 'Phòng ban', 'text',
            ['Công nghệ thông tin', 'Nhân sự', 'Kinh doanh']
              .map((name) => ({ value: name, label: name }))
          )}
          {field('quantity', 'Số lượng cần tuyển', 'number')}
          {field('recruitmentType', 'Loại tuyển dụng', 'text', [
            { value: 'REPLACEMENT', label: 'Tuyển thay thế' },
            { value: 'NEW', label: 'Tuyển tăng mới' },
          ])}
        </div>

        <div style={{ marginTop: 20 }}>
          {field('reason', 'Lý do tuyển dụng', 'textarea')}
        </div>

        <h2>Lương và thời gian</h2>

        {job && (
          <p className="rr-note">
            Khung lương mẫu cho {job.name}: {money(job.min)} – {money(job.max)}/tháng.
          </p>
        )}

        <div className="rr-grid">
          {field('salaryMin', 'Lương tối thiểu (đồng/tháng)', 'number')}
          {field('salaryMax', 'Lương tối đa (đồng/tháng)', 'number')}
        </div>

        {outsideRange && (
          <p className="rr-note">
            Dải lương nằm ngoài khung mẫu. Bạn cần nhập giải trình.
          </p>
        )}

        <div style={{ marginTop: 20 }}>
          {field('salaryExplanation', 'Giải trình dải lương', 'textarea')}
          {field('neededDate', 'Ngày cần người', 'date')}
        </div>

        <h2>Nội dung công việc</h2>
        {field('jobDescription', 'Mô tả công việc', 'textarea')}
        {field('candidateRequirements', 'Yêu cầu ứng viên', 'textarea')}

        {message && (
          <p className="rr-message" role="status" aria-live="polite">
            {message}
          </p>
        )}

        <div className="rr-actions">
          <button type="button" onClick={saveDraft}>
            Lưu bản nháp
          </button>
          <button type="button" onClick={restoreDraft}>
            Khôi phục bản nháp
          </button>
          <button type="submit" className="rr-primary">
            Kiểm tra thông tin
          </button>
        </div>
      </form>
    </section>
  );
}