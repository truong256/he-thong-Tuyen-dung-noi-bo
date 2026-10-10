import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  Clock3,
  GitBranch,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  X,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import adminApi from '../api/admin';
import organizationApi from '../api/organization';
import {
  ApprovalConfiguration,
  ApprovalConfigurationRequest,
  approvalConfigurationApi,
} from '../api/approvalConfiguration';
import { Department } from '../types/organization';
import { UserSummary } from '../types/auth';
import '../styles/approval-configuration.css';

interface EditableStep {
  minimumSalary: string;
  approverUserId: string;
}

const emptyStep = (): EditableStep => ({ minimumSalary: '', approverUserId: '' });

const formatSalary = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} VND`;

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value))
  : 'Không có dữ liệu ngày';

const getErrorMessage = (error: unknown) => {
  const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return responseMessage || (error instanceof Error ? error.message : 'Không thể thực hiện thao tác.');
};

export const ApprovalConfigurationPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [approvers, setApprovers] = useState<UserSummary[]>([]);
  const [configurations, setConfigurations] = useState<ApprovalConfiguration[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [steps, setSteps] = useState<EditableStep[]>([{ minimumSalary: '0', approverUserId: '' }]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [departmentData, approverPages, hrPages, configurationData] = await Promise.all([
        organizationApi.getDepartments(),
        adminApi.listUsers(undefined, 'ACTIVE', 'APPROVER', 0, 100),
        adminApi.listUsers(undefined, 'ACTIVE', 'HR_MANAGER', 0, 100),
        approvalConfigurationApi.list(),
      ]);

      setDepartments(departmentData.filter((department) => department.active));
      const uniqueApprovers = new Map<number, UserSummary>();
      [...approverPages.content, ...hrPages.content]
        .filter((user) => user.status === 'ACTIVE' && (user.roles || []).some((role) => role === 'APPROVER' || role === 'HR_MANAGER'))
        .forEach((user) => uniqueApprovers.set(user.id, user));
      setApprovers(Array.from(uniqueApprovers.values()).sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi')));
      setConfigurations(configurationData);
      setDepartmentId((currentId) => currentId || String(departmentData.find((department) => department.active)?.id || ''));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const departmentConfigurations = useMemo(
    () => configurations
      .filter((configuration) => String(configuration.departmentId) === departmentId)
      .sort((a, b) => b.version - a.version),
    [configurations, departmentId],
  );
  const activeConfiguration = departmentConfigurations.find((configuration) => configuration.active) || null;
  const selectedConfiguration = departmentConfigurations.find((configuration) => configuration.id === selectedVersionId) || activeConfiguration;
  const selectedDepartment = departments.find((department) => String(department.id) === departmentId) || null;

  const startEditing = (configuration: ApprovalConfiguration | null) => {
    setSelectedVersionId(configuration?.id ?? null);
    setSteps(configuration
      ? configuration.steps.map((step) => ({
        minimumSalary: String(step.minimumSalary),
        approverUserId: String(step.approverUserId),
      }))
      : [{ minimumSalary: '0', approverUserId: '' }]);
    setErrorMessage('');
    setIsEditing(true);
  };

  const updateStep = (index: number, field: keyof EditableStep, value: string) => {
    setSteps((current) => current.map((step, stepIndex) => (
      stepIndex === index ? { ...step, [field]: value } : step
    )));
  };

  const moveApprover = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    setSteps((current) => {
      const updated = [...current];
      const currentApprover = updated[index].approverUserId;
      updated[index] = { ...updated[index], approverUserId: updated[targetIndex].approverUserId };
      updated[targetIndex] = { ...updated[targetIndex], approverUserId: currentApprover };
      return updated;
    });
  };

  const addStep = () => {
    setSteps((current) => [...current, emptyStep()]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps((current) => current.filter((_, stepIndex) => stepIndex !== index));
  };

  const validateAndBuildPayload = (): ApprovalConfigurationRequest | null => {
    if (!departmentId) {
      setErrorMessage('Vui lòng chọn phòng ban.');
      return null;
    }
    if (steps.length === 0 || Number(steps[0].minimumSalary) !== 0) {
      setErrorMessage('Cấp đầu tiên phải bắt đầu từ 0 VND.');
      return null;
    }

    const parsedSteps = steps.map((step, index) => ({
      minimumSalary: step.minimumSalary === '' ? NaN : Number(step.minimumSalary),
      approverUserId: step.approverUserId === '' ? NaN : Number(step.approverUserId),
      stepNumber: index + 1,
    }));
    const assignedApprovers = parsedSteps.map((step) => step.approverUserId);

    for (let index = 0; index < parsedSteps.length; index += 1) {
      const step = parsedSteps[index];
      if (!Number.isSafeInteger(step.minimumSalary) || step.minimumSalary < 0) {
        setErrorMessage(`Cấp ${step.stepNumber}: nhập ngưỡng lương là số nguyên không âm.`);
        return null;
      }
      if (!Number.isSafeInteger(step.approverUserId) || step.approverUserId <= 0) {
        setErrorMessage(`Cấp ${step.stepNumber}: chọn người phê duyệt.`);
        return null;
      }
      if (index > 0 && step.minimumSalary <= parsedSteps[index - 1].minimumSalary) {
        setErrorMessage(`Ngưỡng lương cấp ${step.stepNumber} phải cao hơn cấp trước.`);
        return null;
      }
      if (assignedApprovers.indexOf(step.approverUserId) !== index) {
        setErrorMessage('Mỗi người chỉ được xuất hiện một lần trong chuỗi phê duyệt.');
        return null;
      }
    }

    setErrorMessage('');
    return {
      departmentId: Number(departmentId),
      steps: parsedSteps.map(({ minimumSalary, approverUserId }) => ({ minimumSalary, approverUserId })),
    };
  };

  const saveConfiguration = async () => {
    const payload = validateAndBuildPayload();
    if (!payload) return;

    setIsSaving(true);
    try {
      const saved = selectedConfiguration?.active
        ? await approvalConfigurationApi.update(selectedConfiguration.id, payload)
        : await approvalConfigurationApi.create(payload);
      setConfigurations((current) => [saved, ...current.filter((configuration) => configuration.id !== saved.id)
        .map((configuration) => configuration.departmentId === saved.departmentId && configuration.active
          ? { ...configuration, active: false, deactivatedAt: saved.createdAt }
          : configuration)]);
      setSelectedVersionId(saved.id);
      setIsEditing(false);
      setNotice(`Đã lưu cấu hình phiên bản ${saved.version}.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const deactivateConfiguration = async () => {
    if (!activeConfiguration) return;
    setIsDeactivating(true);
    setErrorMessage('');
    try {
      await approvalConfigurationApi.deactivate(activeConfiguration.id);
      setConfigurations((current) => current.map((configuration) => configuration.id === activeConfiguration.id
        ? { ...configuration, active: false, deactivatedAt: new Date().toISOString() }
        : configuration));
      setSelectedVersionId(activeConfiguration.id);
      setIsEditing(false);
      setIsConfirmOpen(false);
      setNotice('Đã ngừng áp dụng cấu hình.');
    } catch (error) {
      setIsConfirmOpen(false);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsDeactivating(false);
    }
  };

  const availableApprovers = (currentStepIndex: number) => {
    const usedByOtherSteps = new Set(steps
      .filter((_, index) => index !== currentStepIndex)
      .map((step) => Number(step.approverUserId))
      .filter(Boolean));
    const selectedId = Number(steps[currentStepIndex]?.approverUserId);
    return approvers.filter((approver) => !usedByOtherSteps.has(approver.id) || approver.id === selectedId);
  };

  return (
    <div className="approval-config-page">
      <PageHeader
        title="Cấu hình luồng phê duyệt"
        subtitle="Thiết lập chuỗi người duyệt theo phòng ban và ngưỡng lương đề xuất."
        breadcrumbs={[
          { label: 'Tổng quan', path: '/dashboard' },
          { label: 'Quy trình tuyển dụng' },
          { label: 'Cấu hình luồng phê duyệt' },
        ]}
        actions={(
          <Button variant="outline" size="sm" icon={<RefreshCw size={15} />} onClick={() => void loadData()} disabled={isLoading}>
            Làm mới
          </Button>
        )}
      />

      {notice && (
        <div className="approval-config-notice" role="status" aria-live="polite">
          <Check size={16} />
          <span>{notice}</span>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setNotice('')}><X size={16} /></button>
        </div>
      )}
      {errorMessage && (
        <div className="approval-config-error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{errorMessage}</span>
          <button type="button" aria-label="Đóng thông báo lỗi" onClick={() => setErrorMessage('')}><X size={16} /></button>
        </div>
      )}

      <section className="approval-config-context" aria-label="Phạm vi cấu hình">
        <div className="approval-config-field">
          <label htmlFor="approval-department">Phòng ban</label>
          <select
            id="approval-department"
            value={departmentId}
            onChange={(event) => {
              setDepartmentId(event.target.value);
              setSelectedVersionId(null);
              setIsEditing(false);
              setErrorMessage('');
            }}
            disabled={isLoading || departments.length === 0}
          >
            {departments.length === 0 && <option value="">Không có phòng ban đang hoạt động</option>}
            {departments.map((department) => (
              <option key={department.id} value={department.id}>{department.name} ({department.code})</option>
            ))}
          </select>
        </div>
        <div className="approval-config-context-meta">
          <span className="approval-config-meta-label">Đang xem</span>
          <strong>{selectedDepartment?.name || 'Chưa chọn phòng ban'}</strong>
          <span>{departmentConfigurations.length} phiên bản đã lưu</span>
        </div>
      </section>

      {isLoading ? (
        <div className="approval-config-state" role="status" aria-live="polite">
          <RefreshCw size={21} className="approval-config-spinner" />
          <span>Đang tải cấu hình và danh sách người phê duyệt...</span>
        </div>
      ) : !departmentId ? (
        <div className="approval-config-state">Chưa có phòng ban đang hoạt động để cấu hình.</div>
      ) : (
        <div className="approval-config-grid">
          <section className="approval-config-panel" aria-labelledby="approval-workflow-title">
            <div className="approval-config-panel-header">
              <div>
                <h2 id="approval-workflow-title">Chuỗi cấp phê duyệt</h2>
                <p>{selectedConfiguration ? `Phiên bản ${selectedConfiguration.version}` : 'Chưa có cấu hình cho phòng ban này'}</p>
              </div>
              <div className="approval-config-header-actions">
                {!isEditing && activeConfiguration && selectedConfiguration?.active && (
                  <Button variant="outline" size="sm" onClick={() => startEditing(activeConfiguration)}>Chỉnh sửa</Button>
                )}
                {!isEditing && activeConfiguration && selectedConfiguration?.active && (
                  <Button variant="danger" size="sm" onClick={() => setIsConfirmOpen(true)}>Ngừng áp dụng</Button>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="approval-config-editor">
                <div className="approval-config-editor-heading">
                  <div>
                    <strong>{selectedConfiguration ? `Tạo phiên bản ${selectedConfiguration.version + 1}` : 'Cấu hình mới'}</strong>
                    <span>Di chuyển người duyệt bằng nút mũi tên. Ngưỡng đầu tiên luôn bắt đầu từ 0 VND.</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<X size={15} />}
                    onClick={() => {
                      setIsEditing(false);
                      setErrorMessage('');
                    }}
                  >
                    Hủy
                  </Button>
                </div>

                <div className="approval-config-step-list" role="list" aria-label="Các cấp phê duyệt có thể chỉnh sửa">
                  {steps.map((step, index) => (
                    <div className="approval-config-step approval-config-step-edit" role="listitem" key={`approval-step-${index}`}>
                      <div className="approval-config-step-index" aria-label={`Cấp ${index + 1}`}>{index + 1}</div>
                      <div className="approval-config-step-input threshold-input">
                        <label htmlFor={`approval-threshold-${index}`}>Từ mức lương</label>
                        <div className="approval-config-money-input">
                          <input
                            id={`approval-threshold-${index}`}
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            value={step.minimumSalary}
                            disabled={index === 0}
                            onChange={(event) => updateStep(index, 'minimumSalary', event.target.value)}
                            aria-describedby={index > 0 ? `approval-threshold-help-${index}` : undefined}
                          />
                          <span>VND</span>
                        </div>
                        {index > 0 && <small id={`approval-threshold-help-${index}`}>Phải cao hơn cấp {index}.</small>}
                      </div>
                      <div className="approval-config-step-input approver-input">
                        <label htmlFor={`approval-approver-${index}`}>Người phê duyệt</label>
                        <select
                          id={`approval-approver-${index}`}
                          value={step.approverUserId}
                          onChange={(event) => updateStep(index, 'approverUserId', event.target.value)}
                        >
                          <option value="">Chọn người duyệt</option>
                          {availableApprovers(index).map((approver) => (
                            <option key={approver.id} value={approver.id}>
                              {approver.fullName} · {(approver.roles || []).filter((role) => role === 'APPROVER' || role === 'HR_MANAGER').join(', ')}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="approval-config-step-controls" aria-label={`Thao tác cấp ${index + 1}`}>
                        <button type="button" className="approval-icon-button" onClick={() => moveApprover(index, -1)} disabled={index === 0} aria-label={`Đưa cấp ${index + 1} lên`} title="Đưa người duyệt lên cấp trước">
                          <ArrowUp size={16} />
                        </button>
                        <button type="button" className="approval-icon-button" onClick={() => moveApprover(index, 1)} disabled={index === steps.length - 1} aria-label={`Đưa cấp ${index + 1} xuống`} title="Đưa người duyệt xuống cấp sau">
                          <ArrowDown size={16} />
                        </button>
                        <button type="button" className="approval-icon-button danger" onClick={() => removeStep(index)} disabled={steps.length <= 1} aria-label={`Xóa cấp ${index + 1}`} title="Xóa cấp">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="approval-config-editor-footer">
                  <Button variant="outline" size="sm" icon={<Plus size={15} />} onClick={addStep}>Thêm cấp</Button>
                  <Button variant="primary" size="sm" icon={<Save size={15} />} onClick={() => void saveConfiguration()} isLoading={isSaving} loadingText="Đang lưu...">
                    Lưu phiên bản
                  </Button>
                </div>
              </div>
            ) : selectedConfiguration ? (
              <>
                <div className="approval-config-statusline">
                  <span className={`approval-config-status ${selectedConfiguration.active ? 'active' : 'inactive'}`}>
                    {selectedConfiguration.active ? <><Check size={14} /> Đang áp dụng</> : <><Clock3 size={14} /> Phiên bản cũ</>}
                  </span>
                  <span>Cập nhật {formatDate(selectedConfiguration.createdAt)}</span>
                </div>
                <div className="approval-config-step-list" aria-label="Các cấp trong luồng">
                  {selectedConfiguration.steps.map((step, index) => (
                    <div className="approval-config-step" key={step.stepOrder}>
                      <div className="approval-config-step-index">{index + 1}</div>
                      <div className="approval-config-step-detail">
                        <span className="approval-config-step-label">{index === 0 ? 'Áp dụng từ' : `Từ cấp lương ${index + 1}`}</span>
                        <strong>{formatSalary(step.minimumSalary)}</strong>
                      </div>
                      <div className="approval-config-approver">
                        <ShieldCheck size={17} aria-hidden="true" />
                        <div>
                          <strong>{step.approverName || `Người dùng #${step.approverUserId}`}</strong>
                          <span>Người phê duyệt</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="approval-config-empty">
                <div className="approval-config-empty-icon"><GitBranch size={22} /></div>
                <h3>Chưa có luồng phê duyệt</h3>
                <p>Tạo chuỗi cấp duyệt theo ngưỡng lương cho {selectedDepartment?.name || 'phòng ban này'}.</p>
                <Button variant="primary" icon={<Plus size={16} />} onClick={() => startEditing(null)}>Tạo cấu hình</Button>
              </div>
            )}
          </section>

          <aside className="approval-config-history" aria-labelledby="approval-history-title">
            <div className="approval-config-history-header">
              <div>
                <h2 id="approval-history-title">Lịch sử phiên bản</h2>
                <p>Thay đổi không ảnh hưởng yêu cầu đang duyệt.</p>
              </div>
              <span>{departmentConfigurations.length}</span>
            </div>
            {departmentConfigurations.length === 0 ? (
              <p className="approval-config-history-empty">Phiên bản được lưu sẽ hiển thị tại đây.</p>
            ) : (
              <ol>
                {departmentConfigurations.map((configuration) => (
                  <li key={configuration.id}>
                    <button
                      type="button"
                      className={`approval-config-history-item ${selectedConfiguration?.id === configuration.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedVersionId(configuration.id);
                        setIsEditing(false);
                        setErrorMessage('');
                      }}
                      aria-current={selectedConfiguration?.id === configuration.id ? 'true' : undefined}
                    >
                      <span className={`approval-config-history-dot ${configuration.active ? 'active' : ''}`} />
                      <span className="approval-config-history-copy">
                        <strong>Phiên bản {configuration.version}</strong>
                        <small>{formatDate(configuration.createdAt)}</small>
                      </span>
                      <span className={`approval-config-history-state ${configuration.active ? 'active' : ''}`}>
                        {configuration.active ? 'Đang dùng' : 'Lưu trữ'}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      )}

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Ngừng áp dụng cấu hình?"
        subtitle="Các yêu cầu đã gửi vẫn giữ nguyên snapshot luồng phê duyệt."
        size="sm"
        footer={(
          <>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Quay lại</Button>
            <Button variant="danger" onClick={() => void deactivateConfiguration()} isLoading={isDeactivating} loadingText="Đang cập nhật...">
              Ngừng áp dụng
            </Button>
          </>
        )}
      >
        <p className="approval-config-confirm-copy">
          Cấu hình phiên bản {activeConfiguration?.version} của {selectedDepartment?.name} sẽ không áp dụng cho yêu cầu mới.
        </p>
      </Modal>
    </div>
  );
};

export default ApprovalConfigurationPage;