import { useState } from 'react';
import { submitStatusChange } from './api.ts';
import type { FetchLike } from './api.ts';
import { ACTIONS, buildRequestBody, describePipelineWarning, validateForm } from './dialogModel.ts';
import type { DialogAction, FormErrors, PipelineWarningView } from './dialogModel.ts';

export interface RequisitionStatusDialogProps {
  open: boolean;
  action: DialogAction;
  requisition: { id: string; code: string; title: string };
  accessToken: string;
  onClose(): void;
  onDone(): void;
  fetchImpl?: FetchLike;
}

export function RequisitionStatusDialog(props: RequisitionStatusDialogProps) {
  const { open, action, requisition, accessToken, onClose, onDone } = props;
  const cfg = ACTIONS[action];
  const [reasonCode, setReasonCode] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [warning, setWarning] = useState<PipelineWarningView | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function submit(acknowledge: boolean) {
    const form = { reasonCode, note };
    const found = validateForm(action, form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    setServerError(null);
    const doFetch: FetchLike =
      props.fetchImpl ?? ((url, init) => fetch(url, init) as ReturnType<FetchLike>);
    const outcome = await submitStatusChange(doFetch, requisition.id, buildRequestBody(action, form, acknowledge), accessToken);
    setBusy(false);

    if (outcome.kind === 'success') return onDone();
    if (outcome.kind === 'pipeline-warning') return setWarning(describePipelineWarning(outcome.details));
    setServerError(outcome.message);
  }

  const titleId = 'rsd-title';
  return (
    <div className="rsd-backdrop" role="presentation">
      <div className="rsd-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className="rsd-title">{cfg.title}</h2>
        <p className="rsd-subtitle">{requisition.code} · {requisition.title}</p>
        <p className="rsd-desc">{cfg.description}</p>

        {warning ? (
          <div className="rsd-warning" role="alert">
            <strong>Còn {warning.total} ứng viên đang trong pipeline</strong>
            <ul>
              {warning.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <p>Hãy xử lý các ứng viên này trước, hoặc xác nhận tiếp tục.</p>
          </div>
        ) : (
          <>
            <label className="rsd-field">
              <span>Lý do *</span>
              <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} aria-invalid={!!errors.reasonCode}>
                <option value="">-- Chọn lý do --</option>
                {cfg.reasons.map((r) => (
                  <option key={r.code} value={r.code}>{r.label}</option>
                ))}
              </select>
              {errors.reasonCode && <small className="rsd-error">{errors.reasonCode}</small>}
            </label>
            <label className="rsd-field">
              <span>Ghi chú</span>
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={!!errors.note} />
              {errors.note && <small className="rsd-error">{errors.note}</small>}
            </label>
          </>
        )}

        {serverError && <p className="rsd-error" role="alert">{serverError}</p>}

        <div className="rsd-actions">
          <button type="button" className="rsd-btn" onClick={onClose} disabled={busy}>Quay lại</button>
          <button
            type="button"
            className={cfg.danger || warning ? 'rsd-btn rsd-btn-danger' : 'rsd-btn rsd-btn-primary'}
            onClick={() => submit(warning !== null)}
            disabled={busy}
          >
            {warning ? 'Vẫn tiếp tục' : cfg.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
