export interface LegalRepresentative {
  name: string;
  title: string;
  phone?: string;
  email?: string;
  idNumber?: string;
}

export interface WorkPolicy {
  standardWorkingHours: string;
  workModel: string;
  probationPeriod: string;
  leaveDaysPerYear: number;
  keyBenefits: string[];
  dressCode?: string;
  noticePeriodDays?: number;
}

export interface CompanyProfile {
  id?: number;
  companyName: string;
  shortName: string;
  legalName: string;
  taxCode: string;
  businessLicense?: string;
  foundedDate: string;
  industry: string;
  companySize: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  country: string;
  description: string;
  mission: string;
  vision: string;
  coreValues: string[];
  legalRepresentative: LegalRepresentative;
  logoUrl?: string;
  bannerUrl?: string;
  workPolicy: WorkPolicy;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  parentDepartmentId?: number | null;
  parentDepartmentName?: string;
  managerUserId?: number;
  managerName?: string;
  managerEmail?: string;
  employeeCount: number;
  openRequisitionsCount?: number;
  active: boolean;
  createdAt: string;
}

export type LocationType = 'HEADQUARTER' | 'BRANCH' | 'RD_CENTER' | 'REPRESENTATIVE_OFFICE';

export interface BranchLocation {
  id: number;
  name: string;
  type: LocationType;
  address: string;
  city: string;
  phone: string;
  email: string;
  managerName?: string;
  isHeadquarter: boolean;
  active: boolean;
  departmentCount?: number;
}

export interface OrgStatistics {
  totalDepartments: number;
  activeDepartments: number;
  totalEmployees: number;
  totalLocations: number;
  headcountFulfillmentRate: number;
  openRequisitionsCount: number;
}
