import { JobTitle, JobTitleStatistics, JobTitleFilterState, LEVEL_METADATA } from '../types/jobTitle';
import { INITIAL_DEPARTMENTS } from './organization';
import apiClient from './client';

const STORAGE_KEYS = {
  JOB_TITLES: 'ats_job_titles',
};

export const INITIAL_JOB_TITLES: JobTitle[] = [
  {
    id: 1,
    title: 'Kỹ sư Phần mềm Backend Cao cấp (Senior Backend Engineer)',
    code: 'BE-SR-01',
    departmentId: 3,
    departmentName: 'Phòng Phát triển Phần mềm Backend',
    level: 'SENIOR',
    jobFamily: 'TECH',
    minSalary: 35000000,
    maxSalary: 55000000,
    salaryRangeDisplay: '35 - 55 triệu VNĐ',
    jobDescription:
      'Chịu trách nhiệm thiết kế, tối ưu hóa các dịch vụ backend vi mô (Microservices), cơ sở dữ liệu phân tán và kiến trúc bảo mật chịu tải cao cho hệ thống ATS nội bộ.',
    keyResponsibilities: [
      'Thiết kế và phát triển RESTful & gRPC APIs hiệu năng cao trên Spring Boot / Node.js',
      'Tối ưu hóa truy vấn PostgreSQL, indexing và cấu trúc dữ liệu cho hàng triệu bản ghi CV',
      'Đảm bảo an toàn bảo mật dữ liệu, chuẩn hóa phân quyền RBAC và mã hóa dữ liệu nhạy cảm',
      'Tham gia review code, hướng dẫn mentoring cho các thành viên Junior và Middle',
    ],
    requirements: [
      'Tối thiểu 4+ năm kinh nghiệm lập trình backend với Java/Spring Boot hoặc Golang/Node.js',
      'Thành thạo cơ sở dữ liệu quan hệ (PostgreSQL/MySQL), hiểu sâu về transaction, concurrency',
      'Kinh nghiệm thực tế với kiến trúc Microservices, Docker, Kafka hoặc RabbitMQ',
      'Tư duy phân tích bài toán tốt, chú trọng chất lượng mã nguồn và tự động hóa kiểm thử',
    ],
    competencies: ['Kiến trúc phần mềm', 'Tối ưu hiệu năng CSDL', 'Bảo mật hệ thống', 'Code Review'],
    standardHeadcount: 15,
    currentHeadcount: 12,
    openRequisitions: 3,
    active: true,
    createdAt: '2023-01-15',
    updatedAt: '2024-02-10',
    updatedBy: 'Admin Hệ thống',
  },
  {
    id: 2,
    title: 'Kỹ sư Phát triển Giao diện (Middle Frontend Developer)',
    code: 'FE-MID-02',
    departmentId: 4,
    departmentName: 'Phòng Phát triển Giao diện Frontend',
    level: 'MIDDLE',
    jobFamily: 'TECH',
    minSalary: 22000000,
    maxSalary: 35000000,
    salaryRangeDisplay: '22 - 35 triệu VNĐ',
    jobDescription:
      'Xây dựng các giao diện người dùng trực quan, responsive và có độ mượt mà cao cho hệ thống ATS, từ bảng Kanban tuyển dụng đến báo cáo thống kê chuyên sâu.',
    keyResponsibilities: [
      'Phát triển các component và tính năng người dùng bằng React 18, TypeScript và CSS hiện đại',
      'Tối ưu hóa hiệu năng tải trang, thời gian phản hồi tương tác (Core Web Vitals)',
      'Phối hợp chặt chẽ với UI/UX Designer và Backend team để tích hợp API liền mạch',
      'Bảo đảm khả năng tiếp cận (Accessibility - a11y) và tính tương thích trên mọi thiết bị',
    ],
    requirements: [
      'Từ 2 - 4 năm kinh nghiệm chuyên sâu với React, TypeScript và quản lý trạng thái hiện đại',
      'Hiểu rõ về layout responsive, Modern CSS (Flexbox, Grid, CSS Variables)',
      'Kinh nghiệm viết Unit Test với Vitest/Jest và React Testing Library',
      'Giao tiếp tốt, chủ động đề xuất giải pháp cải thiện trải nghiệm người dùng',
    ],
    competencies: ['React & TypeScript', 'Tối ưu UI/UX', 'Kiểm thử Frontend', 'Thiết kế Component'],
    standardHeadcount: 16,
    currentHeadcount: 14,
    openRequisitions: 2,
    active: true,
    createdAt: '2023-01-18',
    updatedAt: '2024-03-01',
    updatedBy: 'Admin Hệ thống',
  },
  {
    id: 3,
    title: 'Kiến trúc sư Giải pháp Phần mềm (Solution Architect)',
    code: 'TECH-ARCH-03',
    departmentId: 2,
    departmentName: 'Khối Công nghệ & Kỹ thuật',
    level: 'LEAD',
    jobFamily: 'TECH',
    minSalary: 55000000,
    maxSalary: 85000000,
    salaryRangeDisplay: '55 - 85 triệu VNĐ',
    jobDescription:
      'Định hình kiến trúc kỹ thuật toàn diện cho nền tảng ATS, phê duyệt các quyết định công nghệ quan trọng và bảo đảm tính mở rộng trong 5 năm tới.',
    keyResponsibilities: [
      'Chủ trì thiết kế kiến trúc hệ thống tổng thể, bảo đảm tiêu chuẩn an toàn thông tin ISO 27001',
      'Đánh giá và lựa chọn công nghệ lõi, định hướng kỹ thuật cho toàn khối Engineering',
      'Giải quyết các nút thắt cổ chai phức tạp về hiệu năng, mở rộng quy mô (Scalability)',
      'Xây dựng quy chuẩn kỹ thuật và văn hóa đổi mới sáng tạo trong đội ngũ',
    ],
    requirements: [
      'Tối thiểu 8+ năm kinh nghiệm phát triển phần mềm, trong đó 3+ năm ở vị trí Architect',
      'Thành thạo kiến trúc Cloud Native (AWS/GCP), Microservices, Kubernetes',
      'Hiểu sâu sắc về dữ liệu lớn, Distributed Caching và bảo mật ứng dụng cấp doanh nghiệp',
    ],
    competencies: ['Kiến trúc Cloud-Native', 'Thiết kế Hệ thống phân tán', 'Lãnh đạo kỹ thuật'],
    standardHeadcount: 4,
    currentHeadcount: 3,
    openRequisitions: 1,
    active: true,
    createdAt: '2022-11-05',
    updatedAt: '2024-01-20',
    updatedBy: 'Admin Hệ thống',
  },
  {
    id: 4,
    title: 'Trưởng nhóm Đảm bảo Chất lượng & Kiểm thử (QA/QC Lead)',
    code: 'QA-LEAD-04',
    departmentId: 5,
    departmentName: 'Phòng Đảm bảo Chất lượng & Kiểm thử (QA/QC)',
    level: 'LEAD',
    jobFamily: 'TECH',
    minSalary: 32000000,
    maxSalary: 48000000,
    salaryRangeDisplay: '32 - 48 triệu VNĐ',
    jobDescription:
      'Lãnh đạo đội ngũ kiểm thử chất lượng, thiết lập chiến lược kiểm thử tự động (Automation Test), kiểm thử bảo mật và quy trình Release cho hệ thống.',
    keyResponsibilities: [
      'Xây dựng chiến lược kiểm thử toàn diện: Functional, Regression, Performance & Security',
      'Thiết lập và mở rộng Automation Framework bằng Playwright / Cypress / Selenium',
      'Quản lý quy trình báo cáo lỗi (Bug Life Cycle), đánh giá rủi ro trước mỗi bản phát hành',
      'Đào tạo và nâng cao năng lực kiểm thử tự động cho toàn bộ kỹ sư QA',
    ],
    requirements: [
      '5+ năm kinh nghiệm trong lĩnh vực Software Testing, tối thiểu 2 năm dẫn dắt team',
      'Thành thạo viết kịch bản Automation Test (JavaScript/TypeScript hoặc Python/Java)',
      'Kinh nghiệm tích hợp kiểm thử tự động vào CI/CD Pipeline (GitLab CI, GitHub Actions)',
    ],
    competencies: ['Chiến lược Kiểm thử', 'Automation Testing', 'Quản lý Rủi ro Chất lượng'],
    standardHeadcount: 3,
    currentHeadcount: 2,
    openRequisitions: 1,
    active: true,
    createdAt: '2023-02-10',
    updatedAt: '2024-02-15',
    updatedBy: 'Trần Quốc Anh (CTO)',
  },
  {
    id: 5,
    title: 'Kỹ sư Đám mây & Vận hành Hạ tầng (Senior DevOps Engineer)',
    code: 'OPS-SR-05',
    departmentId: 6,
    departmentName: 'Phòng Hạ tầng & Điện toán đám mây (DevOps)',
    level: 'SENIOR',
    jobFamily: 'TECH',
    minSalary: 38000000,
    maxSalary: 60000000,
    salaryRangeDisplay: '38 - 60 triệu VNĐ',
    jobDescription:
      'Vận hành hạ tầng đám mây độ sẵn sàng cao (High Availability), tự động hóa toàn bộ luồng CI/CD và giám sát hệ thống 24/7.',
    keyResponsibilities: [
      'Quản trị cụm Kubernetes (EKS/GKE), triển khai hạ tầng dưới dạng mã nguồn (Terraform/Ansible)',
      'Tối ưu hóa chi phí hạ tầng Cloud và xây dựng hệ thống dự phòng thảm họa (Disaster Recovery)',
      'Thiết lập hệ thống giám sát cảnh báo tức thời với Prometheus, Grafana, ELK Stack',
      'Bảo đảm tuân thủ các quy tắc bảo mật mạng nội bộ và tường lửa ứng dụng (WAF)',
    ],
    requirements: [
      '4+ năm kinh nghiệm chuyên môn DevOps / Site Reliability Engineering (SRE)',
      'Thành thạo Kubernetes, Docker, Helm Charts, Linux OS và Cloud Providers (AWS/GCP/Azure)',
      'Kinh nghiệm xây dựng CI/CD Pipeline ổn định cho các hệ sinh thái lớn',
    ],
    competencies: ['Quản trị Kubernetes', 'Infrastructure as Code', 'Hệ thống Giám sát & SRE'],
    standardHeadcount: 6,
    currentHeadcount: 5,
    openRequisitions: 1,
    active: true,
    createdAt: '2023-03-01',
    updatedAt: '2024-01-10',
    updatedBy: 'Admin Hệ thống',
  },
  {
    id: 6,
    title: 'Chuyên viên Thu hút Nhân tài & Tuyển dụng (Senior Talent Acquisition)',
    code: 'HR-TA-06',
    departmentId: 8,
    departmentName: 'Ban Tuyển dụng & Thu hút Nhân tài',
    level: 'SENIOR',
    jobFamily: 'HR',
    minSalary: 22000000,
    maxSalary: 35000000,
    salaryRangeDisplay: '22 - 35 triệu VNĐ',
    jobDescription:
      'Chủ động tìm kiếm, thu hút và sàng lọc các ứng viên kỹ thuật & quản lý tài năng; điều phối quy trình phỏng vấn và xây dựng thương hiệu nhà tuyển dụng.',
    keyResponsibilities: [
      'Xây dựng mạng lưới ứng viên tiềm năng (Talent Pool) cho các vị trí IT & Business then chốt',
      'Phối hợp với Hiring Manager xác định tiêu chí khung năng lực và lập kế hoạch tuyển dụng',
      'Sàng lọc CV, phỏng vấn sơ bộ về văn hóa và đàm phán thư mời nhận việc (Offer Letter)',
      'Tham gia tổ chức các sự kiện Job Fair, Tech Talk và Employer Branding tại các trường ĐH',
    ],
    requirements: [
      '3+ năm kinh nghiệm tuyển dụng trong ngành CNTT / Công nghệ (Tech Recruiter)',
      'Kỹ năng đàm phán, giao tiếp xuất sắc và khả năng thấu hiểu tâm lý ứng viên',
      'Sử dụng thành thạo các công cụ tìm kiếm nhân sự (LinkedIn Recruiter, Git, TopCV, nội bộ)',
    ],
    competencies: ['Săn tìm Nhân tài', 'Đàm phán Đãi ngộ', 'Employer Branding', 'Giao tiếp Ứng viên'],
    standardHeadcount: 8,
    currentHeadcount: 6,
    openRequisitions: 2,
    active: true,
    createdAt: '2023-01-20',
    updatedAt: '2024-02-28',
    updatedBy: 'Hoàng Thị Mai (CHRO)',
  },
  {
    id: 7,
    title: 'Chuyên viên Đào tạo & Văn hóa Doanh nghiệp (L&D Specialist)',
    code: 'HR-LND-07',
    departmentId: 9,
    departmentName: 'Ban Đào tạo & Văn hóa Doanh nghiệp',
    level: 'MIDDLE',
    jobFamily: 'HR',
    minSalary: 18000000,
    maxSalary: 28000000,
    salaryRangeDisplay: '18 - 28 triệu VNĐ',
    jobDescription:
      'Thiết kế và triển khai chương trình đào tạo hội nhập (Onboarding), khảo sát nhu cầu đào tạo (TNA) và thúc đẩy các hoạt động văn hóa gắn kết.',
    keyResponsibilities: [
      'Tổ chức chương trình hội nhập cho nhân sự mới, đảm bảo trải nghiệm onboarding chuyên nghiệp',
      'Phát triển giáo trình đào tạo kỹ năng mềm và phối hợp tổ chức các workshop chuyên môn',
      'Theo dõi và đánh giá hiệu quả sau đào tạo (ROI), quản lý ngân sách đào tạo nội bộ',
    ],
    requirements: [
      '2+ năm kinh nghiệm vị trí Learning & Development hoặc Internal Communication',
      'Khả năng thuyết trình truyền cảm hứng, tổ chức sự kiện và xây dựng tài liệu học tập',
    ],
    competencies: ['Thiết kế Chương trình Đào tạo', 'Gắn kết Nhân viên', 'Truyền thông Nội bộ'],
    standardHeadcount: 5,
    currentHeadcount: 4,
    openRequisitions: 1,
    active: true,
    createdAt: '2023-04-12',
    updatedAt: '2024-03-05',
    updatedBy: 'Hoàng Thị Mai (CHRO)',
  },
  {
    id: 8,
    title: 'Trưởng phòng Quản trị Nhân sự (HR Manager)',
    code: 'HR-MGR-08',
    departmentId: 7,
    departmentName: 'Khối Quản trị Nhân sự & Tuyển dụng',
    level: 'MANAGER',
    jobFamily: 'HR',
    minSalary: 45000000,
    maxSalary: 65000000,
    salaryRangeDisplay: '45 - 65 triệu VNĐ',
    jobDescription:
      'Quản lý toàn diện các hoạt động nhân sự của công ty bao gồm hoạch định nguồn nhân lực, chính sách đãi ngộ C&B, quan hệ lao động và tuân thủ pháp luật.',
    keyResponsibilities: [
      'Xây dựng và kiểm soát ngân sách quỹ lương thưởng và định biên nhân sự toàn công ty',
      'Hoàn thiện hệ thống chính sách đãi ngộ, khung năng lực và tiêu chí đánh giá KPI/OKR',
      'Giải quyết các vấn đề quan hệ lao động, tranh chấp và tuân thủ Luật Lao động Việt Nam',
      'Tư vấn chiến lược nhân sự cho Ban Tổng Giám Đốc nhằm hỗ trợ mục tiêu tăng trưởng kinh doanh',
    ],
    requirements: [
      '6+ năm kinh nghiệm nhân sự tổng hợp, tối thiểu 2 năm ở cấp độ Quản lý / Trưởng phòng',
      'Hiểu biết sâu sắc Luật Lao động, bảo hiểm xã hội, thuế thu nhập cá nhân',
      'Kỹ năng lãnh đạo đội ngũ, giải quyết xung đột và tư duy chiến lược nhân tài',
    ],
    competencies: ['Chiến lược Nhân sự', 'Chính sách C&B', 'Quan hệ Lao động', 'Quản lý Ngân sách'],
    standardHeadcount: 2,
    currentHeadcount: 2,
    openRequisitions: 0,
    active: true,
    createdAt: '2022-10-15',
    updatedAt: '2024-01-15',
    updatedBy: 'Ban Giám Đốc',
  },
  {
    id: 9,
    title: 'Trưởng nhóm Kinh doanh Giải pháp Doanh nghiệp (B2B Sales Lead)',
    code: 'COMM-SALE-09',
    departmentId: 10,
    departmentName: 'Khối Kinh doanh & Tiếp thị Doanh nghiệp',
    level: 'LEAD',
    jobFamily: 'BUSINESS',
    minSalary: 30000000,
    maxSalary: 50000000,
    salaryRangeDisplay: '30 - 50 triệu VNĐ + Hoa hồng',
    jobDescription:
      'Dẫn dắt đội ngũ kinh doanh mở rộng thị phần phần mềm ATS tới các khách hàng doanh nghiệp quy mô từ 500 - 5.000 nhân viên.',
    keyResponsibilities: [
      'Xây dựng chiến lược tiếp cận khách hàng mục tiêu và kế hoạch doanh số định kỳ',
      'Trực tiếp đàm phán các hợp đồng thương mại lớn và duy trì mối quan hệ đối tác chiến lược',
      'Đào tạo và giám sát chỉ số hiệu suất kinh doanh (Sales Pipeline, Win Rate) của đội ngũ',
    ],
    requirements: [
      '4+ năm kinh nghiệm B2B Sales, ưu tiên trong ngành phần mềm SaaS / IT Solutions',
      'Mạng lưới quan hệ rộng với các Giám đốc Nhân sự (CHRO/HRD) tại Việt Nam',
      'Kỹ năng đàm phán cấp cao và quản lý đội ngũ kinh doanh nhiệt huyết',
    ],
    competencies: ['Đàm phán Hợp đồng B2B', 'Quản lý Pipeline Kinh doanh', 'Phát triển Khách hàng'],
    standardHeadcount: 10,
    currentHeadcount: 7,
    openRequisitions: 3,
    active: true,
    createdAt: '2023-02-05',
    updatedAt: '2024-03-10',
    updatedBy: 'Phan Văn Hưng (CCO)',
  },
  {
    id: 10,
    title: 'Kế toán trưởng Doanh nghiệp (Chief Accountant)',
    code: 'FIN-ACC-10',
    departmentId: 11,
    departmentName: 'Khối Tài chính - Kế toán & Vận hành',
    level: 'MANAGER',
    jobFamily: 'FINANCE_OPS',
    minSalary: 35000000,
    maxSalary: 50000000,
    salaryRangeDisplay: '35 - 50 triệu VNĐ',
    jobDescription:
      'Chịu trách nhiệm toàn diện về công tác kế toán, báo cáo tài chính kiểm toán, kiểm soát chi phí hoạt động và tuân thủ chính sách thuế của nhà nước.',
    keyResponsibilities: [
      'Lập báo cáo tài chính quý/năm theo chuẩn mực kế toán Việt Nam (VAS) và IFRS',
      'Làm việc với cơ quan thuế, công ty kiểm toán độc lập và ngân hàng thương mại',
      'Kiểm soát dòng tiền, kế hoạch thanh toán lương và các khoản chi phí tuyển dụng',
    ],
    requirements: [
      'Có chứng chỉ Kế toán trưởng hợp lệ, ưu tiên có chứng chỉ CPA/ACCA',
      '5+ năm kinh nghiệm kế toán tổng hợp, trong đó 2+ năm ở vị trí Kế toán trưởng',
      'Nắm vững luật thuế, các quy định tài chính kế toán hiện hành',
    ],
    competencies: ['Báo cáo Tài chính VAS/IFRS', 'Kiểm soát Ngân sách', 'Luật Thuế Doanh nghiệp'],
    standardHeadcount: 2,
    currentHeadcount: 2,
    openRequisitions: 0,
    active: true,
    createdAt: '2022-10-20',
    updatedAt: '2024-01-05',
    updatedBy: 'Bùi Thanh Hằng (CFO)',
  },
  {
    id: 11,
    title: 'Thực tập sinh Lập trình Web (Frontend Intern)',
    code: 'FE-INT-11',
    departmentId: 4,
    departmentName: 'Phòng Phát triển Giao diện Frontend',
    level: 'INTERN',
    jobFamily: 'TECH',
    minSalary: 6000000,
    maxSalary: 9000000,
    salaryRangeDisplay: '6 - 9 triệu VNĐ (Phụ cấp)',
    jobDescription:
      'Tham gia học tập, đóng góp vào các module phụ trợ của hệ thống ATS dưới sự hướng dẫn trực tiếp từ các kỹ sư Senior.',
    keyResponsibilities: [
      'Viết component cơ bản với React, HTML5, CSS3 theo thiết kế Figma',
      'Sửa các lỗi nhỏ về giao diện và kiểm thử thủ công chức năng',
      'Tham gia đầy đủ các buổi tech share và đào tạo nội bộ của phòng ban',
    ],
    requirements: [
      'Sinh viên năm cuối hoặc mới tốt nghiệp chuyên ngành CNTT / Phần mềm',
      'Nắm chắc kiến thức nền tảng về JavaScript, HTML/CSS và React căn bản',
      'Ham học hỏi, có thái độ cầu tiến và tinh thần trách nhiệm cao',
    ],
    competencies: ['Kiến thức Nền tảng Frontend', 'Tinh thần Học tập', 'Làm việc Nhóm'],
    standardHeadcount: 5,
    currentHeadcount: 4,
    openRequisitions: 1,
    active: true,
    createdAt: '2023-05-15',
    updatedAt: '2024-02-01',
    updatedBy: 'Lê Thu Trang (Lead FE)',
  },
  {
    id: 12,
    title: 'Giám đốc Công nghệ (Chief Technology Officer - CTO)',
    code: 'EXEC-CTO-12',
    departmentId: 1,
    departmentName: 'Ban Tổng Giám Đốc (BOD)',
    level: 'EXECUTIVE',
    jobFamily: 'TECH',
    minSalary: 80000000,
    maxSalary: 130000000,
    salaryRangeDisplay: '80 - 130 triệu VNĐ + Cổ phần',
    jobDescription:
      'Lãnh đạo toàn bộ chiến lược công nghệ, sản phẩm kỹ thuật và đội ngũ kỹ sư của công ty; đảm bảo năng lực cạnh tranh vượt trội của nền tảng.',
    keyResponsibilities: [
      'Xây dựng chiến lược công nghệ dài hạn phù hợp với mục tiêu kinh doanh của doanh nghiệp',
      'Đại diện kỹ thuật trước Hội đồng quản trị, đối tác lớn và các nhà đầu tư',
      'Dẫn dắt chuyển đổi số và thúc đẩy văn hóa kỹ thuật xuất sắc (Engineering Excellence)',
    ],
    requirements: [
      '10+ năm kinh nghiệm kỹ thuật với tối thiểu 4 năm tại vị trí CTO / VP of Engineering',
      'Thành tích đã từng dẫn dắt mở rộng quy mô hệ thống SaaS phục vụ hàng trăm nghìn người dùng',
      'Tầm nhìn công nghệ chiến lược và khả năng lãnh đạo truyền cảm hứng',
    ],
    competencies: ['Lãnh đạo Chiến lược Công nghệ', 'Quản trị Khối Kỹ thuật', 'Đổi mới Sáng tạo'],
    standardHeadcount: 1,
    currentHeadcount: 1,
    openRequisitions: 0,
    active: true,
    createdAt: '2022-09-01',
    updatedAt: '2024-01-01',
    updatedBy: 'Hội đồng Quản trị',
  },
];

// Helper to safely access localStorage with fallback
const getStoredData = <T>(key: string, defaultValue: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
};

const setStoredData = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[JobTitleApi] Failed to write to localStorage for key: ${key}`, err);
  }
};

export const jobTitleApi = {
  // Fetch all with filtering and department enrichment
  getJobTitles: async (filters?: Partial<JobTitleFilterState>): Promise<JobTitle[]> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token && !token.startsWith('mock-')) {
      try {
        const params = new URLSearchParams();
        if (filters?.search) params.append('search', filters.search);
        if (filters?.status && filters.status !== 'ALL') {
          params.append('active', String(filters.status === 'ACTIVE'));
        }
        if (filters?.departmentId && filters.departmentId !== 'ALL') {
          params.append('departmentId', String(filters.departmentId));
        }

        const res = await apiClient.get<any[]>(`/api/job-titles?${params.toString()}`);
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          const mapped: JobTitle[] = res.data.map((j: any) => ({
            id: j.id,
            title: j.title,
            code: j.code,
            departmentId: j.departmentId || 0,
            departmentName: j.departmentName || 'Chưa phân bổ',
            level: j.level || 'MIDDLE',
            jobFamily: j.jobFamily || 'TECH',
            minSalary: j.minSalary,
            maxSalary: j.maxSalary,
            salaryRangeDisplay: j.salaryRangeDisplay || 'Thỏa thuận',
            jobDescription: j.jobDescription || '',
            keyResponsibilities: j.keyResponsibilities || [],
            requirements: j.requirements || [],
            competencies: j.competencies || [],
            standardHeadcount: j.standardHeadcount || 1,
            currentHeadcount: j.currentHeadcount || 0,
            openRequisitions: j.openRequisitions || 0,
            active: j.active !== false,
            createdAt: j.createdAt ? String(j.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10),
            updatedAt: j.updatedAt ? String(j.updatedAt).slice(0, 10) : undefined,
          }));
          setStoredData(STORAGE_KEYS.JOB_TITLES, mapped);
          return mapped;
        }
      } catch {
        // Fallback to local storage if API call fails or unauthenticated
      }
    }

    const rawList = getStoredData<JobTitle[]>(STORAGE_KEYS.JOB_TITLES, INITIAL_JOB_TITLES);

    // Enrich department names if missing
    const deptMap = new Map(INITIAL_DEPARTMENTS.map((d) => [d.id, d.name]));
    let list = rawList.map((item) => ({
      ...item,
      departmentName: item.departmentName || deptMap.get(item.departmentId) || 'Chưa phân bổ',
    }));

    if (!filters) return list;

    // Apply Filters
    if (filters.search) {
      const term = filters.search.toLowerCase().trim();
      list = list.filter(
        (jt) =>
          jt.title.toLowerCase().includes(term) ||
          jt.code.toLowerCase().includes(term) ||
          (jt.departmentName && jt.departmentName.toLowerCase().includes(term))
      );
    }

    if (filters.departmentId && filters.departmentId !== 'ALL') {
      const deptIdNum = Number(filters.departmentId);
      list = list.filter((jt) => jt.departmentId === deptIdNum);
    }

    if (filters.level && filters.level !== 'ALL') {
      list = list.filter((jt) => jt.level === filters.level);
    }

    if (filters.jobFamily && filters.jobFamily !== 'ALL') {
      list = list.filter((jt) => jt.jobFamily === filters.jobFamily);
    }

    if (filters.status && filters.status !== 'ALL') {
      const wantActive = filters.status === 'ACTIVE';
      list = list.filter((jt) => jt.active === wantActive);
    }

    // Apply Sorting
    if (filters.sortBy) {
      const orderMultiplier = filters.sortOrder === 'desc' ? -1 : 1;
      list.sort((a, b) => {
        if (filters.sortBy === 'title') {
          return a.title.localeCompare(b.title, 'vi') * orderMultiplier;
        }
        if (filters.sortBy === 'level') {
          const orderA = LEVEL_METADATA[a.level]?.order || 0;
          const orderB = LEVEL_METADATA[b.level]?.order || 0;
          return (orderA - orderB) * orderMultiplier;
        }
        if (filters.sortBy === 'headcount') {
          return (a.currentHeadcount - b.currentHeadcount) * orderMultiplier;
        }
        if (filters.sortBy === 'createdAt') {
          return a.createdAt.localeCompare(b.createdAt) * orderMultiplier;
        }
        return 0;
      });
    }

    return list;
  },

  getJobTitleById: async (id: number): Promise<JobTitle | null> => {
    const list = getStoredData<JobTitle[]>(STORAGE_KEYS.JOB_TITLES, INITIAL_JOB_TITLES);
    const item = list.find((jt) => jt.id === id);
    if (!item) return null;
    return item;
  },

  createJobTitle: async (payload: Omit<JobTitle, 'id' | 'createdAt'>): Promise<JobTitle> => {
    try {
      const res = await apiClient.post<any>('/api/job-titles', {
        title: payload.title,
        code: payload.code,
        departmentId: payload.departmentId || null,
        level: payload.level,
        jobFamily: payload.jobFamily,
        minSalary: payload.minSalary,
        maxSalary: payload.maxSalary,
        jobDescription: payload.jobDescription,
        keyResponsibilities: payload.keyResponsibilities,
        requirements: payload.requirements,
        competencies: payload.competencies,
        standardHeadcount: payload.standardHeadcount,
        currentHeadcount: payload.currentHeadcount,
        active: payload.active,
      });

      if (res.data && res.data.id) {
        const created: JobTitle = {
          ...payload,
          id: res.data.id,
          createdAt: res.data.createdAt ? String(res.data.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10),
          updatedAt: res.data.updatedAt ? String(res.data.updatedAt).slice(0, 10) : new Date().toISOString().slice(0, 10),
        };
        const list = getStoredData<JobTitle[]>(STORAGE_KEYS.JOB_TITLES, INITIAL_JOB_TITLES);
        list.unshift(created);
        setStoredData(STORAGE_KEYS.JOB_TITLES, list);
        return created;
      }
    } catch (err: any) {
      if (err?.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
    }

    const list = getStoredData<JobTitle[]>(STORAGE_KEYS.JOB_TITLES, INITIAL_JOB_TITLES);

    // Check duplicate code
    const isDup = list.some((jt) => jt.code.trim().toUpperCase() === payload.code.trim().toUpperCase());
    if (isDup) {
      throw new Error(`Mã chức danh "${payload.code}" đã tồn tại trên hệ thống.`);
    }

    const maxId = list.reduce((max, jt) => Math.max(max, jt.id), 0);
    const newJobTitle: JobTitle = {
      ...payload,
      id: maxId + 1,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    list.unshift(newJobTitle);
    setStoredData(STORAGE_KEYS.JOB_TITLES, list);
    return newJobTitle;
  },

  updateJobTitle: async (id: number, payload: Partial<JobTitle>): Promise<JobTitle> => {
    try {
      await apiClient.put(`/api/job-titles/${id}`, {
        title: payload.title,
        code: payload.code,
        departmentId: payload.departmentId || null,
        level: payload.level,
        jobFamily: payload.jobFamily,
        minSalary: payload.minSalary,
        maxSalary: payload.maxSalary,
        jobDescription: payload.jobDescription,
        keyResponsibilities: payload.keyResponsibilities,
        requirements: payload.requirements,
        competencies: payload.competencies,
        standardHeadcount: payload.standardHeadcount,
        currentHeadcount: payload.currentHeadcount,
        active: payload.active,
      });
    } catch (err: any) {
      if (err?.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
    }

    const list = getStoredData<JobTitle[]>(STORAGE_KEYS.JOB_TITLES, INITIAL_JOB_TITLES);
    const index = list.findIndex((jt) => jt.id === id);
    if (index === -1) {
      throw new Error(`Không tìm thấy chức danh với ID: ${id}`);
    }

    // Check duplicate code if changed
    if (payload.code) {
      const isDup = list.some(
        (jt) => jt.id !== id && jt.code.trim().toUpperCase() === payload.code?.trim().toUpperCase()
      );
      if (isDup) {
        throw new Error(`Mã chức danh "${payload.code}" đã được sử dụng cho chức danh khác.`);
      }
    }

    const updated: JobTitle = {
      ...list[index],
      ...payload,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    list[index] = updated;
    setStoredData(STORAGE_KEYS.JOB_TITLES, list);
    return updated;
  },

  deleteJobTitle: async (id: number): Promise<{ success: boolean; message: string }> => {
    try {
      await apiClient.delete(`/api/job-titles/${id}`);
    } catch (err: any) {
      if (err?.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
    }

    const list = getStoredData<JobTitle[]>(STORAGE_KEYS.JOB_TITLES, INITIAL_JOB_TITLES);
    const item = list.find((jt) => jt.id === id);
    if (!item) {
      throw new Error(`Không tìm thấy chức danh với ID: ${id}`);
    }

    if (item.currentHeadcount > 0) {
      throw new Error(
        `Không thể xóa chức danh "${item.title}" vì đang có ${item.currentHeadcount} nhân sự đảm nhiệm. Vui lòng chuyển chức danh nhân sự trước khi xóa.`
      );
    }

    if (item.openRequisitions > 0) {
      throw new Error(
        `Không thể xóa chức danh "${item.title}" vì đang có ${item.openRequisitions} yêu cầu tuyển dụng đang mở.`
      );
    }

    const filtered = list.filter((jt) => jt.id !== id);
    setStoredData(STORAGE_KEYS.JOB_TITLES, filtered);
    return { success: true, message: `Đã xóa thành công chức danh "${item.title}".` };
  },

  toggleJobTitleStatus: async (id: number): Promise<JobTitle> => {
    const list = getStoredData<JobTitle[]>(STORAGE_KEYS.JOB_TITLES, INITIAL_JOB_TITLES);
    const index = list.findIndex((jt) => jt.id === id);
    if (index === -1) {
      throw new Error(`Không tìm thấy chức danh với ID: ${id}`);
    }

    const nextActive = !list[index].active;
    try {
      await apiClient.patch(`/api/job-titles/${id}/status`, { active: nextActive });
    } catch (err: any) {
      if (err?.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
    }

    list[index].active = nextActive;
    list[index].updatedAt = new Date().toISOString().slice(0, 10);
    setStoredData(STORAGE_KEYS.JOB_TITLES, list);
    return list[index];
  },

  getJobTitleStatistics: async (): Promise<JobTitleStatistics> => {
    const list = getStoredData<JobTitle[]>(STORAGE_KEYS.JOB_TITLES, INITIAL_JOB_TITLES);
    const activeCount = list.filter((jt) => jt.active).length;
    const totalHeadcount = list.reduce((sum, jt) => sum + (jt.currentHeadcount || 0), 0);
    const openRequisitions = list.reduce((sum, jt) => sum + (jt.openRequisitions || 0), 0);

    const levelDistribution: Record<string, number> = {};
    list.forEach((jt) => {
      levelDistribution[jt.level] = (levelDistribution[jt.level] || 0) + 1;
    });

    return {
      totalJobTitles: list.length,
      activeJobTitles: activeCount,
      inactiveJobTitles: list.length - activeCount,
      totalHeadcount,
      openRequisitions,
      levelDistribution,
    };
  },

  resetToDefault: async (): Promise<JobTitle[]> => {
    localStorage.removeItem(STORAGE_KEYS.JOB_TITLES);
    return INITIAL_JOB_TITLES;
  },

  exportToCSV: async (): Promise<string> => {
    const list = getStoredData<JobTitle[]>(STORAGE_KEYS.JOB_TITLES, INITIAL_JOB_TITLES);
    const headers = [
      'ID',
      'Mã chức danh',
      'Tên chức danh',
      'Phòng ban',
      'Cấp bậc',
      'Khối ngành',
      'Dải lương',
      'Nhân sự hiện tại',
      'Định biên',
      'Vị trí đang tuyển',
      'Trạng thái',
      'Ngày tạo',
    ];

    const rows = list.map((jt) => [
      jt.id,
      `"${jt.code}"`,
      `"${jt.title}"`,
      `"${jt.departmentName || ''}"`,
      `"${LEVEL_METADATA[jt.level]?.label || jt.level}"`,
      `"${jt.jobFamily}"`,
      `"${jt.salaryRangeDisplay || ''}"`,
      jt.currentHeadcount,
      jt.standardHeadcount || 0,
      jt.openRequisitions,
      jt.active ? 'Đang áp dụng' : 'Tạm ngưng',
      jt.createdAt,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    return csvContent;
  },
};

export default jobTitleApi;
