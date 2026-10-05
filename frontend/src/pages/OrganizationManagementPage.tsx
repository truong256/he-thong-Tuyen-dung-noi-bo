import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Network,
  MapPin,
  Award,
  Users,
  Briefcase,
  ShieldCheck,
  Search,
  Plus,
  Edit2,
  Trash2,
  Power,
  RotateCcw,
  Download,
  Save,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
  Phone,
  Mail,
  Globe,
  Clock,
  Check,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import organizationApi from '../api/organization';
import {
  CompanyProfile,
  Department,
  BranchLocation,
  OrgStatistics,
} from '../types/organization';
import OrgChartVisualizer from '../components/organization/OrgChartVisualizer';
import DepartmentModal from '../components/organization/DepartmentModal';
import LocationModal from '../components/organization/LocationModal';
import '../styles/organization.css';

type ActiveTab = 'overview' | 'departments' | 'locations' | 'branding';
type DepartmentViewMode = 'chart' | 'table';

export const OrganizationManagementPage: React.FC = () => {
  const { user, hasAnyRole } = useAuth();
  const canEdit = hasAnyRole(['ADMIN', 'HR_MANAGER']);

  // Tabs & Views
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [deptViewMode, setDeptViewMode] = useState<DepartmentViewMode>('chart');

  // Data states
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<BranchLocation[]>([]);
  const [statistics, setStatistics] = useState<OrgStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Profile Form state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState<Partial<CompanyProfile>>({});
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);

  // Modals state
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [presetParentDeptId, setPresetParentDeptId] = useState<number | null>(null);

  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState<BranchLocation | null>(null);

  // Department Filters (for table view)
  const [deptSearch, setDeptSearch] = useState('');
  const [deptStatusFilter, setDeptStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [deptParentFilter, setDeptParentFilter] = useState<string>('ALL');

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profData, deptData, locData, statsData] = await Promise.all([
        organizationApi.getCompanyProfile(),
        organizationApi.getDepartments(),
        organizationApi.getLocations(),
        organizationApi.getOrgStatistics(),
      ]);
      setProfile(profData);
      setEditProfileForm(profData);
      setDepartments(deptData);
      setLocations(locData);
      setStatistics(statsData);
    } catch {
      showToast('Không thể tải thông tin hồ sơ tổ chức.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Profile Actions ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaveError(null);
    try {
      const updated = await organizationApi.updateCompanyProfile({
        ...editProfileForm,
        updatedBy: user?.fullName || 'Quản trị viên',
      });
      setProfile(updated);
      setIsEditingProfile(false);
      showToast('Cập nhật thông tin tổ chức thành công!');
    } catch (err: any) {
      setProfileSaveError(err.message || 'Lỗi khi lưu thông tin tổ chức.');
    }
  };

  const handleResetSeedData = async () => {
    if (window.confirm('Bạn có chắc muốn đặt lại dữ liệu hồ sơ tổ chức về cấu hình mẫu mặc định?')) {
      await organizationApi.resetToDefault();
      await loadData();
      showToast('Đã khôi phục dữ liệu mẫu tổ chức thành công!');
    }
  };

  // --- Department Actions ---
  const handleOpenAddDept = (parentId?: number) => {
    setSelectedDept(null);
    setPresetParentDeptId(parentId ?? null);
    setIsDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept: Department) => {
    setSelectedDept(dept);
    setPresetParentDeptId(dept.parentDepartmentId || null);
    setIsDeptModalOpen(true);
  };

  const handleSaveDept = async (deptData: any) => {
    if (selectedDept) {
      await organizationApi.updateDepartment(selectedDept.id, deptData);
      showToast(`Đã cập nhật phòng ban "${deptData.name}"!`);
    } else {
      await organizationApi.createDepartment(deptData);
      showToast(`Đã thêm mới phòng ban "${deptData.name}"!`);
    }
    await loadData();
  };

  const handleToggleDeptStatus = async (id: number) => {
    try {
      const updated = await organizationApi.toggleDepartmentStatus(id);
      showToast(
        `Đã ${updated.active ? 'kích hoạt lại' : 'tạm ngưng'} phòng ban "${updated.name}"!`
      );
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi thay đổi trạng thái phòng ban.', 'error');
    }
  };

  const handleDeleteDept = async (dept: Department) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa phòng ban "${dept.name}" (${dept.code})?`)) {
      try {
        await organizationApi.deleteDepartment(dept.id);
        showToast(`Đã xóa phòng ban "${dept.name}"!`);
        await loadData();
      } catch (err: any) {
        showToast(err.message || 'Không thể xóa phòng ban.', 'error');
      }
    }
  };

  // Filtered Departments for Table View
  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      const matchesSearch =
        deptSearch.trim() === '' ||
        d.name.toLowerCase().includes(deptSearch.toLowerCase()) ||
        d.code.toLowerCase().includes(deptSearch.toLowerCase()) ||
        (d.managerName && d.managerName.toLowerCase().includes(deptSearch.toLowerCase()));

      const matchesStatus =
        deptStatusFilter === 'ALL' ||
        (deptStatusFilter === 'ACTIVE' && d.active) ||
        (deptStatusFilter === 'INACTIVE' && !d.active);

      const matchesParent =
        deptParentFilter === 'ALL' ||
        (deptParentFilter === 'ROOT' && !d.parentDepartmentId) ||
        String(d.parentDepartmentId) === deptParentFilter;

      return matchesSearch && matchesStatus && matchesParent;
    });
  }, [departments, deptSearch, deptStatusFilter, deptParentFilter]);

  // Export departments CSV
  const handleExportDeptCsv = () => {
    if (departments.length === 0) {
      showToast('Không có dữ liệu phòng ban để xuất file.', 'error');
      return;
    }
    const headers = ['Mã PB,Tên phòng ban,Đơn vị cấp trên,Trưởng đơn vị,Email,Số nhân sự,Trạng thái\n'];
    const rows = departments.map((d) => {
      const statusText = d.active ? 'Đang hoạt động' : 'Tạm ngưng';
      return `"${d.code}","${d.name}","${d.parentDepartmentName || 'Cấp cao nhất'}","${d.managerName || ''}","${d.managerEmail || ''}",${d.employeeCount},"${statusText}"\n`;
    });
    const blob = new Blob(['\uFEFF' + headers.concat(rows).join('')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `co-cau-phong-ban-ats-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã xuất danh sách cơ cấu phòng ban ra file CSV!');
  };

  // --- Location Actions ---
  const handleOpenAddLoc = () => {
    setSelectedLoc(null);
    setIsLocModalOpen(true);
  };

  const handleOpenEditLoc = (loc: BranchLocation) => {
    setSelectedLoc(loc);
    setIsLocModalOpen(true);
  };

  const handleSaveLoc = async (locData: any) => {
    if (selectedLoc) {
      await organizationApi.updateLocation(selectedLoc.id, locData);
      showToast(`Đã cập nhật địa điểm "${locData.name}"!`);
    } else {
      await organizationApi.createLocation(locData);
      showToast(`Đã thêm mới địa điểm "${locData.name}"!`);
    }
    await loadData();
  };

  const handleDeleteLoc = async (loc: BranchLocation) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa địa điểm "${loc.name}"?`)) {
      try {
        await organizationApi.deleteLocation(loc.id);
        showToast(`Đã xóa địa điểm "${loc.name}"!`);
        await loadData();
      } catch (err: any) {
        showToast(err.message || 'Không thể xóa địa điểm.', 'error');
      }
    }
  };

  if (isLoading && !profile) {
    return (
      <div className="org-page-container">
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div className="spinning" style={{ marginBottom: '12px' }}>
            <Building2 size={36} style={{ color: 'var(--primary)' }} />
          </div>
          <p>Đang tải dữ liệu hồ sơ tổ chức...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="org-page-container" data-testid="organization-management-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification ${toast.type}`} role="status" aria-live="polite">
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} className="text-green" />
          ) : (
            <AlertCircle size={18} className="text-red" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ====================================================================
          HERO BANNER: COMPANY IDENTITY
          ==================================================================== */}
      <section className="org-hero-card" aria-label="Thông tin nhận diện tổ chức">
        <div className="org-hero-header">
          <div className="org-identity-left">
            <div className="org-logo-box" aria-label="Logo tổ chức">
              <Building2 size={38} />
            </div>
            <div className="org-identity-info">
              <div className="org-title-row">
                <h1>{profile?.companyName}</h1>
                <span className="org-badge-verified">
                  <ShieldCheck size={14} />
                  <span>Đã xác thực pháp lý</span>
                </span>
              </div>
              <div className="org-meta-row">
                <span className="org-meta-item">
                  <strong>Tên viết tắt:</strong> {profile?.shortName}
                </span>
                <span>•</span>
                <span className="org-meta-item">
                  <strong>Mã số thuế:</strong> {profile?.taxCode}
                </span>
                <span>•</span>
                <span className="org-meta-item">
                  <strong>Quy mô:</strong> {profile?.companySize}
                </span>
                <span>•</span>
                <span className="org-meta-item">
                  <Globe size={14} />
                  <a href={profile?.website} target="_blank" rel="noreferrer">
                    {profile?.website.replace('https://', '')}
                  </a>
                </span>
              </div>
            </div>
          </div>

          <div className="org-hero-actions">
            <Link
              to="/job-titles"
              className="btn btn-outline"
              title="Đi tới danh mục Quản lý Chức danh & Vị trí"
            >
              <Award size={15} />
              <span>Quản lý Chức danh</span>
            </Link>
            {canEdit && (
              <>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleResetSeedData}
                  title="Đặt lại dữ liệu mẫu"
                >
                  <RotateCcw size={15} />
                  <span>Dữ liệu mẫu</span>
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleExportDeptCsv}
                  title="Xuất cơ cấu tổ chức ra CSV"
                >
                  <FileSpreadsheet size={15} />
                  <span>Xuất CSV</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setActiveTab('overview');
                    setIsEditingProfile(!isEditingProfile);
                  }}
                >
                  <Edit2 size={15} />
                  <span>{isEditingProfile ? 'Xem tổng quan' : 'Chỉnh sửa hồ sơ'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ====================================================================
          KEY METRICS OVERVIEW
          ==================================================================== */}
      <section className="org-stats-grid" aria-label="Chỉ số cơ cấu tổ chức">
        <div className="org-stat-card">
          <div className="stat-icon-wrapper blue">
            <Building2 size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Tổng số phòng ban / đơn vị</span>
            <span className="stat-value">{statistics?.totalDepartments || 0}</span>
            <span className="stat-helper">
              {statistics?.activeDepartments || 0} đơn vị đang hoạt động
            </span>
          </div>
        </div>

        <div className="org-stat-card">
          <div className="stat-icon-wrapper emerald">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Tổng nhân sự trực thuộc</span>
            <span className="stat-value">{statistics?.totalEmployees || 0}</span>
            <span className="stat-helper">Trên toàn bộ các khối phòng ban</span>
          </div>
        </div>

        <div className="org-stat-card">
          <div className="stat-icon-wrapper amber">
            <MapPin size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Chi nhánh & Địa điểm</span>
            <span className="stat-value">{statistics?.totalLocations || 0}</span>
            <span className="stat-helper">1 Trụ sở chính & 2 Chi nhánh</span>
          </div>
        </div>

        <div className="org-stat-card">
          <div className="stat-icon-wrapper purple">
            <Briefcase size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Vị trí tuyển dụng đang mở</span>
            <span className="stat-value">{statistics?.openRequisitionsCount || 0}</span>
            <span className="stat-helper">Tỷ lệ lấp đầy: {statistics?.headcountFulfillmentRate}%</span>
          </div>
        </div>
      </section>

      {/* ====================================================================
          MAIN TABS WRAPPER
          ==================================================================== */}
      <div className="org-tabs-wrapper">
        {/* Tab Navigation */}
        <nav className="org-tabs-nav" aria-label="Tab quản lý tổ chức">
          <button
            type="button"
            className={`org-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
            aria-selected={activeTab === 'overview'}
          >
            <Building2 size={17} />
            <span>Thông tin chung & Pháp lý</span>
          </button>

          <button
            type="button"
            className={`org-tab-btn ${activeTab === 'departments' ? 'active' : ''}`}
            onClick={() => setActiveTab('departments')}
            aria-selected={activeTab === 'departments'}
          >
            <Network size={17} />
            <span>Cơ cấu tổ chức & Phòng ban</span>
            <span className="tab-badge">{departments.length}</span>
          </button>

          <button
            type="button"
            className={`org-tab-btn ${activeTab === 'locations' ? 'active' : ''}`}
            onClick={() => setActiveTab('locations')}
            aria-selected={activeTab === 'locations'}
          >
            <MapPin size={17} />
            <span>Chi nhánh & Địa điểm</span>
            <span className="tab-badge">{locations.length}</span>
          </button>

          <button
            type="button"
            className={`org-tab-btn ${activeTab === 'branding' ? 'active' : ''}`}
            onClick={() => setActiveTab('branding')}
            aria-selected={activeTab === 'branding'}
          >
            <Award size={17} />
            <span>Chính sách & Đãi ngộ</span>
          </button>
        </nav>

        {/* Tab Content */}
        <div className="org-tab-content">
          {/* ================================================================
              TAB 1: THÔNG TIN CHUNG & PHÁP LÝ
              ================================================================ */}
          {activeTab === 'overview' && (
            <div className="overview-tab-view" data-testid="tab-overview">
              {!isEditingProfile ? (
                /* READ-ONLY OVERVIEW */
                <div className="overview-grid">
                  <div className="overview-col-main">
                    {/* General Company Info */}
                    <div className="overview-card">
                      <div className="card-title-row">
                        <h3>
                          <Building2 size={18} className="card-title-icon" />
                          <span>Hồ sơ Doanh nghiệp & Pháp lý</span>
                        </h3>
                        {canEdit && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => setIsEditingProfile(true)}
                          >
                            <Edit2 size={14} />
                            <span>Chỉnh sửa</span>
                          </button>
                        )}
                      </div>

                      <div className="info-data-grid">
                        <div className="info-item">
                          <span className="info-item-label">Tên pháp lý đầy đủ</span>
                          <span className="info-item-value">{profile?.legalName}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-item-label">Tên thương mại / Viết tắt</span>
                          <span className="info-item-value">{profile?.shortName}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-item-label">Mã số thuế doanh nghiệp</span>
                          <span className="info-item-value">{profile?.taxCode}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-item-label">Ngày thành lập</span>
                          <span className="info-item-value">{profile?.foundedDate}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-item-label">Lĩnh vực hoạt động</span>
                          <span className="info-item-value">{profile?.industry}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-item-label">Giấy phép đăng ký kinh doanh</span>
                          <span className="info-item-value">{profile?.businessLicense}</span>
                        </div>
                      </div>
                    </div>

                    {/* About Us, Mission, Vision */}
                    <div className="overview-card">
                      <div className="card-title-row">
                        <h3>
                          <Sparkles size={18} className="card-title-icon" />
                          <span>Giới thiệu, Tầm nhìn & Sứ mệnh</span>
                        </h3>
                      </div>

                      <div className="info-item mb-4">
                        <span className="info-item-label">Mô tả tổng quan tổ chức</span>
                        <p className="desc-paragraph mt-1">{profile?.description}</p>
                      </div>

                      <div className="form-grid-2 mb-4">
                        <div className="info-item">
                          <span className="info-item-label">Sứ mệnh (Mission)</span>
                          <p className="desc-paragraph mt-1">{profile?.mission}</p>
                        </div>
                        <div className="info-item">
                          <span className="info-item-label">Tầm nhìn (Vision)</span>
                          <p className="desc-paragraph mt-1">{profile?.vision}</p>
                        </div>
                      </div>

                      <div className="info-item">
                        <span className="info-item-label">Giá trị cốt lõi (Core Values)</span>
                        <div className="core-values-tags">
                          {profile?.coreValues?.map((val, idx) => (
                            <span key={idx} className="value-tag highlight">
                              <Check size={13} />
                              <span>{val}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="overview-col-side">
                    {/* Contact Info Card */}
                    <div className="overview-card">
                      <div className="card-title-row">
                        <h3>
                          <Phone size={18} className="card-title-icon" />
                          <span>Thông tin liên hệ</span>
                        </h3>
                      </div>

                      <div className="location-details-list">
                        <div className="location-detail-row">
                          <MapPin size={16} className="location-detail-icon" />
                          <div>
                            <strong>Trụ sở chính:</strong>
                            <div className="text-muted mt-1">{profile?.address}</div>
                          </div>
                        </div>

                        <div className="location-detail-row">
                          <Phone size={16} className="location-detail-icon" />
                          <div>
                            <strong>Hotline:</strong>
                            <div className="text-muted mt-1">{profile?.phone}</div>
                          </div>
                        </div>

                        <div className="location-detail-row">
                          <Mail size={16} className="location-detail-icon" />
                          <div>
                            <strong>Email hỗ trợ:</strong>
                            <div className="text-muted mt-1">{profile?.email}</div>
                          </div>
                        </div>

                        <div className="location-detail-row">
                          <Globe size={16} className="location-detail-icon" />
                          <div>
                            <strong>Trang web chính thức:</strong>
                            <div className="text-muted mt-1">
                              <a href={profile?.website} target="_blank" rel="noreferrer">
                                {profile?.website}
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Legal Representative */}
                    <div className="overview-card">
                      <div className="card-title-row">
                        <h3>
                          <ShieldCheck size={18} className="card-title-icon" />
                          <span>Người đại diện theo pháp luật</span>
                        </h3>
                      </div>

                      <div className="location-details-list">
                        <div className="info-item">
                          <span className="info-item-label">Họ và tên</span>
                          <span className="info-item-value font-bold">
                            {profile?.legalRepresentative?.name}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-item-label">Chức danh</span>
                          <span className="info-item-value">
                            {profile?.legalRepresentative?.title}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-item-label">Điện thoại di động</span>
                          <span className="info-item-value">
                            {profile?.legalRepresentative?.phone}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-item-label">Email công vụ</span>
                          <span className="info-item-value">
                            {profile?.legalRepresentative?.email}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* EDIT PROFILE FORM */
                <div className="edit-form-wrapper" data-testid="edit-profile-form">
                  <div className="card-title-row">
                    <h3>
                      <Edit2 size={18} className="card-title-icon" />
                      <span>Cập nhật Hồ sơ Tổ chức & Doanh nghiệp</span>
                    </h3>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setIsEditingProfile(false)}
                    >
                      <X size={15} />
                      <span>Hủy chỉnh sửa</span>
                    </button>
                  </div>

                  {profileSaveError && (
                    <div className="modal-alert-error" role="alert">
                      <AlertCircle size={16} />
                      <span>{profileSaveError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveProfile}>
                    <div className="form-grid-2">
                      <div className="form-group span-2">
                        <label htmlFor="company-name">Tên tổ chức / Công ty *</label>
                        <input
                          id="company-name"
                          type="text"
                          className="form-control"
                          value={editProfileForm.companyName || ''}
                          onChange={(e) =>
                            setEditProfileForm({ ...editProfileForm, companyName: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="short-name">Tên thương mại / Viết tắt *</label>
                        <input
                          id="short-name"
                          type="text"
                          className="form-control"
                          value={editProfileForm.shortName || ''}
                          onChange={(e) =>
                            setEditProfileForm({ ...editProfileForm, shortName: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="tax-code">Mã số thuế *</label>
                        <input
                          id="tax-code"
                          type="text"
                          className="form-control"
                          value={editProfileForm.taxCode || ''}
                          onChange={(e) =>
                            setEditProfileForm({ ...editProfileForm, taxCode: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="industry">Lĩnh vực hoạt động</label>
                        <input
                          id="industry"
                          type="text"
                          className="form-control"
                          value={editProfileForm.industry || ''}
                          onChange={(e) =>
                            setEditProfileForm({ ...editProfileForm, industry: e.target.value })
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="company-size">Quy mô nhân sự</label>
                        <input
                          id="company-size"
                          type="text"
                          className="form-control"
                          value={editProfileForm.companySize || ''}
                          onChange={(e) =>
                            setEditProfileForm({ ...editProfileForm, companySize: e.target.value })
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="email">Email liên hệ chính *</label>
                        <input
                          id="email"
                          type="email"
                          className="form-control"
                          value={editProfileForm.email || ''}
                          onChange={(e) =>
                            setEditProfileForm({ ...editProfileForm, email: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="phone">Hotline / Điện thoại *</label>
                        <input
                          id="phone"
                          type="text"
                          className="form-control"
                          value={editProfileForm.phone || ''}
                          onChange={(e) =>
                            setEditProfileForm({ ...editProfileForm, phone: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="form-group span-2">
                        <label htmlFor="website">Địa chỉ Website</label>
                        <input
                          id="website"
                          type="url"
                          className="form-control"
                          value={editProfileForm.website || ''}
                          onChange={(e) =>
                            setEditProfileForm({ ...editProfileForm, website: e.target.value })
                          }
                        />
                      </div>

                      <div className="form-group span-2">
                        <label htmlFor="address">Địa chỉ trụ sở chính *</label>
                        <input
                          id="address"
                          type="text"
                          className="form-control"
                          value={editProfileForm.address || ''}
                          onChange={(e) =>
                            setEditProfileForm({ ...editProfileForm, address: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="form-group span-2">
                        <label htmlFor="desc">Giới thiệu tổng quan</label>
                        <textarea
                          id="desc"
                          rows={3}
                          className="form-control"
                          value={editProfileForm.description || ''}
                          onChange={(e) =>
                            setEditProfileForm({ ...editProfileForm, description: e.target.value })
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="mission">Sứ mệnh</label>
                        <textarea
                          id="mission"
                          rows={2}
                          className="form-control"
                          value={editProfileForm.mission || ''}
                          onChange={(e) =>
                            setEditProfileForm({ ...editProfileForm, mission: e.target.value })
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="vision">Tầm nhìn</label>
                        <textarea
                          id="vision"
                          rows={2}
                          className="form-control"
                          value={editProfileForm.vision || ''}
                          onChange={(e) =>
                            setEditProfileForm({ ...editProfileForm, vision: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="modal-footer mt-4" style={{ padding: '16px 0 0', border: 'none' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setIsEditingProfile(false)}
                      >
                        Hủy bỏ
                      </button>
                      <button type="submit" className="btn btn-primary">
                        <Save size={16} />
                        <span>Lưu thay đổi hồ sơ</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              TAB 2: CƠ CẤU TỔ CHỨC & PHÒNG BAN
              ================================================================ */}
          {activeTab === 'departments' && (
            <div className="departments-tab-view" data-testid="tab-departments">
              {/* Header Toolbar */}
              <div className="dept-view-header">
                <div className="view-mode-toggle" role="group" aria-label="Chế độ hiển thị cơ cấu">
                  <button
                    type="button"
                    className={`view-toggle-btn ${deptViewMode === 'chart' ? 'active' : ''}`}
                    onClick={() => setDeptViewMode('chart')}
                  >
                    <Network size={16} />
                    <span>Sơ đồ cây (Org Chart)</span>
                  </button>
                  <button
                    type="button"
                    className={`view-toggle-btn ${deptViewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setDeptViewMode('table')}
                  >
                    <Layers size={16} />
                    <span>Danh sách bảng</span>
                  </button>
                </div>

                <div className="header-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleExportDeptCsv}
                    title="Xuất file CSV"
                  >
                    <Download size={15} />
                    <span>Xuất CSV</span>
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleOpenAddDept()}
                    >
                      <Plus size={16} />
                      <span>Thêm phòng ban mới</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Mode 1: Interactive Org Chart */}
              {deptViewMode === 'chart' ? (
                <OrgChartVisualizer
                  departments={departments}
                  onAddSubDepartment={(parentId) => handleOpenAddDept(parentId)}
                  onEditDepartment={(dept) => handleOpenEditDept(dept)}
                  onToggleStatus={(id) => handleToggleDeptStatus(id)}
                  canEdit={canEdit}
                />
              ) : (
                /* Mode 2: Table List with Filters */
                <div className="dept-table-wrapper" data-testid="dept-table-view">
                  {/* Table Filter Toolbar */}
                  <div className="user-toolbar mb-4">
                    <div className="search-wrap">
                      <Search size={16} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Tìm theo tên phòng ban, mã PB, hoặc trưởng đơn vị..."
                        value={deptSearch}
                        onChange={(e) => setDeptSearch(e.target.value)}
                        aria-label="Tìm kiếm phòng ban"
                      />
                      {deptSearch && (
                        <button
                          type="button"
                          className="search-clear-btn"
                          onClick={() => setDeptSearch('')}
                          aria-label="Xóa từ khóa tìm kiếm"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div className="toolbar-filters">
                      <div className="filter-select">
                        <label htmlFor="dept-filter-parent">Đơn vị cha:</label>
                        <select
                          id="dept-filter-parent"
                          value={deptParentFilter}
                          onChange={(e) => setDeptParentFilter(e.target.value)}
                        >
                          <option value="ALL">Tất cả cấp</option>
                          <option value="ROOT">Ban Điều Hành (Cấp cao nhất)</option>
                          {departments
                            .filter((d) => !d.parentDepartmentId || departments.some((c) => c.parentDepartmentId === d.id))
                            .map((p) => (
                              <option key={p.id} value={String(p.id)}>
                                {p.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="filter-select">
                        <label htmlFor="dept-filter-status">Trạng thái:</label>
                        <select
                          id="dept-filter-status"
                          value={deptStatusFilter}
                          onChange={(e) => setDeptStatusFilter(e.target.value as any)}
                        >
                          <option value="ALL">Tất cả trạng thái</option>
                          <option value="ACTIVE">Đang hoạt động</option>
                          <option value="INACTIVE">Tạm ngưng hoạt động</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="table-responsive">
                    <table className="custom-table" aria-label="Bảng danh sách phòng ban">
                      <thead>
                        <tr>
                          <th>Mã PB</th>
                          <th>Tên phòng ban / Đơn vị</th>
                          <th>Đơn vị cấp trên</th>
                          <th>Trưởng đơn vị</th>
                          <th>Nhân sự</th>
                          <th>Trạng thái</th>
                          {canEdit && <th style={{ textAlign: 'right' }}>Thao tác</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDepartments.length === 0 ? (
                          <tr>
                            <td colSpan={canEdit ? 7 : 6} style={{ textAlign: 'center', padding: '36px' }}>
                              <p className="text-muted">Không tìm thấy phòng ban nào phù hợp với bộ lọc.</p>
                            </td>
                          </tr>
                        ) : (
                          filteredDepartments.map((dept) => (
                            <tr key={dept.id} className={!dept.active ? 'row-locked' : ''}>
                              <td>
                                <span className="node-code-badge">{dept.code}</span>
                              </td>
                              <td>
                                <div className="user-name-cell">
                                  <strong>{dept.name}</strong>
                                </div>
                                {dept.description && (
                                  <div className="text-muted text-sm mt-1" style={{ fontSize: '0.8rem' }}>
                                    {dept.description}
                                  </div>
                                )}
                              </td>
                              <td>
                                {dept.parentDepartmentName ? (
                                  <span className="text-muted">{dept.parentDepartmentName}</span>
                                ) : (
                                  <span className="tag-self">Cấp cao nhất</span>
                                )}
                              </td>
                              <td>
                                {dept.managerName ? (
                                  <div>
                                    <div className="font-medium">{dept.managerName}</div>
                                    {dept.managerEmail && (
                                      <div className="text-light text-xs">{dept.managerEmail}</div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-light">Chưa bổ nhiệm</span>
                                )}
                              </td>
                              <td>
                                <span className="node-metric-chip">
                                  <Users size={12} />
                                  <strong>{dept.employeeCount}</strong> người
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`status-pill ${
                                    dept.active ? 'status-active' : 'status-inactive'
                                  }`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '4px 10px',
                                    borderRadius: '999px',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    background: dept.active ? '#ecfdf5' : '#fef2f2',
                                    color: dept.active ? '#059669' : '#dc2626',
                                    border: `1px solid ${dept.active ? '#a7f3d0' : '#fecaca'}`,
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: '50%',
                                      background: dept.active ? '#10b981' : '#ef4444',
                                    }}
                                  />
                                  <span>{dept.active ? 'Hoạt động' : 'Tạm ngưng'}</span>
                                </span>
                              </td>
                              {canEdit && (
                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: '6px' }}>
                                    <button
                                      type="button"
                                      className="btn btn-outline btn-sm btn-icon-only"
                                      onClick={() => handleOpenAddDept(dept.id)}
                                      title="Thêm phòng ban con"
                                      aria-label={`Thêm phòng ban con cho ${dept.name}`}
                                    >
                                      <Plus size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline btn-sm btn-icon-only"
                                      onClick={() => handleOpenEditDept(dept)}
                                      title="Chỉnh sửa phòng ban"
                                      aria-label={`Chỉnh sửa ${dept.name}`}
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline btn-sm btn-icon-only"
                                      onClick={() => handleToggleDeptStatus(dept.id)}
                                      title={dept.active ? 'Tạm ngưng' : 'Kích hoạt lại'}
                                      aria-label={dept.active ? 'Tạm ngưng' : 'Kích hoạt lại'}
                                    >
                                      <Power size={14} style={{ color: dept.active ? '#d97706' : '#10b981' }} />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline btn-sm btn-icon-only"
                                      onClick={() => handleDeleteDept(dept)}
                                      title="Xóa phòng ban"
                                      aria-label={`Xóa ${dept.name}`}
                                    >
                                      <Trash2 size={14} style={{ color: '#ef4444' }} />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              TAB 3: CHI NHÁNH & ĐỊA ĐIỂM LÀM VIỆC
              ================================================================ */}
          {activeTab === 'locations' && (
            <div className="locations-tab-view" data-testid="tab-locations">
              <div className="locations-header-bar">
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                    Danh sách Văn phòng & Chi nhánh làm việc
                  </h3>
                  <p className="text-muted text-sm mt-1">
                    Quản lý các cơ sở làm việc, trụ sở chính và chi nhánh tuyển dụng của tổ chức
                  </p>
                </div>
                {canEdit && (
                  <button type="button" className="btn btn-primary" onClick={handleOpenAddLoc}>
                    <Plus size={16} />
                    <span>Thêm địa điểm mới</span>
                  </button>
                )}
              </div>

              <div className="locations-grid">
                {locations.map((loc) => (
                  <div
                    key={loc.id}
                    className={`location-card ${loc.isHeadquarter ? 'is-hq' : ''}`}
                    data-testid={`location-card-${loc.id}`}
                  >
                    <div className="location-card-top">
                      <div className="location-name-area">
                        <span className="location-type-tag">
                          {loc.type === 'HEADQUARTER'
                            ? 'Trụ sở chính'
                            : loc.type === 'RD_CENTER'
                            ? 'Trung tâm R&D'
                            : loc.type === 'BRANCH'
                            ? 'Chi nhánh'
                            : 'Văn phòng đại diện'}
                        </span>
                        <h4 className="location-title">{loc.name}</h4>
                      </div>
                      {loc.isHeadquarter && (
                        <span className="hq-badge" title="Trụ sở chính pháp lý">
                          <Award size={12} />
                          <span>Trụ sở chính</span>
                        </span>
                      )}
                    </div>

                    <div className="location-details-list">
                      <div className="location-detail-row">
                        <MapPin size={16} className="location-detail-icon" />
                        <div>
                          <strong>Địa chỉ:</strong>
                          <div className="text-muted mt-1">{loc.address}</div>
                        </div>
                      </div>

                      <div className="location-detail-row">
                        <Phone size={16} className="location-detail-icon" />
                        <div>
                          <strong>Điện thoại:</strong>{' '}
                          <span className="text-muted">{loc.phone || 'Chưa cập nhật'}</span>
                        </div>
                      </div>

                      <div className="location-detail-row">
                        <Mail size={16} className="location-detail-icon" />
                        <div>
                          <strong>Email:</strong>{' '}
                          <span className="text-muted">{loc.email || 'Chưa cập nhật'}</span>
                        </div>
                      </div>

                      {loc.managerName && (
                        <div className="location-detail-row">
                          <Users size={16} className="location-detail-icon" />
                          <div>
                            <strong>Phụ trách cơ sở:</strong>{' '}
                            <span className="text-muted">{loc.managerName}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {canEdit && (
                      <div className="location-actions-bar">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => handleOpenEditLoc(loc)}
                        >
                          <Edit2 size={13} />
                          <span>Chỉnh sửa</span>
                        </button>
                        {!loc.isHeadquarter && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleDeleteLoc(loc)}
                            style={{ color: '#ef4444' }}
                          >
                            <Trash2 size={13} />
                            <span>Xóa</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================
              TAB 4: CHÍNH SÁCH & ĐÃI NGỘ
              ================================================================ */}
          {activeTab === 'branding' && (
            <div className="branding-tab-view" data-testid="tab-branding">
              <div className="policy-cards-grid">
                {/* Working Hours & Model */}
                <div className="policy-card">
                  <div className="card-title-row">
                    <h3>
                      <Clock size={18} className="card-title-icon" />
                      <span>Thời gian & Chế độ làm việc</span>
                    </h3>
                  </div>

                  <div className="location-details-list">
                    <div className="info-item">
                      <span className="info-item-label">Khung giờ làm việc tiêu chuẩn</span>
                      <span className="info-item-value font-medium">
                        {profile?.workPolicy?.standardWorkingHours}
                      </span>
                    </div>

                    <div className="info-item">
                      <span className="info-item-label">Mô hình làm việc</span>
                      <span className="info-item-value font-medium">
                        {profile?.workPolicy?.workModel}
                      </span>
                    </div>

                    <div className="info-item">
                      <span className="info-item-label">Chế độ thử việc</span>
                      <span className="info-item-value font-medium">
                        {profile?.workPolicy?.probationPeriod}
                      </span>
                    </div>

                    <div className="info-item">
                      <span className="info-item-label">Số ngày phép năm</span>
                      <span className="info-item-value font-medium">
                        {profile?.workPolicy?.leaveDaysPerYear} ngày phép / năm
                      </span>
                    </div>

                    <div className="info-item">
                      <span className="info-item-label">Trang phục làm việc</span>
                      <span className="info-item-value font-medium">
                        {profile?.workPolicy?.dressCode}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Key Benefits */}
                <div className="policy-card">
                  <div className="card-title-row">
                    <h3>
                      <Award size={18} className="card-title-icon" />
                      <span>Chế độ Phúc lợi & Đãi ngộ cốt lõi</span>
                    </h3>
                  </div>

                  <p className="text-muted text-sm mb-3">
                    Các chính sách phúc lợi được tự động đồng bộ lên Cổng thông tin Tuyển dụng công khai để thu hút ứng viên:
                  </p>

                  <div className="benefits-list">
                    {profile?.workPolicy?.keyBenefits?.map((benefit, idx) => (
                      <div key={idx} className="benefit-item">
                        <CheckCircle2 size={18} className="benefit-check-icon" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ====================================================================
          MODALS
          ==================================================================== */}
      {/* Department Modal */}
      <DepartmentModal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        onSave={handleSaveDept}
        department={selectedDept}
        parentDepartmentId={presetParentDeptId}
        allDepartments={departments}
      />

      {/* Location Modal */}
      <LocationModal
        isOpen={isLocModalOpen}
        onClose={() => setIsLocModalOpen(false)}
        onSave={handleSaveLoc}
        location={selectedLoc}
      />
    </div>
  );
};

export default OrganizationManagementPage;
