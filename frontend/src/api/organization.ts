import {
  CompanyProfile,
  Department,
  BranchLocation,
  OrgStatistics,
} from '../types/organization';
import apiClient from './client';

const STORAGE_KEYS = {
  PROFILE: 'ats_company_profile',
  DEPARTMENTS: 'ats_departments',
  LOCATIONS: 'ats_locations',
};

export const INITIAL_COMPANY_PROFILE: CompanyProfile = {
  id: 1,
  companyName: 'Công ty Cổ phần Công nghệ & Giải pháp Tuyển dụng ATS Việt Nam',
  shortName: 'ATS Corporation',
  legalName: 'CÔNG TY CỔ PHẦN CÔNG NGHỆ & GIẢI PHÁP TUYỂN DỤNG ATS VIỆT NAM',
  taxCode: '0109887766',
  businessLicense: '0109887766 cấp ngày 15/10/2018 bởi Sở KH&ĐT TP. Hà Nội',
  foundedDate: '2018-10-15',
  industry: 'Công nghệ thông tin & Dịch vụ Phần mềm Quản trị Nhân sự (HRTech / SaaS)',
  companySize: '100 - 500 nhân sự',
  email: 'contact@ats-corp.vn',
  phone: '(+84) 24 3998 8899',
  website: 'https://ats-corp.vn',
  address: 'Tầng 12, Tòa nhà Innovation Tower, Số 88 Đường Cầu Giấy, Phường Dịch Vọng Hậu, Quận Cầu Giấy',
  city: 'Hà Nội',
  country: 'Việt Nam',
  description:
    'ATS Corporation là đơn vị tiên phong cung cấp giải pháp chuyển đổi số toàn diện cho quy trình tuyển dụng và quản trị nhân tài nội bộ tại Việt Nam. Chúng tôi cam kết mang lại giải pháp công nghệ trực quan, minh bạch và hiệu quả cao cho doanh nghiệp quy mô vừa và lớn.',
  mission:
    'Đơn giản hóa và số hóa toàn diện quy trình thu hút, tuyển chọn và phát triển nguồn nhân lực chất lượng cao cho các tổ chức tại Việt Nam và khu vực.',
  vision:
    'Trở thành hệ sinh thái nền tảng công nghệ quản trị tuyển dụng và nhân sự được tin dùng hàng đầu Đông Nam Á vào năm 2030.',
  coreValues: [
    'Tận tâm (Dedication)',
    'Đổi mới sáng tạo (Innovation)',
    'Chính trực & Minh bạch (Integrity)',
    'Hiệu quả vượt trội (Excellence)',
    'Tinh thần đồng đội (One Team)',
  ],
  legalRepresentative: {
    name: 'Nguyễn Hoàng Long',
    title: 'Tổng Giám Đốc (Chief Executive Officer)',
    phone: '0912 345 678',
    email: 'long.nh@ats-corp.vn',
    idNumber: '001088009988',
  },
  workPolicy: {
    standardWorkingHours: '08:30 - 17:30 (Thứ Hai - Thứ Sáu, nghỉ Thứ Bảy & Chủ Nhật)',
    workModel: 'Hybrid linh hoạt (Hỗ trợ tối đa 2 ngày làm việc từ xa/tuần)',
    probationPeriod: '2 tháng (hưởng 100% lương chính thức theo thỏa thuận)',
    leaveDaysPerYear: 14,
    dressCode: 'Smart Casual thoải mái, thanh lịch',
    noticePeriodDays: 30,
    keyBenefits: [
      'Gói bảo hiểm sức khỏe cao cấp Bảo Việt / PVI dành cho nhân viên và người thân',
      'Thưởng lương tháng 13, thưởng hiệu suất tuyển dụng & kinh doanh theo quý',
      'Ngân sách 15.000.000 VNĐ/năm hỗ trợ đào tạo và chứng chỉ nghề nghiệp quốc tế',
      'Chuyến du lịch hè thường niên tại các resort 5 sao và chương trình teambuilding',
      'Phụ cấp ăn trưa, trà, cà phê, hoa quả tươi hàng ngày tại pantry công ty',
      'Trang bị máy tính xách tay cao cấp (MacBook Pro / Dell XPS) khi nhận việc',
    ],
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'Admin Hệ thống',
};

export const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 1,
    name: 'Ban Tổng Giám Đốc (BOD)',
    code: 'BOD',
    description: 'Điều hành chiến lược tổng thể và định hướng phát triển toàn diện của doanh nghiệp',
    parentDepartmentId: null,
    parentDepartmentName: undefined,
    managerName: 'Nguyễn Hoàng Long (CEO)',
    managerEmail: 'long.nh@ats-corp.vn',
    employeeCount: 5,
    active: true,
    createdAt: '2018-10-15',
  },
  {
    id: 2,
    name: 'Khối Công nghệ & Kỹ thuật',
    code: 'TECH',
    description: 'Nghiên cứu, thiết kế kiến trúc và phát triển toàn bộ hệ thống giải pháp phần mềm ATS',
    parentDepartmentId: 1,
    parentDepartmentName: 'Ban Tổng Giám Đốc (BOD)',
    managerName: 'Trần Quốc Anh (CTO)',
    managerEmail: 'anh.tq@ats-corp.vn',
    employeeCount: 112,
    active: true,
    createdAt: '2018-11-01',
  },
  {
    id: 3,
    name: 'Phòng Phát triển Phần mềm Backend',
    code: 'DEV-BE',
    description: 'Xây dựng dịch vụ vi mô (Microservices), cơ sở dữ liệu và bảo mật hệ thống',
    parentDepartmentId: 2,
    parentDepartmentName: 'Khối Công nghệ & Kỹ thuật',
    managerName: 'Vũ Minh Đức (Lead BE)',
    managerEmail: 'duc.vm@ats-corp.vn',
    employeeCount: 45,
    active: true,
    createdAt: '2019-01-10',
  },
  {
    id: 4,
    name: 'Phòng Phát triển Giao diện Frontend',
    code: 'DEV-FE',
    description: 'Xây dựng giao diện web, tương tác trải nghiệm người dùng và thiết kế component',
    parentDepartmentId: 2,
    parentDepartmentName: 'Khối Công nghệ & Kỹ thuật',
    managerName: 'Lê Thu Trang (Lead FE)',
    managerEmail: 'trang.lt@ats-corp.vn',
    employeeCount: 38,
    active: true,
    createdAt: '2019-01-10',
  },
  {
    id: 5,
    name: 'Phòng Đảm bảo Chất lượng & Kiểm thử (QA/QC)',
    code: 'QA-QC',
    description: 'Kiểm thử chức năng, tự động hóa e2e, kiểm thử tải và bảo đảm an toàn dữ liệu',
    parentDepartmentId: 2,
    parentDepartmentName: 'Khối Công nghệ & Kỹ thuật',
    managerName: 'Phạm Hải Đăng (QA Lead)',
    managerEmail: 'dang.ph@ats-corp.vn',
    employeeCount: 18,
    active: true,
    createdAt: '2019-03-15',
  },
  {
    id: 6,
    name: 'Phòng Hạ tầng & Điện toán đám mây (DevOps)',
    code: 'DEVOPS',
    description: 'Quản trị cụm Kubernetes, quy trình CI/CD tự động và giám sát độ sẵn sàng 99.9%',
    parentDepartmentId: 2,
    parentDepartmentName: 'Khối Công nghệ & Kỹ thuật',
    managerName: 'Đỗ Tấn Tài (DevOps Lead)',
    managerEmail: 'tai.dt@ats-corp.vn',
    employeeCount: 11,
    active: true,
    createdAt: '2019-06-01',
  },
  {
    id: 7,
    name: 'Khối Quản trị Nhân sự & Tuyển dụng',
    code: 'HR',
    description: 'Hoạch định nguồn nhân lực, thu hút nhân tài, đãi ngộ và phát triển tổ chức',
    parentDepartmentId: 1,
    parentDepartmentName: 'Ban Tổng Giám Đốc (BOD)',
    managerName: 'Hoàng Thị Mai (CHRO)',
    managerEmail: 'mai.ht@ats-corp.vn',
    employeeCount: 24,
    active: true,
    createdAt: '2018-11-15',
  },
  {
    id: 8,
    name: 'Ban Tuyển dụng & Thu hút Nhân tài',
    code: 'TALENT',
    description: 'Tìm kiếm ứng viên, điều phối phỏng vấn, đề xuất offer và quản lý pipeline tuyển dụng',
    parentDepartmentId: 7,
    parentDepartmentName: 'Khối Quản trị Nhân sự & Tuyển dụng',
    managerName: 'Ngô Bảo Ngọc (Lead Recruiter)',
    managerEmail: 'ngoc.nb@ats-corp.vn',
    employeeCount: 14,
    active: true,
    createdAt: '2019-02-01',
  },
  {
    id: 9,
    name: 'Ban Đào tạo & Văn hóa Doanh nghiệp',
    code: 'LND',
    description: 'Đào tạo hội nhập, tổ chức workshop chuyên môn và xây dựng văn hóa gắn kết',
    parentDepartmentId: 7,
    parentDepartmentName: 'Khối Quản trị Nhân sự & Tuyển dụng',
    managerName: 'Đinh Quốc Khánh (L&D Lead)',
    managerEmail: 'khanh.dq@ats-corp.vn',
    employeeCount: 10,
    active: true,
    createdAt: '2019-05-10',
  },
  {
    id: 10,
    name: 'Khối Kinh doanh & Tiếp thị Doanh nghiệp',
    code: 'COMM',
    description: 'Mở rộng thị trường khách hàng B2B, quản lý quan hệ đối tác và truyền thông thương hiệu',
    parentDepartmentId: 1,
    parentDepartmentName: 'Ban Tổng Giám Đốc (BOD)',
    managerName: 'Phan Văn Hưng (CCO)',
    managerEmail: 'hung.pv@ats-corp.vn',
    employeeCount: 68,
    active: true,
    createdAt: '2019-02-20',
  },
  {
    id: 11,
    name: 'Khối Tài chính - Kế toán & Vận hành',
    code: 'FIN-OPS',
    description: 'Quản lý dòng tiền, kế toán thuế, kiểm soát ngân sách headcount và hành chính văn phòng',
    parentDepartmentId: 1,
    parentDepartmentName: 'Ban Tổng Giám Đốc (BOD)',
    managerName: 'Bùi Thanh Hằng (CFO)',
    managerEmail: 'hang.bt@ats-corp.vn',
    employeeCount: 39,
    active: true,
    createdAt: '2018-11-20',
  },
];

export const INITIAL_LOCATIONS: BranchLocation[] = [
  {
    id: 1,
    name: 'Trụ sở chính Hà Nội (Innovation Tower)',
    type: 'HEADQUARTER',
    address: 'Tầng 12, Tòa nhà Innovation Tower, Số 88 Đường Cầu Giấy, Phường Dịch Vọng Hậu, Quận Cầu Giấy',
    city: 'Hà Nội',
    phone: '(+84) 24 3998 8899',
    email: 'hanoi.office@ats-corp.vn',
    managerName: 'Nguyễn Hoàng Long',
    isHeadquarter: true,
    active: true,
    departmentCount: 7,
  },
  {
    id: 2,
    name: 'Văn phòng Chi nhánh TP. Hồ Chí Minh',
    type: 'BRANCH',
    address: 'Tầng 8, Tòa nhà Saigon Tech Center, Số 123 Đường Điện Biên Phủ, Phường Đa Kao, Quận 1',
    city: 'TP. Hồ Chí Minh',
    phone: '(+84) 28 3822 5566',
    email: 'hcm.office@ats-corp.vn',
    managerName: 'Trần Minh Quân',
    isHeadquarter: false,
    active: true,
    departmentCount: 3,
  },
  {
    id: 3,
    name: 'Trung tâm Nghiên cứu & Phát triển (R&D) Đà Nẵng',
    type: 'RD_CENTER',
    address: 'Tầng 5, Công viên Phần mềm Đà Nẵng, Số 02 Đường Quang Trung, Quận Hải Châu',
    city: 'Đà Nẵng',
    phone: '(+84) 236 377 8899',
    email: 'danang.rd@ats-corp.vn',
    managerName: 'Lê Hoàng Hải',
    isHeadquarter: false,
    active: true,
    departmentCount: 2,
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
    console.warn(`[OrganizationApi] Failed to write to localStorage for key: ${key}`, err);
  }
};

export const organizationApi = {
  // --- Profile Methods ---
  getCompanyProfile: async (): Promise<CompanyProfile> => {
    return getStoredData<CompanyProfile>(STORAGE_KEYS.PROFILE, INITIAL_COMPANY_PROFILE);
  },

  updateCompanyProfile: async (payload: Partial<CompanyProfile>): Promise<CompanyProfile> => {
    const current = getStoredData<CompanyProfile>(STORAGE_KEYS.PROFILE, INITIAL_COMPANY_PROFILE);
    const updated: CompanyProfile = {
      ...current,
      ...payload,
      updatedAt: new Date().toISOString(),
      updatedBy: payload.updatedBy || current.updatedBy || 'Quản trị viên',
    };
    setStoredData(STORAGE_KEYS.PROFILE, updated);
    return updated;
  },

  // --- Department Methods ---
  getDepartments: async (): Promise<Department[]> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token && !token.startsWith('mock-')) {
      try {
        const res = await apiClient.get<any[]>('/api/departments');
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          const mapped: Department[] = res.data.map((d: any) => ({
            id: d.id,
            name: d.name,
            code: d.code,
            description: d.description || '',
            parentDepartmentId: d.parentDepartmentId || null,
            managerName: d.managerUserId ? `Quản lý #${d.managerUserId}` : undefined,
            employeeCount: d.employeeCount || 0,
            active: d.active !== false,
            createdAt: d.createdAt ? String(d.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10),
          }));
          const deptMap = new Map<number, string>(mapped.map((d) => [d.id, d.name]));
          const enriched = mapped.map((d) => ({
            ...d,
            parentDepartmentName: d.parentDepartmentId ? deptMap.get(d.parentDepartmentId) : undefined,
          }));
          setStoredData(STORAGE_KEYS.DEPARTMENTS, enriched);
          return enriched;
        }
      } catch {
        // Fallback to local storage if API call fails
      }
    }

    const list = getStoredData<Department[]>(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
    const deptMap = new Map<number, string>(list.map((d) => [d.id, d.name]));
    return list.map((d) => ({
      ...d,
      parentDepartmentName: d.parentDepartmentId ? deptMap.get(d.parentDepartmentId) : undefined,
    }));
  },

  createDepartment: async (payload: Omit<Department, 'id' | 'createdAt'>): Promise<Department> => {
    try {
      const res = await apiClient.post<any>('/api/departments', {
        name: payload.name,
        code: payload.code,
        description: payload.description || '',
        parentDepartmentId: payload.parentDepartmentId || null,
        managerUserId: 1,
      });
      if (res.data && res.data.id) {
        const newDept: Department = {
          ...payload,
          id: res.data.id,
          createdAt: res.data.createdAt ? String(res.data.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10),
        };
        const list = getStoredData<Department[]>(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
        list.push(newDept);
        setStoredData(STORAGE_KEYS.DEPARTMENTS, list);
        return newDept;
      }
    } catch (err: any) {
      if (err?.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
    }

    const list = getStoredData<Department[]>(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
    const maxId = list.reduce((max, d) => Math.max(max, d.id), 0);
    const newDept: Department = {
      ...payload,
      id: maxId + 1,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    list.push(newDept);
    setStoredData(STORAGE_KEYS.DEPARTMENTS, list);
    return newDept;
  },

  updateDepartment: async (id: number, payload: Partial<Department>): Promise<Department> => {
    try {
      await apiClient.put(`/api/departments/${id}`, {
        name: payload.name,
        code: payload.code,
        description: payload.description || '',
        parentDepartmentId: payload.parentDepartmentId || null,
        managerUserId: 1,
      });
    } catch (err: any) {
      if (err?.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
    }

    const list = getStoredData<Department[]>(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
    const index = list.findIndex((d) => d.id === id);
    if (index === -1) {
      throw new Error(`Không tìm thấy phòng ban với mã ID: ${id}`);
    }
    const updatedDept: Department = {
      ...list[index],
      ...payload,
    };
    list[index] = updatedDept;
    setStoredData(STORAGE_KEYS.DEPARTMENTS, list);
    return updatedDept;
  },

  deleteDepartment: async (id: number): Promise<{ success: boolean; message: string }> => {
    try {
      await apiClient.delete(`/api/departments/${id}`);
    } catch (err: any) {
      if (err?.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
    }

    const list = getStoredData<Department[]>(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
    const hasChildren = list.some((d) => d.parentDepartmentId === id);
    if (hasChildren) {
      throw new Error('Không thể xóa phòng ban này vì đang có các đơn vị trực thuộc. Vui lòng chuyển hoặc xóa các đơn vị con trước.');
    }
    const filtered = list.filter((d) => d.id !== id);
    setStoredData(STORAGE_KEYS.DEPARTMENTS, filtered);
    return { success: true, message: 'Đã xóa phòng ban thành công.' };
  },

  toggleDepartmentStatus: async (id: number): Promise<Department> => {
    const list = getStoredData<Department[]>(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
    const index = list.findIndex((d) => d.id === id);
    if (index === -1) {
      throw new Error(`Không tìm thấy phòng ban với ID: ${id}`);
    }
    const nextActive = !list[index].active;
    try {
      await apiClient.patch(`/api/departments/${id}/status`, { active: nextActive });
    } catch (err: any) {
      if (err?.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
    }
    list[index].active = nextActive;
    setStoredData(STORAGE_KEYS.DEPARTMENTS, list);
    return list[index];
  },

  // --- Location Methods ---
  getLocations: async (): Promise<BranchLocation[]> => {
    return getStoredData<BranchLocation[]>(STORAGE_KEYS.LOCATIONS, INITIAL_LOCATIONS);
  },

  createLocation: async (payload: Omit<BranchLocation, 'id'>): Promise<BranchLocation> => {
    const list = getStoredData<BranchLocation[]>(STORAGE_KEYS.LOCATIONS, INITIAL_LOCATIONS);
    const maxId = list.reduce((max, loc) => Math.max(max, loc.id), 0);
    // If set as headquarter, clear headquarter flag on other locations
    if (payload.isHeadquarter) {
      list.forEach((l) => (l.isHeadquarter = false));
    }
    const newLoc: BranchLocation = {
      ...payload,
      id: maxId + 1,
    };
    list.push(newLoc);
    setStoredData(STORAGE_KEYS.LOCATIONS, list);
    return newLoc;
  },

  updateLocation: async (id: number, payload: Partial<BranchLocation>): Promise<BranchLocation> => {
    const list = getStoredData<BranchLocation[]>(STORAGE_KEYS.LOCATIONS, INITIAL_LOCATIONS);
    const index = list.findIndex((l) => l.id === id);
    if (index === -1) {
      throw new Error(`Không tìm thấy địa điểm với ID: ${id}`);
    }
    if (payload.isHeadquarter) {
      list.forEach((l) => {
        if (l.id !== id) l.isHeadquarter = false;
      });
    }
    list[index] = { ...list[index], ...payload };
    setStoredData(STORAGE_KEYS.LOCATIONS, list);
    return list[index];
  },

  deleteLocation: async (id: number): Promise<{ success: boolean; message: string }> => {
    const list = getStoredData<BranchLocation[]>(STORAGE_KEYS.LOCATIONS, INITIAL_LOCATIONS);
    const loc = list.find((l) => l.id === id);
    if (loc?.isHeadquarter) {
      throw new Error('Không thể xóa địa điểm đang được chỉ định làm Trụ sở chính.');
    }
    const filtered = list.filter((l) => l.id !== id);
    setStoredData(STORAGE_KEYS.LOCATIONS, filtered);
    return { success: true, message: 'Đã xóa địa điểm thành công.' };
  },

  // --- Statistics ---
  getOrgStatistics: async (): Promise<OrgStatistics> => {
    const depts = getStoredData<Department[]>(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
    const locs = getStoredData<BranchLocation[]>(STORAGE_KEYS.LOCATIONS, INITIAL_LOCATIONS);
    const totalEmployees = depts.reduce((sum, d) => sum + (d.employeeCount || 0), 0);
    const activeDepts = depts.filter((d) => d.active).length;

    return {
      totalDepartments: depts.length,
      activeDepartments: activeDepts,
      totalEmployees,
      totalLocations: locs.length,
      headcountFulfillmentRate: 94.2,
      openRequisitionsCount: 18,
    };
  },

  // --- Reset to enterprise seed data ---
  resetToDefault: async (): Promise<void> => {
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    localStorage.removeItem(STORAGE_KEYS.DEPARTMENTS);
    localStorage.removeItem(STORAGE_KEYS.LOCATIONS);
  },
};

export default organizationApi;
