import React, { useState, useEffect } from 'react';
import { X, MapPin, AlertCircle, Save } from 'lucide-react';
import { BranchLocation, LocationType } from '../../types/organization';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (locData: Omit<BranchLocation, 'id'> | Partial<BranchLocation>) => Promise<void>;
  location: BranchLocation | null;
}

const LOCATION_TYPE_OPTIONS: { value: LocationType; label: string }[] = [
  { value: 'HEADQUARTER', label: 'Trụ sở chính' },
  { value: 'BRANCH', label: 'Chi nhánh' },
  { value: 'RD_CENTER', label: 'Trung tâm Nghiên cứu & Phát triển (R&D)' },
  { value: 'REPRESENTATIVE_OFFICE', label: 'Văn phòng đại diện' },
];

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  location,
}) => {
  const isEditing = Boolean(location);

  const [name, setName] = useState('');
  const [type, setType] = useState<LocationType>('BRANCH');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [managerName, setManagerName] = useState('');
  const [isHeadquarter, setIsHeadquarter] = useState(false);
  const [active, setActive] = useState(true);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (location) {
      setName(location.name || '');
      setType(location.type || 'BRANCH');
      setAddress(location.address || '');
      setCity(location.city || '');
      setPhone(location.phone || '');
      setEmail(location.email || '');
      setManagerName(location.managerName || '');
      setIsHeadquarter(location.isHeadquarter || false);
      setActive(location.active !== undefined ? location.active : true);
    } else {
      setName('');
      setType('BRANCH');
      setAddress('');
      setCity('');
      setPhone('');
      setEmail('');
      setManagerName('');
      setIsHeadquarter(false);
      setActive(true);
    }
    setValidationError(null);
  }, [location, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    const trimmedCity = city.trim();

    if (!trimmedName) {
      setValidationError('Vui lòng nhập tên địa điểm / chi nhánh.');
      return;
    }
    if (!trimmedAddress) {
      setValidationError('Vui lòng nhập địa chỉ chi tiết.');
      return;
    }
    if (!trimmedCity) {
      setValidationError('Vui lòng nhập Tỉnh / Thành phố.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        name: trimmedName,
        type,
        address: trimmedAddress,
        city: trimmedCity,
        phone: phone.trim(),
        email: email.trim(),
        managerName: managerName.trim() || undefined,
        isHeadquarter,
        active,
      });
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'Có lỗi xảy ra khi lưu địa điểm. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loc-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog modal-md" data-testid="location-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <MapPin size={20} className="modal-title-icon" />
            <h3 id="loc-modal-title">
              {isEditing ? 'Chỉnh sửa Địa điểm & Chi nhánh' : 'Thêm mới Địa điểm & Chi nhánh'}
            </h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {validationError && (
              <div className="modal-alert-error" role="alert">
                <AlertCircle size={16} />
                <span>{validationError}</span>
              </div>
            )}

            <div className="form-grid-2">
              {/* Tên cơ sở */}
              <div className="form-group span-2">
                <label htmlFor="loc-name">
                  Tên chi nhánh / Văn phòng <span className="text-danger">*</span>
                </label>
                <input
                  id="loc-name"
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: Văn phòng Chi nhánh TP. Hồ Chí Minh"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Loại cơ sở */}
              <div className="form-group">
                <label htmlFor="loc-type">Phân loại địa điểm</label>
                <select
                  id="loc-type"
                  className="form-control"
                  value={type}
                  onChange={(e) => setType(e.target.value as LocationType)}
                >
                  {LOCATION_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tỉnh / Thành phố */}
              <div className="form-group">
                <label htmlFor="loc-city">
                  Tỉnh / Thành phố <span className="text-danger">*</span>
                </label>
                <input
                  id="loc-city"
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: Hà Nội, TP. Hồ Chí Minh, Đà Nẵng..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>

              {/* Địa chỉ chi tiết */}
              <div className="form-group span-2">
                <label htmlFor="loc-address">
                  Địa chỉ chi tiết <span className="text-danger">*</span>
                </label>
                <input
                  id="loc-address"
                  type="text"
                  className="form-control"
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>

              {/* Số điện thoại */}
              <div className="form-group">
                <label htmlFor="loc-phone">Hotline / Điện thoại liên hệ</label>
                <input
                  id="loc-phone"
                  type="text"
                  className="form-control"
                  placeholder="024 3998 8899"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* Email liên hệ */}
              <div className="form-group">
                <label htmlFor="loc-email">Email văn phòng</label>
                <input
                  id="loc-email"
                  type="email"
                  className="form-control"
                  placeholder="office@ats-corp.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Quản lý cơ sở */}
              <div className="form-group">
                <label htmlFor="loc-manager">Người phụ trách văn phòng</label>
                <input
                  id="loc-manager"
                  type="text"
                  className="form-control"
                  placeholder="Họ và tên người quản lý"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                />
              </div>

              {/* Checkbox Trụ sở chính & Active */}
              <div className="form-group flex-col justify-center">
                <label className="checkbox-custom-label">
                  <input
                    type="checkbox"
                    checked={isHeadquarter}
                    onChange={(e) => setIsHeadquarter(e.target.checked)}
                  />
                  <span>Đặt làm Trụ sở chính của tổ chức</span>
                </label>
                <label className="checkbox-custom-label mt-2">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                  <span>Đang hoạt động</span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Thêm mới'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LocationModal;
