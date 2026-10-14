import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CompanyProfileEditor from '../components/organization/CompanyProfileEditor';
import { INITIAL_COMPANY_PROFILE } from '../api/organization';

describe('CompanyProfileEditor (Giao diện chỉnh sửa hồ sơ giới thiệu công ty)', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all sections, navigation buttons, and completeness progress', () => {
    render(
      <CompanyProfileEditor
        profile={INITIAL_COMPANY_PROFILE}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Section headings & labels (present in both nav and section headers)
    expect(screen.getAllByText('Nhận diện thương hiệu').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Thông tin pháp lý').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Liên hệ & Trụ sở').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Giới thiệu & Văn hóa').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Người đại diện').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Chính sách & Phúc lợi').length).toBeGreaterThanOrEqual(1);

    // Completeness card
    expect(screen.getByText('Mức độ hoàn thiện')).toBeInTheDocument();

    // Inputs with initial values
    expect(screen.getByDisplayValue(INITIAL_COMPANY_PROFILE.companyName)).toBeInTheDocument();
    expect(screen.getByDisplayValue(INITIAL_COMPANY_PROFILE.taxCode)).toBeInTheDocument();
  });

  it('updates live preview when modifying company name', () => {
    render(
      <CompanyProfileEditor
        profile={INITIAL_COMPANY_PROFILE}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const nameInput = screen.getByLabelText(/Tên tổ chức \/ Công ty/i);
    fireEvent.change(nameInput, { target: { value: 'Tập đoàn Công nghệ Tương Lai' } });

    // Live preview updates
    expect(screen.getAllByText('Tập đoàn Công nghệ Tương Lai').length).toBeGreaterThan(0);
  });

  it('allows adding and removing core values tags', () => {
    render(
      <CompanyProfileEditor
        profile={INITIAL_COMPANY_PROFILE}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const tagInput = screen.getByPlaceholderText(/Thêm giá trị…|Enter để thêm/i);
    fireEvent.change(tagInput, { target: { value: 'Sáng tạo đột phá' } });
    fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });

    // Shows in tag list and live preview
    expect(screen.getAllByText('Sáng tạo đột phá').length).toBeGreaterThanOrEqual(1);

    // Delete a tag
    const deleteBtn = screen.getByLabelText('Xóa giá trị Sáng tạo đột phá');
    fireEvent.click(deleteBtn);

    expect(screen.queryByText('Sáng tạo đột phá')).not.toBeInTheDocument();
  });

  it('validates invalid tax code format on submit', async () => {
    render(
      <CompanyProfileEditor
        profile={INITIAL_COMPANY_PROFILE}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const taxInput = screen.getByLabelText(/Mã số thuế/i);
    fireEvent.change(taxInput, { target: { value: '123' } });

    const submitBtn = screen.getByRole('button', { name: /Lưu thay đổi hồ sơ/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/MST gồm 10 chữ số hoặc 10 số \+ "-" \+ 3 số/i)
      ).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('calls onSave when submitting valid updated profile', async () => {
    mockOnSave.mockResolvedValue(undefined);

    render(
      <CompanyProfileEditor
        profile={INITIAL_COMPANY_PROFILE}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const nameInput = screen.getByLabelText(/Tên tổ chức \/ Công ty/i);
    fireEvent.change(nameInput, { target: { value: 'Công ty Cổ phần ATS Global' } });

    const submitBtn = screen.getByRole('button', { name: /Lưu thay đổi hồ sơ/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: 'Công ty Cổ phần ATS Global',
        })
      );
    });
  });

  it('calls onCancel when clicking cancel with no unsaved changes', () => {
    render(
      <CompanyProfileEditor
        profile={INITIAL_COMPANY_PROFILE}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /Hủy chỉnh sửa/i });
    fireEvent.click(cancelBtn);

    expect(mockOnCancel).toHaveBeenCalled();
  });
});
