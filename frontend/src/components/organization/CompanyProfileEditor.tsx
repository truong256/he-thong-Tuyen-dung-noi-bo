import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Gift,
  Globe,
  ImagePlus,
  Keyboard,
  Loader2,
  type LucideIcon,
  Mail,
  MapPin,
  Palette,
  Phone,
  Plus,
  RotateCcw,
  Save,
  Scale,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import type { CompanyProfile, LegalRepresentative, WorkPolicy } from '../../types/organization';
import '../../styles/company-profile-editor.css';

/* ==========================================================================
   CONFIG
   ========================================================================== */

type SectionId = 'branding' | 'legal' | 'contact' | 'about' | 'representative' | 'policy';
type ImageKey = 'logoUrl' | 'bannerUrl';
type Errors = Record<string, string>;

interface SectionMeta {
  id: SectionId;
  label: string;
  description: string;
  icon: LucideIcon;
}

const SECTIONS: SectionMeta[] = [
  { id: 'branding', label: 'Nhận diện thương hiệu', description: 'Logo, ảnh bìa và tên hiển thị của tổ chức', icon: Palette },
  { id: 'legal', label: 'Thông tin pháp lý', description: 'Tên pháp lý, mã số thuế, giấy phép và lĩnh vực', icon: Scale },
  { id: 'contact', label: 'Liên hệ & Trụ sở', description: 'Kênh liên lạc chính thức và địa chỉ trụ sở', icon: MapPin },
  { id: 'about', label: 'Giới thiệu & Văn hóa', description: 'Câu chuyện, sứ mệnh, tầm nhìn và giá trị cốt lõi', icon: Sparkles },
  { id: 'representative', label: 'Người đại diện', description: 'Người đại diện theo pháp luật của doanh nghiệp', icon: UserRound },
  { id: 'policy', label: 'Chính sách & Phúc lợi', description: 'Chế độ làm việc và phúc lợi hiển thị cho ứng viên', icon: Gift },
];

/** Map field path -> section & DOM input id (used for scroll-to-error & focus). */
const FIELD_META: Record<string, { section: SectionId; inputId: string }> = {
  companyName: { section: 'branding', inputId: 'company-name' },
  shortName: { section: 'branding', inputId: 'short-name' },
  legalName: { section: 'legal', inputId: 'legal-name' },
  taxCode: { section: 'legal', inputId: 'tax-code' },
  foundedDate: { section: 'legal', inputId: 'founded-date' },
  email: { section: 'contact', inputId: 'email' },
  phone: { section: 'contact', inputId: 'phone' },
  website: { section: 'contact', inputId: 'website' },
  address: { section: 'contact', inputId: 'address' },
  description: { section: 'about', inputId: 'desc' },
  mission: { section: 'about', inputId: 'mission' },
  vision: { section: 'about', inputId: 'vision' },
  'legalRepresentative.name': { section: 'representative', inputId: 'rep-name' },
  'legalRepresentative.email': { section: 'representative', inputId: 'rep-email' },
  'legalRepresentative.phone': { section: 'representative', inputId: 'rep-phone' },
  'workPolicy.leaveDaysPerYear': { section: 'policy', inputId: 'leave-days' },
  'workPolicy.noticePeriodDays': { section: 'policy', inputId: 'notice-days' },
};

const SECTION_OF_KEY = (key: string): SectionId | undefined => {
  if (FIELD_META[key]) return FIELD_META[key].section;
  if (key === 'logoUrl' || key === 'bannerUrl') return 'branding';
  if (['businessLicense', 'industry', 'companySize'].includes(key)) return 'legal';
  if (['city', 'country'].includes(key)) return 'contact';
  if (key === 'coreValues') return 'about';
  if (key.startsWith('legalRepresentative.')) return 'representative';
  if (key.startsWith('workPolicy.')) return 'policy';
  return undefined;
};

const COMPANY_SIZES = [
  'Dưới 50 nhân sự',
  '50 - 100 nhân sự',
  '100 - 500 nhân sự',
  '500 - 1000 nhân sự',
  'Trên 1000 nhân sự',
];

const WORK_MODEL_SUGGESTIONS = [
  'Làm việc tại văn phòng (Onsite)',
  'Hybrid linh hoạt (Hỗ trợ tối đa 2 ngày làm việc từ xa/tuần)',
  'Làm việc từ xa hoàn toàn (Remote)',
];

const LIMITS = {
  companyName: 150,
  shortName: 60,
  description: 2000,
  mission: 400,
  vision: 400,
  coreValueLength: 60,
  coreValues: 8,
  benefits: 15,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[\d\s()+.-]{8,20}$/;
const TAX_RE = /^\d{10}(-\d{3})?$/;
const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i;

/* ==========================================================================
   HELPERS
   ========================================================================== */

const DEFAULT_REP: LegalRepresentative = { name: '', title: '', phone: '', email: '' };
const DEFAULT_POLICY: WorkPolicy = {
  standardWorkingHours: '',
  workModel: '',
  probationPeriod: '',
  leaveDaysPerYear: 12,
  dressCode: '',
  noticePeriodDays: 30,
  keyBenefits: [],
};

// Data may come from localStorage / API and be partially filled at runtime.
const normalizeProfile = (p: CompanyProfile): CompanyProfile => ({
  ...p,
  coreValues: [...(p.coreValues ?? [])],
  legalRepresentative: { ...DEFAULT_REP, ...(p.legalRepresentative as Partial<LegalRepresentative>) },
  workPolicy: {
    ...DEFAULT_POLICY,
    ...(p.workPolicy as Partial<WorkPolicy>),
    keyBenefits: [...(p.workPolicy?.keyBenefits ?? [])],
  },
});

const IGNORED_DIFF_KEYS = new Set(['id', 'updatedAt', 'updatedBy']);

const flatten = (obj: unknown, prefix = ''): Record<string, string> => {
  const out: Record<string, string> = {};
  Object.entries((obj ?? {}) as Record<string, unknown>).forEach(([k, v]) => {
    if (!prefix && IGNORED_DIFF_KEYS.has(k)) return;
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = JSON.stringify(v ?? '');
    }
  });
  return out;
};

const validate = (f: CompanyProfile): Errors => {
  const e: Errors = {};
  const rep = f.legalRepresentative;
  const pol = f.workPolicy;

  // Order matters: follows section order so the first error is the top-most one.
  if (!f.companyName?.trim()) e.companyName = 'Vui lòng nhập tên tổ chức / công ty.';
  else if (f.companyName.length > LIMITS.companyName) e.companyName = `Tối đa ${LIMITS.companyName} ký tự.`;
  if (!f.shortName?.trim()) e.shortName = 'Vui lòng nhập tên thương mại / viết tắt.';
  else if (f.shortName.length > LIMITS.shortName) e.shortName = `Tối đa ${LIMITS.shortName} ký tự.`;

  if (!f.legalName?.trim()) e.legalName = 'Vui lòng nhập tên pháp lý đầy đủ theo GPKD.';
  if (!f.taxCode?.trim()) e.taxCode = 'Vui lòng nhập mã số thuế.';
  else if (!TAX_RE.test(f.taxCode.trim())) e.taxCode = 'MST gồm 10 chữ số hoặc 10 số + "-" + 3 số (chi nhánh).';
  if (f.foundedDate && new Date(f.foundedDate) > new Date()) e.foundedDate = 'Ngày thành lập không được ở tương lai.';

  if (!f.email?.trim()) e.email = 'Vui lòng nhập email liên hệ.';
  else if (!EMAIL_RE.test(f.email.trim())) e.email = 'Email không đúng định dạng.';
  if (!f.phone?.trim()) e.phone = 'Vui lòng nhập số điện thoại / hotline.';
  else if (!PHONE_RE.test(f.phone.trim())) e.phone = 'Số điện thoại không hợp lệ (8–20 ký tự số).';
  if (f.website?.trim() && !URL_RE.test(f.website.trim())) e.website = 'Website phải bắt đầu bằng http:// hoặc https://';
  if (!f.address?.trim()) e.address = 'Vui lòng nhập địa chỉ trụ sở chính.';

  if ((f.description ?? '').length > LIMITS.description) e.description = `Tối đa ${LIMITS.description} ký tự.`;
  if ((f.mission ?? '').length > LIMITS.mission) e.mission = `Tối đa ${LIMITS.mission} ký tự.`;
  if ((f.vision ?? '').length > LIMITS.vision) e.vision = `Tối đa ${LIMITS.vision} ký tự.`;

  if (!rep.name?.trim()) e['legalRepresentative.name'] = 'Vui lòng nhập họ tên người đại diện.';
  if (rep.email?.trim() && !EMAIL_RE.test(rep.email.trim())) e['legalRepresentative.email'] = 'Email không đúng định dạng.';
  if (rep.phone?.trim() && !PHONE_RE.test(rep.phone.trim())) e['legalRepresentative.phone'] = 'Số điện thoại không hợp lệ.';

  if (!Number.isFinite(pol.leaveDaysPerYear) || pol.leaveDaysPerYear < 0 || pol.leaveDaysPerYear > 60)
    e['workPolicy.leaveDaysPerYear'] = 'Số ngày phép trong khoảng 0 – 60.';
  if (pol.noticePeriodDays != null && (pol.noticePeriodDays < 0 || pol.noticePeriodDays > 180))
    e['workPolicy.noticePeriodDays'] = 'Thời gian báo trước trong khoảng 0 – 180 ngày.';

  return e;
};

const COMPLETENESS_CHECKS: Array<{ label: string; section: SectionId; ok: (p: CompanyProfile) => boolean }> = [
  { label: 'Logo', section: 'branding', ok: (p) => !!p.logoUrl },
  { label: 'Ảnh bìa', section: 'branding', ok: (p) => !!p.bannerUrl },
  { label: 'Tên công ty', section: 'branding', ok: (p) => !!p.companyName?.trim() },
  { label: 'Mã số thuế', section: 'legal', ok: (p) => !!p.taxCode?.trim() },
  { label: 'Lĩnh vực hoạt động', section: 'legal', ok: (p) => !!p.industry?.trim() },
  { label: 'Ngày thành lập', section: 'legal', ok: (p) => !!p.foundedDate },
  { label: 'Website', section: 'contact', ok: (p) => !!p.website?.trim() },
  { label: 'Địa chỉ', section: 'contact', ok: (p) => !!p.address?.trim() },
  { label: 'Giới thiệu (≥ 150 ký tự)', section: 'about', ok: (p) => (p.description ?? '').trim().length >= 150 },
  { label: 'Sứ mệnh', section: 'about', ok: (p) => !!p.mission?.trim() },
  { label: 'Tầm nhìn', section: 'about', ok: (p) => !!p.vision?.trim() },
  { label: 'Giá trị cốt lõi (≥ 3)', section: 'about', ok: (p) => (p.coreValues ?? []).length >= 3 },
  { label: 'Người đại diện', section: 'representative', ok: (p) => !!p.legalRepresentative?.name?.trim() },
  { label: 'Phúc lợi (≥ 3)', section: 'policy', ok: (p) => (p.workPolicy?.keyBenefits ?? []).length >= 3 },
];

const getInitials = (name: string) =>
  name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'CO';

const formatDateTime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
};

/* ==========================================================================
   SMALL PRESENTATIONAL PIECES
   ========================================================================== */

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  counter?: { value: number; max: number };
  span2?: boolean;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ id, label, required, hint, error, counter, span2, children }) => (
  <div className={`cpe-field ${span2 ? 'span-2' : ''} ${error ? 'has-error' : ''}`}>
    <div className="cpe-label-row">
      <label htmlFor={id}>
        {label}
        {required && <span className="cpe-required" aria-hidden="true"> *</span>}
      </label>
      {counter && (
        <span className={`cpe-counter ${counter.value > counter.max ? 'over' : counter.value > counter.max * 0.9 ? 'near' : ''}`}>
          {counter.value}/{counter.max}
        </span>
      )}
    </div>
    {children}
    {error ? (
      <p className="cpe-error" id={`${id}-error`} role="alert">
        <AlertCircle size={13} />
        <span>{error}</span>
      </p>
    ) : hint ? (
      <p className="cpe-hint" id={`${id}-hint`}>{hint}</p>
    ) : null}
  </div>
);

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

interface CompanyProfileEditorProps {
  profile: CompanyProfile;
  onSave: (data: CompanyProfile) => Promise<void>;
  onCancel: () => void;
}

export const CompanyProfileEditor: React.FC<CompanyProfileEditorProps> = ({ profile, onSave, onCancel }) => {
  const initial = useMemo(() => normalizeProfile(profile), [profile]);
  const [form, setForm] = useState<CompanyProfile>(initial);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('branding');
  const [showPreview, setShowPreview] = useState(true);
  const [valueDraft, setValueDraft] = useState('');
  const [benefitDraft, setBenefitDraft] = useState('');
  const [imageErrors, setImageErrors] = useState<Partial<Record<ImageKey, string>>>({});
  const [dragOver, setDragOver] = useState<ImageKey | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const sectionRefs = useRef<Partial<Record<SectionId, HTMLElement | null>>>({});

  /* ---------- Derived state ---------- */
  const errors = useMemo(() => validate(form), [form]);

  const changedKeys = useMemo(() => {
    const a = flatten(initial);
    const b = flatten(form);
    return Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).filter((k) => a[k] !== b[k]);
  }, [initial, form]);
  const isDirty = changedKeys.length > 0;

  const sectionStatus = useMemo(() => {
    const status = {} as Record<SectionId, { errors: number; changed: number }>;
    SECTIONS.forEach((s) => (status[s.id] = { errors: 0, changed: 0 }));
    Object.keys(errors).forEach((k) => {
      const s = SECTION_OF_KEY(k);
      if (s && (submitAttempted || touched.has(k))) status[s].errors += 1;
    });
    changedKeys.forEach((k) => {
      const s = SECTION_OF_KEY(k);
      if (s) status[s].changed += 1;
    });
    return status;
  }, [errors, changedKeys, submitAttempted, touched]);

  const completeness = useMemo(() => {
    const missing = COMPLETENESS_CHECKS.filter((c) => !c.ok(form));
    const pct = Math.round(((COMPLETENESS_CHECKS.length - missing.length) / COMPLETENESS_CHECKS.length) * 100);
    return { pct, missing };
  }, [form]);

  /* ---------- Field helpers ---------- */
  const fieldError = (key: string) => (submitAttempted || touched.has(key) ? errors[key] : undefined);
  const markTouched = (key: string) => () =>
    setTouched((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));

  const setField = <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const setRep = (key: keyof LegalRepresentative, value: string) =>
    setForm((f) => ({ ...f, legalRepresentative: { ...f.legalRepresentative, [key]: value } }));
  const setPolicy = <K extends keyof WorkPolicy>(key: K, value: WorkPolicy[K]) =>
    setForm((f) => ({ ...f, workPolicy: { ...f.workPolicy, [key]: value } }));

  const a11y = (key: string, inputId: string) => ({
    'aria-invalid': !!fieldError(key) || undefined,
    'aria-describedby': fieldError(key) ? `${inputId}-error` : `${inputId}-hint`,
    onBlur: markTouched(key),
  });

  /* ---------- Navigation ---------- */
  const scrollToSection = useCallback((id: SectionId) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((en) => en.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.getAttribute('data-section') as SectionId);
      },
      { rootMargin: '-100px 0px -55% 0px', threshold: 0 }
    );
    SECTIONS.forEach((s) => {
      const el = sectionRefs.current[s.id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  /* ---------- Unsaved-changes guard & shortcuts ---------- */
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        formRef.current?.requestSubmit?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* ---------- Images ---------- */
  const processImage = (key: ImageKey, file: File | undefined, maxMB: number) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(file.type)) {
      setImageErrors((p) => ({ ...p, [key]: 'Chỉ hỗ trợ PNG, JPG, WEBP hoặc SVG.' }));
      return;
    }
    if (file.size > maxMB * 1024 * 1024) {
      setImageErrors((p) => ({ ...p, [key]: `Dung lượng tối đa ${maxMB}MB.` }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setField(key, reader.result as string);
      setImageErrors((p) => ({ ...p, [key]: undefined }));
    };
    reader.readAsDataURL(file);
  };

  const dropzoneProps = (key: ImageKey, maxMB: number) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(key);
    },
    onDragLeave: () => setDragOver(null),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(null);
      processImage(key, e.dataTransfer.files?.[0], maxMB);
    },
  });

  /* ---------- Core values (tag input) ---------- */
  const addCoreValue = () => {
    const v = valueDraft.trim().slice(0, LIMITS.coreValueLength);
    if (!v) return;
    if (form.coreValues.some((c) => c.toLowerCase() === v.toLowerCase())) {
      setValueDraft('');
      return;
    }
    if (form.coreValues.length >= LIMITS.coreValues) return;
    setField('coreValues', [...form.coreValues, v]);
    setValueDraft('');
  };

  const removeCoreValue = (idx: number) =>
    setField('coreValues', form.coreValues.filter((_, i) => i !== idx));

  /* ---------- Benefits (list editor) ---------- */
  const benefits = form.workPolicy.keyBenefits;
  const addBenefit = () => {
    const v = benefitDraft.trim();
    if (!v || benefits.length >= LIMITS.benefits) return;
    setPolicy('keyBenefits', [...benefits, v]);
    setBenefitDraft('');
  };
  const updateBenefit = (idx: number, value: string) =>
    setPolicy('keyBenefits', benefits.map((b, i) => (i === idx ? value : b)));
  const removeBenefit = (idx: number) => setPolicy('keyBenefits', benefits.filter((_, i) => i !== idx));
  const moveBenefit = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= benefits.length) return;
    const next = [...benefits];
    [next[idx], next[target]] = [next[target], next[idx]];
    setPolicy('keyBenefits', next);
  };

  /* ---------- Actions ---------- */
  const handleDiscard = () => {
    if (!isDirty) return;
    if (window.confirm('Hoàn tác toàn bộ thay đổi chưa lưu?')) {
      setForm(initial);
      setTouched(new Set());
      setSubmitAttempted(false);
      setSaveError(null);
    }
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm('Bạn có thay đổi chưa lưu. Thoát khỏi chế độ chỉnh sửa?')) return;
    onCancel();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setSaveError(null);

    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      const first = FIELD_META[errorKeys[0]];
      if (first) {
        scrollToSection(first.section);
        window.setTimeout(() => document.getElementById(first.inputId)?.focus({ preventScroll: true }), 350);
      }
      return;
    }
    if (!isDirty) {
      onCancel();
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        ...form,
        companyName: form.companyName.trim(),
        shortName: form.shortName.trim(),
        taxCode: form.taxCode.trim(),
        email: form.email.trim(),
        website: form.website?.trim(),
        workPolicy: {
          ...form.workPolicy,
          keyBenefits: form.workPolicy.keyBenefits.map((b) => b.trim()).filter(Boolean),
        },
      });
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Không thể lưu hồ sơ tổ chức. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalVisibleErrors = Object.values(sectionStatus).reduce((s, x) => s + x.errors, 0);
  const sectionRef = (id: SectionId) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };

  const renderSectionHeader = (index: number) => {
    const meta = SECTIONS[index];
    const Icon = meta.icon;
    const st = sectionStatus[meta.id];
    return (
      <header className="cpe-section-header">
        <div className="cpe-section-icon">
          <Icon size={20} />
        </div>
        <div className="cpe-section-heading">
          <span className="cpe-section-step">Bước {index + 1} / {SECTIONS.length}</span>
          <h3>{meta.label}</h3>
          <p>{meta.description}</p>
        </div>
        {st.changed > 0 && <span className="cpe-chip-changed">{st.changed} thay đổi</span>}
      </header>
    );
  };

  /* ======================================================================
     RENDER
     ====================================================================== */
  return (
    <div className="cpe-root" data-testid="edit-profile-form">
      {/* ---------- Top header ---------- */}
      <div className="cpe-topbar">
        <div className="cpe-topbar-info">
          <h2>Chỉnh sửa hồ sơ giới thiệu công ty</h2>
          <p>
            Cập nhật lần cuối <strong>{formatDateTime(profile.updatedAt)}</strong>
            {profile.updatedBy && (
              <>
                {' '}bởi <strong>{profile.updatedBy}</strong>
              </>
            )}
          </p>
        </div>
        <div className="cpe-topbar-actions">
          <button
            type="button"
            className="cpe-btn cpe-btn-ghost cpe-hide-sm"
            onClick={() => setShowPreview((v) => !v)}
            aria-pressed={showPreview}
          >
            {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
            <span>{showPreview ? 'Ẩn xem trước' : 'Xem trước'}</span>
          </button>
          <button type="button" className="cpe-btn cpe-btn-secondary" onClick={handleCancel}>
            <X size={16} />
            <span>Hủy chỉnh sửa</span>
          </button>
        </div>
      </div>

      {saveError && (
        <div className="cpe-banner-error" role="alert">
          <AlertCircle size={18} />
          <span>{saveError}</span>
        </div>
      )}

      <div className={`cpe-layout ${showPreview ? 'with-preview' : ''}`}>
        {/* ---------- Left navigation ---------- */}
        <nav className="cpe-nav" aria-label="Các phần của hồ sơ">
          <div className="cpe-progress-card">
            <div
              className="cpe-progress-ring"
              style={{ '--pct': `${completeness.pct * 3.6}deg` } as React.CSSProperties}
              role="img"
              aria-label={`Hồ sơ hoàn thiện ${completeness.pct}%`}
            >
              <span>{completeness.pct}%</span>
            </div>
            <div>
              <strong>Mức độ hoàn thiện</strong>
              <p>
                {completeness.missing.length === 0
                  ? 'Hồ sơ đã đầy đủ thông tin!'
                  : `Còn ${completeness.missing.length} mục nên bổ sung`}
              </p>
            </div>
          </div>

          <ul className="cpe-nav-list">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const st = sectionStatus[s.id];
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`cpe-nav-item ${activeSection === s.id ? 'active' : ''}`}
                    onClick={() => scrollToSection(s.id)}
                    aria-current={activeSection === s.id ? 'step' : undefined}
                  >
                    <Icon size={17} />
                    <span className="cpe-nav-label">{s.label}</span>
                    {st.errors > 0 ? (
                      <span className="cpe-nav-badge error" title={`${st.errors} lỗi`}>{st.errors}</span>
                    ) : st.changed > 0 ? (
                      <span className="cpe-nav-dot" title="Có thay đổi" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          {completeness.missing.length > 0 && (
            <div className="cpe-missing">
              <span className="cpe-missing-title">Gợi ý bổ sung</span>
              {completeness.missing.slice(0, 4).map((m) => (
                <button key={m.label} type="button" className="cpe-missing-item" onClick={() => scrollToSection(m.section)}>
                  <Plus size={12} />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          )}

          <p className="cpe-shortcut">
            <Keyboard size={13} />
            <span>
              Nhấn <kbd>Ctrl</kbd> + <kbd>S</kbd> để lưu nhanh
            </span>
          </p>
        </nav>

        {/* ---------- Form ---------- */}
        <form ref={formRef} className="cpe-form" onSubmit={handleSubmit} noValidate>
          {/* 1. BRANDING */}
          <section className="cpe-section" id="cpe-section-branding" data-section="branding" ref={sectionRef('branding')}>
            {renderSectionHeader(0)}

            <div className="cpe-brand-media">
              <div
                className={`cpe-banner-drop ${dragOver === 'bannerUrl' ? 'drag' : ''}`}
                style={form.bannerUrl ? { backgroundImage: `url(${form.bannerUrl})` } : undefined}
                {...dropzoneProps('bannerUrl', 3)}
              >
                {!form.bannerUrl && (
                  <div className="cpe-drop-placeholder">
                    <ImagePlus size={26} />
                    <strong>Ảnh bìa trang tuyển dụng</strong>
                    <span>Kéo thả hoặc chọn ảnh • Khuyến nghị 1600×400px • Tối đa 3MB</span>
                  </div>
                )}
                <div className="cpe-media-actions">
                  <label className="cpe-btn cpe-btn-glass" htmlFor="banner-upload">
                    <ImagePlus size={15} />
                    <span>{form.bannerUrl ? 'Thay ảnh bìa' : 'Tải ảnh bìa'}</span>
                  </label>
                  {form.bannerUrl && (
                    <button type="button" className="cpe-btn cpe-btn-glass" onClick={() => setField('bannerUrl', undefined)}>
                      <Trash2 size={15} />
                      <span>Gỡ</span>
                    </button>
                  )}
                </div>
                <input
                  id="banner-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="cpe-sr-only"
                  onChange={(e) => {
                    processImage('bannerUrl', e.target.files?.[0], 3);
                    e.target.value = '';
                  }}
                />
              </div>

              <div className="cpe-logo-row">
                <div
                  className={`cpe-logo-drop ${dragOver === 'logoUrl' ? 'drag' : ''}`}
                  {...dropzoneProps('logoUrl', 1)}
                >
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="Logo công ty" />
                  ) : (
                    <span className="cpe-logo-initials">{getInitials(form.shortName || form.companyName || '')}</span>
                  )}
                </div>
                <div className="cpe-logo-meta">
                  <strong>Logo tổ chức</strong>
                  <span>PNG/SVG nền trong suốt, tỉ lệ 1:1, tối thiểu 256×256px, tối đa 1MB.</span>
                  <div className="cpe-inline-actions">
                    <label className="cpe-btn cpe-btn-outline cpe-btn-sm" htmlFor="logo-upload">
                      <ImagePlus size={14} />
                      <span>{form.logoUrl ? 'Đổi logo' : 'Tải logo lên'}</span>
                    </label>
                    {form.logoUrl && (
                      <button type="button" className="cpe-btn cpe-btn-ghost cpe-btn-sm danger" onClick={() => setField('logoUrl', undefined)}>
                        <Trash2 size={14} />
                        <span>Xóa</span>
                      </button>
                    )}
                  </div>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="cpe-sr-only"
                    onChange={(e) => {
                      processImage('logoUrl', e.target.files?.[0], 1);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
              {(imageErrors.logoUrl || imageErrors.bannerUrl) && (
                <p className="cpe-error" role="alert">
                  <AlertCircle size={13} />
                  <span>{imageErrors.logoUrl || imageErrors.bannerUrl}</span>
                </p>
              )}
            </div>

            <div className="cpe-grid">
              <Field
                id="company-name"
                label="Tên tổ chức / Công ty"
                required
                span2
                error={fieldError('companyName')}
                hint="Tên hiển thị chính trên cổng tuyển dụng và email gửi ứng viên."
                counter={{ value: form.companyName.length, max: LIMITS.companyName }}
              >
                <input
                  id="company-name"
                  type="text"
                  className="cpe-input"
                  value={form.companyName}
                  onChange={(e) => setField('companyName', e.target.value)}
                  placeholder="VD: Công ty Cổ phần Công nghệ ABC"
                  required
                  {...a11y('companyName', 'company-name')}
                />
              </Field>
              <Field
                id="short-name"
                label="Tên thương mại / Viết tắt"
                required
                error={fieldError('shortName')}
                hint="Dùng cho logo chữ, tiêu đề tab và các vị trí hiển thị ngắn."
              >
                <input
                  id="short-name"
                  type="text"
                  className="cpe-input"
                  value={form.shortName}
                  onChange={(e) => setField('shortName', e.target.value)}
                  placeholder="VD: ABC Tech"
                  required
                  {...a11y('shortName', 'short-name')}
                />
              </Field>
            </div>
          </section>

          {/* 2. LEGAL */}
          <section className="cpe-section" id="cpe-section-legal" data-section="legal" ref={sectionRef('legal')}>
            {renderSectionHeader(1)}
            <div className="cpe-grid">
              <Field id="legal-name" label="Tên pháp lý đầy đủ" required span2 error={fieldError('legalName')} hint="Ghi chính xác theo Giấy chứng nhận đăng ký doanh nghiệp.">
                <input
                  id="legal-name"
                  type="text"
                  className="cpe-input cpe-uppercase"
                  value={form.legalName}
                  onChange={(e) => setField('legalName', e.target.value)}
                  {...a11y('legalName', 'legal-name')}
                />
              </Field>
              <Field id="tax-code" label="Mã số thuế" required error={fieldError('taxCode')} hint="10 chữ số, hoặc dạng 0123456789-001 cho chi nhánh.">
                <input
                  id="tax-code"
                  type="text"
                  inputMode="numeric"
                  className="cpe-input cpe-mono"
                  value={form.taxCode}
                  onChange={(e) => setField('taxCode', e.target.value.replace(/[^\d-]/g, ''))}
                  maxLength={14}
                  required
                  {...a11y('taxCode', 'tax-code')}
                />
              </Field>
              <Field id="founded-date" label="Ngày thành lập" error={fieldError('foundedDate')}>
                <div className="cpe-input-icon">
                  <Calendar size={16} />
                  <input
                    id="founded-date"
                    type="date"
                    className="cpe-input"
                    value={form.foundedDate || ''}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setField('foundedDate', e.target.value)}
                    {...a11y('foundedDate', 'founded-date')}
                  />
                </div>
              </Field>
              <Field id="business-license" label="Giấy phép đăng ký kinh doanh" span2 hint="Số GPKD, ngày cấp và cơ quan cấp.">
                <input
                  id="business-license"
                  type="text"
                  className="cpe-input"
                  value={form.businessLicense || ''}
                  onChange={(e) => setField('businessLicense', e.target.value)}
                />
              </Field>
              <Field id="industry" label="Lĩnh vực hoạt động" span2>
                <input
                  id="industry"
                  type="text"
                  className="cpe-input"
                  value={form.industry}
                  onChange={(e) => setField('industry', e.target.value)}
                  placeholder="VD: Công nghệ thông tin, Phần mềm SaaS"
                />
              </Field>
              <div className="cpe-field span-2">
                <div className="cpe-label-row">
                  <label id="company-size-label" htmlFor="company-size">Quy mô nhân sự</label>
                </div>
                <div className="cpe-segmented" role="radiogroup" aria-labelledby="company-size-label">
                  {COMPANY_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      role="radio"
                      aria-checked={form.companySize === size}
                      className={`cpe-segment ${form.companySize === size ? 'active' : ''}`}
                      onClick={() => setField('companySize', size)}
                    >
                      {form.companySize === size && <Check size={13} />}
                      <span>{size}</span>
                    </button>
                  ))}
                </div>
                <input
                  id="company-size"
                  type="text"
                  className="cpe-input mt-8"
                  value={form.companySize}
                  onChange={(e) => setField('companySize', e.target.value)}
                  placeholder="Hoặc nhập quy mô tùy chỉnh"
                />
              </div>
            </div>
          </section>

          {/* 3. CONTACT */}
          <section className="cpe-section" id="cpe-section-contact" data-section="contact" ref={sectionRef('contact')}>
            {renderSectionHeader(2)}
            <div className="cpe-grid">
              <Field id="email" label="Email liên hệ chính" required error={fieldError('email')}>
                <div className="cpe-input-icon">
                  <Mail size={16} />
                  <input
                    id="email"
                    type="email"
                    className="cpe-input"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    placeholder="contact@congty.vn"
                    required
                    {...a11y('email', 'email')}
                  />
                </div>
              </Field>
              <Field id="phone" label="Hotline / Điện thoại" required error={fieldError('phone')}>
                <div className="cpe-input-icon">
                  <Phone size={16} />
                  <input
                    id="phone"
                    type="tel"
                    className="cpe-input"
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    placeholder="(+84) 24 1234 5678"
                    required
                    {...a11y('phone', 'phone')}
                  />
                </div>
              </Field>
              <Field id="website" label="Địa chỉ Website" span2 error={fieldError('website')} hint="Bao gồm https:// ở đầu.">
                <div className="cpe-input-icon">
                  <Globe size={16} />
                  <input
                    id="website"
                    type="url"
                    className="cpe-input"
                    value={form.website}
                    onChange={(e) => setField('website', e.target.value)}
                    placeholder="https://congty.vn"
                    {...a11y('website', 'website')}
                  />
                </div>
              </Field>
              <Field id="address" label="Địa chỉ trụ sở chính" required span2 error={fieldError('address')}>
                <div className="cpe-input-icon">
                  <MapPin size={16} />
                  <input
                    id="address"
                    type="text"
                    className="cpe-input"
                    value={form.address}
                    onChange={(e) => setField('address', e.target.value)}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện"
                    required
                    {...a11y('address', 'address')}
                  />
                </div>
              </Field>
              <Field id="city" label="Tỉnh / Thành phố">
                <input id="city" type="text" className="cpe-input" value={form.city || ''} onChange={(e) => setField('city', e.target.value)} />
              </Field>
              <Field id="country" label="Quốc gia">
                <input id="country" type="text" className="cpe-input" value={form.country || ''} onChange={(e) => setField('country', e.target.value)} />
              </Field>
            </div>
          </section>

          {/* 4. ABOUT */}
          <section className="cpe-section" id="cpe-section-about" data-section="about" ref={sectionRef('about')}>
            {renderSectionHeader(3)}
            <div className="cpe-grid">
              <Field
                id="desc"
                label="Giới thiệu tổng quan"
                span2
                error={fieldError('description')}
                hint="Kể câu chuyện của công ty: bạn là ai, làm gì và điều gì khiến bạn khác biệt. Nên từ 150 – 600 ký tự."
                counter={{ value: (form.description ?? '').length, max: LIMITS.description }}
              >
                <textarea
                  id="desc"
                  rows={6}
                  className="cpe-input cpe-textarea"
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="VD: Được thành lập năm 2018, chúng tôi là đơn vị tiên phong trong lĩnh vực..."
                  {...a11y('description', 'desc')}
                />
              </Field>
              <Field
                id="mission"
                label="Sứ mệnh (Mission)"
                error={fieldError('mission')}
                counter={{ value: (form.mission ?? '').length, max: LIMITS.mission }}
              >
                <textarea
                  id="mission"
                  rows={4}
                  className="cpe-input cpe-textarea"
                  value={form.mission}
                  onChange={(e) => setField('mission', e.target.value)}
                  placeholder="Lý do tổ chức tồn tại và giá trị mang lại cho khách hàng, xã hội."
                  {...a11y('mission', 'mission')}
                />
              </Field>
              <Field
                id="vision"
                label="Tầm nhìn (Vision)"
                error={fieldError('vision')}
                counter={{ value: (form.vision ?? '').length, max: LIMITS.vision }}
              >
                <textarea
                  id="vision"
                  rows={4}
                  className="cpe-input cpe-textarea"
                  value={form.vision}
                  onChange={(e) => setField('vision', e.target.value)}
                  placeholder="Hình ảnh tổ chức muốn đạt được trong 5 – 10 năm tới."
                  {...a11y('vision', 'vision')}
                />
              </Field>

              <div className="cpe-field span-2">
                <div className="cpe-label-row">
                  <label htmlFor="core-value-input">Giá trị cốt lõi (Core Values)</label>
                  <span className="cpe-counter">{form.coreValues.length}/{LIMITS.coreValues}</span>
                </div>
                <div className="cpe-tag-input" onClick={() => document.getElementById('core-value-input')?.focus()}>
                  {form.coreValues.map((v, idx) => (
                    <span key={`${v}-${idx}`} className="cpe-tag">
                      <Check size={12} />
                      <span>{v}</span>
                      <button type="button" aria-label={`Xóa giá trị ${v}`} onClick={() => removeCoreValue(idx)}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  {form.coreValues.length < LIMITS.coreValues && (
                    <input
                      id="core-value-input"
                      type="text"
                      value={valueDraft}
                      maxLength={LIMITS.coreValueLength}
                      onChange={(e) => setValueDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          addCoreValue();
                        } else if (e.key === 'Backspace' && !valueDraft && form.coreValues.length) {
                          removeCoreValue(form.coreValues.length - 1);
                        }
                      }}
                      onBlur={addCoreValue}
                      placeholder={form.coreValues.length ? 'Thêm giá trị…' : 'VD: Tận tâm, Đổi mới… (Enter để thêm)'}
                    />
                  )}
                </div>
                <p className="cpe-hint">Nhấn Enter hoặc dấu phẩy để thêm. Nên có 3 – 6 giá trị ngắn gọn, dễ nhớ.</p>
              </div>
            </div>
          </section>

          {/* 5. REPRESENTATIVE */}
          <section className="cpe-section" id="cpe-section-representative" data-section="representative" ref={sectionRef('representative')}>
            {renderSectionHeader(4)}
            <div className="cpe-grid">
              <Field id="rep-name" label="Họ và tên" required error={fieldError('legalRepresentative.name')}>
                <input
                  id="rep-name"
                  type="text"
                  className="cpe-input"
                  value={form.legalRepresentative.name}
                  onChange={(e) => setRep('name', e.target.value)}
                  {...a11y('legalRepresentative.name', 'rep-name')}
                />
              </Field>
              <Field id="rep-title" label="Chức danh">
                <input
                  id="rep-title"
                  type="text"
                  className="cpe-input"
                  value={form.legalRepresentative.title}
                  onChange={(e) => setRep('title', e.target.value)}
                  placeholder="VD: Tổng Giám đốc"
                />
              </Field>
              <Field id="rep-phone" label="Điện thoại di động" error={fieldError('legalRepresentative.phone')}>
                <div className="cpe-input-icon">
                  <Phone size={16} />
                  <input
                    id="rep-phone"
                    type="tel"
                    className="cpe-input"
                    value={form.legalRepresentative.phone || ''}
                    onChange={(e) => setRep('phone', e.target.value)}
                    {...a11y('legalRepresentative.phone', 'rep-phone')}
                  />
                </div>
              </Field>
              <Field id="rep-email" label="Email công vụ" error={fieldError('legalRepresentative.email')}>
                <div className="cpe-input-icon">
                  <Mail size={16} />
                  <input
                    id="rep-email"
                    type="email"
                    className="cpe-input"
                    value={form.legalRepresentative.email || ''}
                    onChange={(e) => setRep('email', e.target.value)}
                    {...a11y('legalRepresentative.email', 'rep-email')}
                  />
                </div>
              </Field>
            </div>
          </section>

          {/* 6. POLICY */}
          <section className="cpe-section" id="cpe-section-policy" data-section="policy" ref={sectionRef('policy')}>
            {renderSectionHeader(5)}
            <div className="cpe-grid">
              <Field id="working-hours" label="Khung giờ làm việc tiêu chuẩn" span2>
                <input
                  id="working-hours"
                  type="text"
                  className="cpe-input"
                  value={form.workPolicy.standardWorkingHours}
                  onChange={(e) => setPolicy('standardWorkingHours', e.target.value)}
                  placeholder="VD: 08:30 - 17:30 (Thứ Hai - Thứ Sáu)"
                />
              </Field>
              <Field id="work-model" label="Mô hình làm việc" span2>
                <input
                  id="work-model"
                  type="text"
                  list="work-model-suggestions"
                  className="cpe-input"
                  value={form.workPolicy.workModel}
                  onChange={(e) => setPolicy('workModel', e.target.value)}
                />
                <datalist id="work-model-suggestions">
                  {WORK_MODEL_SUGGESTIONS.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </Field>
              <Field id="probation" label="Chế độ thử việc">
                <input
                  id="probation"
                  type="text"
                  className="cpe-input"
                  value={form.workPolicy.probationPeriod}
                  onChange={(e) => setPolicy('probationPeriod', e.target.value)}
                  placeholder="VD: 2 tháng, 100% lương"
                />
              </Field>
              <Field id="dress-code" label="Trang phục làm việc">
                <input
                  id="dress-code"
                  type="text"
                  className="cpe-input"
                  value={form.workPolicy.dressCode || ''}
                  onChange={(e) => setPolicy('dressCode', e.target.value)}
                />
              </Field>
              <Field id="leave-days" label="Số ngày phép / năm" error={fieldError('workPolicy.leaveDaysPerYear')}>
                <div className="cpe-input-suffix">
                  <input
                    id="leave-days"
                    type="number"
                    min={0}
                    max={60}
                    className="cpe-input"
                    value={Number.isFinite(form.workPolicy.leaveDaysPerYear) ? form.workPolicy.leaveDaysPerYear : ''}
                    onChange={(e) => setPolicy('leaveDaysPerYear', e.target.value === '' ? NaN : Number(e.target.value))}
                    {...a11y('workPolicy.leaveDaysPerYear', 'leave-days')}
                  />
                  <span>ngày</span>
                </div>
              </Field>
              <Field id="notice-days" label="Thời gian báo trước khi nghỉ" error={fieldError('workPolicy.noticePeriodDays')}>
                <div className="cpe-input-suffix">
                  <input
                    id="notice-days"
                    type="number"
                    min={0}
                    max={180}
                    className="cpe-input"
                    value={form.workPolicy.noticePeriodDays ?? ''}
                    onChange={(e) => setPolicy('noticePeriodDays', e.target.value === '' ? undefined : Number(e.target.value))}
                    {...a11y('workPolicy.noticePeriodDays', 'notice-days')}
                  />
                  <span>ngày</span>
                </div>
              </Field>

              <div className="cpe-field span-2">
                <div className="cpe-label-row">
                  <label htmlFor="benefit-new">Phúc lợi & Đãi ngộ nổi bật</label>
                  <span className="cpe-counter">{benefits.length}/{LIMITS.benefits}</span>
                </div>
                <ol className="cpe-benefit-list">
                  {benefits.map((b, idx) => (
                    <li key={idx} className="cpe-benefit-row">
                      <span className="cpe-benefit-index">{idx + 1}</span>
                      <input
                        type="text"
                        className="cpe-input"
                        value={b}
                        aria-label={`Phúc lợi ${idx + 1}`}
                        onChange={(e) => updateBenefit(idx, e.target.value)}
                      />
                      <div className="cpe-benefit-actions">
                        <button type="button" onClick={() => moveBenefit(idx, -1)} disabled={idx === 0} aria-label="Di chuyển lên">
                          <ArrowUp size={14} />
                        </button>
                        <button type="button" onClick={() => moveBenefit(idx, 1)} disabled={idx === benefits.length - 1} aria-label="Di chuyển xuống">
                          <ArrowDown size={14} />
                        </button>
                        <button type="button" className="danger" onClick={() => removeBenefit(idx)} aria-label={`Xóa phúc lợi ${idx + 1}`}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
                {benefits.length < LIMITS.benefits && (
                  <div className="cpe-benefit-add">
                    <input
                      id="benefit-new"
                      type="text"
                      className="cpe-input"
                      value={benefitDraft}
                      onChange={(e) => setBenefitDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addBenefit();
                        }
                      }}
                      placeholder="VD: Bảo hiểm sức khỏe cao cấp cho nhân viên và người thân"
                    />
                    <button type="button" className="cpe-btn cpe-btn-outline" onClick={addBenefit} disabled={!benefitDraft.trim()}>
                      <Plus size={15} />
                      <span>Thêm</span>
                    </button>
                  </div>
                )}
                <p className="cpe-hint">Phúc lợi được đồng bộ lên Cổng tuyển dụng công khai. Sắp xếp theo mức độ hấp dẫn giảm dần.</p>
              </div>
            </div>
          </section>

          {/* ---------- Sticky action bar ---------- */}
          <div className={`cpe-actionbar ${isDirty ? 'dirty' : ''}`}>
            <div className="cpe-actionbar-status">
              {totalVisibleErrors > 0 ? (
                <>
                  <AlertCircle size={18} className="cpe-text-danger" />
                  <span>
                    Có <strong>{totalVisibleErrors}</strong> trường cần kiểm tra lại
                  </span>
                </>
              ) : isDirty ? (
                <>
                  <span className="cpe-pulse" />
                  <span>
                    Bạn có <strong>{changedKeys.length}</strong> thay đổi chưa lưu
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} className="cpe-text-success" />
                  <span>Mọi thông tin đã được đồng bộ</span>
                </>
              )}
            </div>
            <div className="cpe-actionbar-buttons">
              <button type="button" className="cpe-btn cpe-btn-ghost" onClick={handleDiscard} disabled={!isDirty || isSaving}>
                <RotateCcw size={15} />
                <span>Hoàn tác</span>
              </button>
              <button type="button" className="cpe-btn cpe-btn-secondary" onClick={handleCancel} disabled={isSaving}>
                Hủy bỏ
              </button>
              <button type="submit" className="cpe-btn cpe-btn-primary" disabled={isSaving}>
                {isSaving ? <Loader2 size={16} className="cpe-spin" /> : <Save size={16} />}
                <span>{isSaving ? 'Đang lưu…' : 'Lưu thay đổi hồ sơ'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* ---------- Live preview ---------- */}
        {showPreview && (
          <aside className="cpe-preview" aria-label="Xem trước hồ sơ công khai">
            <div className="cpe-preview-head">
              <Eye size={15} />
              <span>Xem trước trên Cổng tuyển dụng</span>
              <span className="cpe-live-dot">Live</span>
            </div>
            <article className="cpe-preview-card">
              <div
                className="cpe-preview-banner"
                style={form.bannerUrl ? { backgroundImage: `url(${form.bannerUrl})` } : undefined}
              />
              <div className="cpe-preview-body">
                <div className="cpe-preview-logo">
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="" />
                  ) : (
                    <span>{getInitials(form.shortName || form.companyName || '')}</span>
                  )}
                </div>
                <h4>{form.companyName || 'Tên công ty của bạn'}</h4>
                {form.industry && <p className="cpe-preview-industry">{form.industry}</p>}

                <div className="cpe-preview-meta">
                  {form.city && (
                    <span>
                      <MapPin size={12} /> {form.city}
                    </span>
                  )}
                  {form.companySize && (
                    <span>
                      <Users size={12} /> {form.companySize}
                    </span>
                  )}
                  {form.foundedDate && (
                    <span>
                      <Building2 size={12} /> Từ {new Date(form.foundedDate).getFullYear()}
                    </span>
                  )}
                </div>

                <div className="cpe-preview-block">
                  <span className="cpe-preview-label">Về chúng tôi</span>
                  <p className={form.description ? '' : 'cpe-placeholder-text'}>
                    {form.description
                      ? form.description.length > 240
                        ? `${form.description.slice(0, 240)}…`
                        : form.description
                      : 'Phần giới thiệu sẽ hiển thị tại đây.'}
                  </p>
                </div>

                {form.coreValues.length > 0 && (
                  <div className="cpe-preview-block">
                    <span className="cpe-preview-label">Giá trị cốt lõi</span>
                    <div className="cpe-preview-tags">
                      {form.coreValues.slice(0, 6).map((v) => (
                        <span key={v}>{v}</span>
                      ))}
                    </div>
                  </div>
                )}

                {benefits.filter((b) => b.trim()).length > 0 && (
                  <div className="cpe-preview-block">
                    <span className="cpe-preview-label">Phúc lợi nổi bật</span>
                    <ul className="cpe-preview-benefits">
                      {benefits
                        .filter((b) => b.trim())
                        .slice(0, 3)
                        .map((b, i) => (
                          <li key={i}>
                            <CheckCircle2 size={13} />
                            <span>{b}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {form.website && (
                  <a className="cpe-preview-link" href={form.website} target="_blank" rel="noreferrer">
                    <Globe size={13} />
                    <span>{form.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
              </div>
            </article>
          </aside>
        )}
      </div>
    </div>
  );
};

export default CompanyProfileEditor;
