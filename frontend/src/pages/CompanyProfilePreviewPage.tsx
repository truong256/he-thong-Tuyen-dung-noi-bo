import { useState } from 'react';
import CompanyProfileEditor from '../components/organization/CompanyProfileEditor';
import type { CompanyProfile } from '../types/organization';

const sampleProfile: CompanyProfile = {
  companyName: 'Công ty Công nghệ Việt',
  shortName: 'TechViet',
  legalName: 'Công ty TNHH Công nghệ Việt',
  taxCode: '0101234567',
  foundedDate: '2020-01-15',
  industry: 'Công nghệ thông tin',
  companySize: '51-200',
  email: 'contact@example.com',
  phone: '0901234567',
  website: 'https://example.com',
  address: '123 Nguyễn Trãi',
  city: 'Hà Nội',
  country: 'Việt Nam',
  description:
    'Chúng tôi phát triển các giải pháp phần mềm phục vụ doanh nghiệp.\nĐội ngũ luôn đề cao sự sáng tạo và tinh thần hợp tác.',
  mission: 'Mang công nghệ đến gần hơn với mọi doanh nghiệp.',
  vision: 'Trở thành doanh nghiệp công nghệ được khách hàng tin tưởng.',
  coreValues: ['Sáng tạo', 'Hợp tác', 'Trách nhiệm'],
  legalRepresentative: {
    name: 'Nguyễn Văn An',
    title: 'Giám đốc',
    email: 'director@example.com',
    phone: '0901234567',
  },
  workPolicy: {
    standardWorkingHours: 'Thứ 2 đến thứ 6, 08:00–17:00',
    workModel: 'Hybrid',
    probationPeriod: '2 tháng',
    leaveDaysPerYear: 12,
    keyBenefits: [
      'Bảo hiểm sức khỏe',
      'Đào tạo chuyên môn',
      'Du lịch hằng năm',
      'Thưởng theo hiệu quả công việc',
    ],
    dressCode: 'Trang phục lịch sự',
    noticePeriodDays: 30,
  },
};

export default function CompanyProfilePreviewPage() {
  const [profile, setProfile] = useState<CompanyProfile>(sampleProfile);
  const [editorVersion, setEditorVersion] = useState(0);
  const [message, setMessage] = useState('');

  async function handleSave(data: CompanyProfile): Promise<void> {
    setProfile(data);
    setMessage('Đã lưu dữ liệu mẫu trong phiên xem thử.');
  }

  function handleCancel() {
    setEditorVersion((value) => value + 1);
    setMessage('Đã trở về dữ liệu mẫu được lưu gần nhất.');
  }

  return (
    <main style={{ padding: 24, background: '#f5f7fb', minHeight: '100vh' }}>
      <p>
        Xem thử SCRUM-90 — dữ liệu mẫu chỉ lưu trong phiên này.
      </p>

      {message && <p role="status">{message}</p>}

      <CompanyProfileEditor
        key={editorVersion}
        profile={profile}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </main>
  );
}