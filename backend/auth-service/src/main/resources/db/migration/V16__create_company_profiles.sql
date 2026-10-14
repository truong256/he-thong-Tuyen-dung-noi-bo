-- V16: Create company profiles table for Organization Management
CREATE TABLE IF NOT EXISTS company_profiles (
    id BIGSERIAL PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL,
    short_name VARCHAR(100),
    legal_name VARCHAR(255),
    tax_code VARCHAR(50),
    business_license VARCHAR(255),
    founded_date VARCHAR(50),
    industry VARCHAR(150),
    company_size VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(50),
    website VARCHAR(150),
    address VARCHAR(255),
    city VARCHAR(100),
    country VARCHAR(100),
    description TEXT,
    mission TEXT,
    vision TEXT,
    core_values TEXT,
    legal_representative TEXT,
    work_policy TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100)
);

-- Seed default enterprise profile if table is empty
INSERT INTO company_profiles (
    company_name, short_name, legal_name, tax_code, business_license, founded_date,
    industry, company_size, email, phone, website, address, city, country,
    description, mission, vision, core_values, legal_representative, work_policy, updated_by
)
SELECT
    'Công ty Cổ phần Công nghệ & Giải pháp Tuyển dụng ATS Việt Nam',
    'ATS Corporation',
    'CÔNG TY CỔ PHẦN CÔNG NGHỆ & GIẢI PHÁP TUYỂN DỤNG ATS VIỆT NAM',
    '0109887766',
    '0109887766 cấp ngày 15/10/2018 bởi Sở KH&ĐT TP. Hà Nội',
    '2018-10-15',
    'Công nghệ thông tin & Dịch vụ Phần mềm Quản trị Nhân sự (HRTech / SaaS)',
    '100 - 500 nhân sự',
    'contact@ats-corp.vn',
    '(+84) 24 3998 8899',
    'https://ats-corp.vn',
    'Tầng 12, Tòa nhà Innovation Tower, Số 88 Đường Cầu Giấy, Phường Dịch Vọng Hậu, Quận Cầu Giấy',
    'Hà Nội',
    'Việt Nam',
    'ATS Corporation là đơn vị tiên phong cung cấp giải pháp chuyển đổi số toàn diện cho quy trình tuyển dụng và quản trị nhân tài nội bộ tại Việt Nam.',
    'Đơn giản hóa và số hóa toàn diện quy trình thu hút, tuyển chọn và phát triển nguồn nhân lực chất lượng cao cho các tổ chức tại Việt Nam và khu vực.',
    'Trở thành hệ sinh thái nền tảng công nghệ quản trị tuyển dụng và nhân sự được tin dùng hàng đầu Đông Nam Á vào năm 2030.',
    '["Tận tâm (Dedication)", "Đổi mới sáng tạo (Innovation)", "Chính trực & Minh bạch (Integrity)", "Hiệu quả vượt trội (Excellence)", "Tinh thần đồng đội (One Team)"]',
    '{"name": "Nguyễn Hoàng Long", "title": "Tổng Giám Đốc (Chief Executive Officer)", "phone": "0912 345 678", "email": "long.nh@ats-corp.vn", "idNumber": "001088009988"}',
    '{"standardWorkingHours": "08:30 - 17:30 (Thứ Hai - Thứ Sáu, nghỉ Thứ Bảy & Chủ Nhật)", "workModel": "Hybrid linh hoạt (Hỗ trợ tối đa 2 ngày làm việc từ xa/tuần)", "probationPeriod": "2 tháng (hưởng 100% lương chính thức theo thỏa thuận)", "leaveDaysPerYear": 14, "dressCode": "Smart Casual thoải mái, thanh lịch", "noticePeriodDays": 30, "keyBenefits": ["Gói bảo hiểm sức khỏe cao cấp Bảo Việt / PVI dành cho nhân viên và người thân", "Thưởng lương tháng 13, thưởng hiệu suất tuyển dụng & kinh doanh theo quý", "Ngân sách 15.000.000 VNĐ/năm hỗ trợ đào tạo và chứng chỉ nghề nghiệp quốc tế", "Chuyến du lịch hè thường niên tại các resort 5 sao và chương trình teambuilding", "Phụ cấp ăn trưa, trà, cà phê, hoa quả tươi hàng ngày tại pantry công ty", "Trang bị máy tính xách tay cao cấp (MacBook Pro / Dell XPS) khi nhận việc"]}',
    'Hệ thống'
WHERE NOT EXISTS (SELECT 1 FROM company_profiles);
