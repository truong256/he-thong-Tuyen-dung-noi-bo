import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  size?: ModalSize;
  footer?: React.ReactNode;
  closeOnOverlayClick?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = 'md',
  footer,
  closeOnOverlayClick = true,
  children,
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="enterprise-modal-overlay" onClick={closeOnOverlayClick ? onClose : undefined}>
      <div
        ref={modalRef}
        className={`enterprise-modal modal-${size} ${className}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {(title || icon) && (
          <div className="enterprise-modal-header">
            <div className="modal-header-info">
              {icon && <div className="modal-header-icon">{icon}</div>}
              <div>
                {title && (
                  <h3 id="modal-title" className="modal-title">
                    {title}
                  </h3>
                )}
                {subtitle && <p className="modal-subtitle">{subtitle}</p>}
              </div>
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
        )}

        <div className="enterprise-modal-body">{children}</div>

        {footer && <div className="enterprise-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
