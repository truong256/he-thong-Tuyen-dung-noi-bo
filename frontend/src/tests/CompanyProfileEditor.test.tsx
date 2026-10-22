import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import CompanyProfileEditor from '../components/organization/CompanyProfileEditor';
import { INITIAL_COMPANY_PROFILE } from '../api/organization';

describe('CompanyProfileEditor — SCRUM-89, 90, 91', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnSave.mockReset();
    mockOnCancel.mockReset();
    mockOnSave.mockResolvedValue(undefined);
  });

  function renderEditor() {
    return render(
      <CompanyProfileEditor
        profile={INITIAL_COMPANY_PROFILE}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
  }

  function getPreview() {
    return screen.getByRole('complementary', {
      name: 'Xem trước hồ sơ công khai',
    });
  }

  it('hiển thị các phần của biểu mẫu và mức độ hoàn thiện', () => {
    renderEditor();

    const sections = [
      'Nhận diện thương hiệu',
      'Thông tin pháp lý',
      'Liên hệ & Trụ sở',
      'Giới thiệu & Văn hóa',
      'Người đại diện',
      'Chính sách & Phúc lợi',
    ];

    sections.forEach((section) => {
      expect(screen.getAllByText(section).length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText('Mức độ hoàn thiện')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(INITIAL_COMPANY_PROFILE.companyName)
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(INITIAL_COMPANY_PROFILE.taxCode)
    ).toBeInTheDocument();
  });

  it('cập nhật tên công ty trong bản xem trước khi chưa lưu', () => {
    renderEditor();

    fireEvent.change(screen.getByLabelText(/Tên tổ chức \/ Công ty/i), {
      target: { value: 'Tập đoàn Công nghệ Tương Lai' },
    });

    expect(
      within(getPreview()).getByText('Tập đoàn Công nghệ Tương Lai')
    ).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('thêm và xóa giá trị cốt lõi trong biểu mẫu và bản xem trước', () => {
    renderEditor();

    const tagInput = screen.getByPlaceholderText(
      /Thêm giá trị…|Enter để thêm/i
    );

    fireEvent.change(tagInput, {
      target: { value: 'Sáng tạo đột phá' },
    });
    fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });

    expect(
      within(getPreview()).getByText('Sáng tạo đột phá')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Xóa giá trị Sáng tạo đột phá'));

    expect(
      screen.queryByText('Sáng tạo đột phá')
    ).not.toBeInTheDocument();
  });

  it('không lưu khi mã số thuế sai định dạng', async () => {
    renderEditor();

    fireEvent.change(screen.getByLabelText(/Mã số thuế/i), {
      target: { value: '123' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /Lưu thay đổi hồ sơ/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/MST gồm 10 chữ số hoặc 10 số \+ "-" \+ 3 số/i)
      ).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('gọi onSave với dữ liệu hợp lệ đã chỉnh sửa', async () => {
    renderEditor();

    fireEvent.change(screen.getByLabelText(/Tên tổ chức \/ Công ty/i), {
      target: { value: 'Công ty Cổ phần ATS Global' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /Lưu thay đổi hồ sơ/i })
    );

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: 'Công ty Cổ phần ATS Global',
        })
      );
    });
  });

  it('gọi onCancel khi hủy mà không có thay đổi', () => {
    renderEditor();

    fireEvent.click(
      screen.getByRole('button', { name: /Hủy chỉnh sửa/i })
    );

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('hiển thị đầy đủ giới thiệu dài trước khi lưu', () => {
    renderEditor();

    const description =
      'Giới thiệu công ty với nội dung đầy đủ. '.repeat(10) +
      'Đây là phần cuối cần xuất hiện trong bản xem trước.';

    fireEvent.change(screen.getByLabelText(/Giới thiệu tổng quan/i), {
      target: { value: description },
    });

    expect(
      within(getPreview()).getByText(description, { exact: true })
    ).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('cập nhật sứ mệnh và tầm nhìn trước khi lưu', () => {
    renderEditor();

    fireEvent.change(screen.getByLabelText(/Sứ mệnh \(Mission\)/i), {
      target: { value: 'Sứ mệnh kiểm tra SCRUM-90' },
    });
    fireEvent.change(screen.getByLabelText(/Tầm nhìn \(Vision\)/i), {
      target: { value: 'Tầm nhìn kiểm tra SCRUM-90' },
    });

    const preview = within(getPreview());

    expect(
      preview.getByText('Sứ mệnh kiểm tra SCRUM-90')
    ).toBeInTheDocument();
    expect(
      preview.getByText('Tầm nhìn kiểm tra SCRUM-90')
    ).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('giữ dữ liệu khi ẩn rồi mở lại bản xem trước', () => {
    renderEditor();

    fireEvent.change(screen.getByLabelText(/Tên tổ chức \/ Công ty/i), {
      target: { value: 'Công ty kiểm tra bật tắt' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /^Ẩn xem trước$/i })
    );

    expect(
      screen.queryByRole('complementary', {
        name: 'Xem trước hồ sơ công khai',
      })
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /^Xem trước$/i })
    );

    expect(
      within(getPreview()).getByText('Công ty kiểm tra bật tắt')
    ).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('cập nhật logo và ảnh bìa trong bản xem trước khi chưa lưu', async () => {
    const { container } = renderEditor();

    const logoInput = container.querySelector('#logo-upload');
    const bannerInput = container.querySelector('#banner-upload');

    if (!logoInput || !bannerInput) {
      throw new Error('Không tìm thấy ô tải logo hoặc ảnh bìa.');
    }

    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">' +
      '<rect width="10" height="10" fill="blue"/></svg>';

    fireEvent.change(logoInput, {
      target: {
        files: [new File([svg], 'logo.svg', { type: 'image/svg+xml' })],
      },
    });
    fireEvent.change(bannerInput, {
      target: {
        files: [new File([svg], 'banner.svg', { type: 'image/svg+xml' })],
      },
    });

    const preview = getPreview();

    await waitFor(() => {
      const logo = preview.querySelector('.cpe-preview-logo img');
      const banner =
        preview.querySelector<HTMLElement>('.cpe-preview-banner');

      expect(logo?.getAttribute('src')).toMatch(
        /^data:image\/svg\+xml;base64,/
      );
      expect(banner?.style.backgroundImage).toContain(
        'data:image/svg+xml;base64,'
      );
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('từ chối file logo không đúng định dạng', () => {
    const { container } = renderEditor();
    const logoInput = container.querySelector('#logo-upload');

    if (!logoInput) {
      throw new Error('Không tìm thấy ô tải logo.');
    }

    const preview = getPreview();
    const previousLogo = preview
      .querySelector('.cpe-preview-logo img')
      ?.getAttribute('src');

    fireEvent.change(logoInput, {
      target: {
        files: [
          new File(['Không phải ảnh'], 'note.txt', {
            type: 'text/plain',
          }),
        ],
      },
    });

    expect(
      screen.getByText('Chỉ hỗ trợ PNG, JPG, WEBP hoặc SVG.')
    ).toBeInTheDocument();
    expect(
      preview.querySelector('.cpe-preview-logo img')?.getAttribute('src')
    ).toBe(previousLogo);
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('từ chối logo có dung lượng lớn hơn 1MB', () => {
    const { container } = renderEditor();
    const logoInput = container.querySelector('#logo-upload');

    if (!logoInput) {
      throw new Error('Không tìm thấy ô tải logo.');
    }

    const oversizedLogo = new File(
      [new Uint8Array(1024 * 1024 + 1)],
      'large-logo.png',
      { type: 'image/png' }
    );

    fireEvent.change(logoInput, {
      target: { files: [oversizedLogo] },
    });

    expect(
      screen.getByText('Dung lượng tối đa 1MB.')
    ).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });
});