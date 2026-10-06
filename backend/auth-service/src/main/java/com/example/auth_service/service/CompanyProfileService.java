package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.CompanyProfile;
import com.example.auth_service.repository.CompanyProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@Transactional
public class CompanyProfileService {

    private final CompanyProfileRepository repository;

    public CompanyProfileService(CompanyProfileRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public CompanyProfile getProfile() {
        List<CompanyProfile> all = repository.findAll();
        if (!all.isEmpty()) {
            return all.get(0);
        }
        // Fallback default enterprise profile
        CompanyProfile defaultProfile = new CompanyProfile();
        defaultProfile.setCompanyName("Công ty Cổ phần Công nghệ & Giải pháp Tuyển dụng ATS Việt Nam");
        defaultProfile.setShortName("ATS Corporation");
        defaultProfile.setLegalName("CÔNG TY CỔ PHẦN CÔNG NGHỆ & GIẢI PHÁP TUYỂN DỤNG ATS VIỆT NAM");
        defaultProfile.setTaxCode("0109887766");
        defaultProfile.setBusinessLicense("0109887766 cấp ngày 15/10/2018 bởi Sở KH&ĐT TP. Hà Nội");
        defaultProfile.setFoundedDate("2018-10-15");
        defaultProfile.setIndustry("Công nghệ thông tin & Dịch vụ Phần mềm Quản trị Nhân sự (HRTech / SaaS)");
        defaultProfile.setCompanySize("100 - 500 nhân sự");
        defaultProfile.setEmail("contact@ats-corp.vn");
        defaultProfile.setPhone("(+84) 24 3998 8899");
        defaultProfile.setWebsite("https://ats-corp.vn");
        defaultProfile.setAddress("Tầng 12, Tòa nhà Innovation Tower, Số 88 Đường Cầu Giấy, Phường Dịch Vọng Hậu, Quận Cầu Giấy");
        defaultProfile.setCity("Hà Nội");
        defaultProfile.setCountry("Việt Nam");
        defaultProfile.setDescription("ATS Corporation là đơn vị tiên phong cung cấp giải pháp chuyển đổi số toàn diện cho quy trình tuyển dụng và quản trị nhân tài nội bộ tại Việt Nam.");
        defaultProfile.setMission("Đơn giản hóa và số hóa toàn diện quy trình thu hút, tuyển chọn và phát triển nguồn nhân lực chất lượng cao cho các tổ chức tại Việt Nam và khu vực.");
        defaultProfile.setVision("Trở thành hệ sinh thái nền tảng công nghệ quản trị tuyển dụng và nhân sự được tin dùng hàng đầu Đông Nam Á vào năm 2030.");
        defaultProfile.setCoreValues("[\"Tận tâm (Dedication)\", \"Đổi mới sáng tạo (Innovation)\", \"Chính trực & Minh bạch (Integrity)\", \"Hiệu quả vượt trội (Excellence)\", \"Tinh thần đồng đội (One Team)\"]");
        defaultProfile.setLegalRepresentative("{\"name\": \"Nguyễn Hoàng Long\", \"title\": \"Tổng Giám Đốc (Chief Executive Officer)\", \"phone\": \"0912 345 678\", \"email\": \"long.nh@ats-corp.vn\", \"idNumber\": \"001088009988\"}");
        defaultProfile.setWorkPolicy("{\"standardWorkingHours\": \"08:30 - 17:30 (Thứ Hai - Thứ Sáu, nghỉ Thứ Bảy & Chủ Nhật)\", \"workModel\": \"Hybrid linh hoạt (Hỗ trợ tối đa 2 ngày làm việc từ xa/tuần)\", \"probationPeriod\": \"2 tháng (hưởng 100% lương chính thức theo thỏa thuận)\", \"leaveDaysPerYear\": 14, \"dressCode\": \"Smart Casual thoải mái, thanh lịch\", \"noticePeriodDays\": 30, \"keyBenefits\": [\"Gói bảo hiểm sức khỏe cao cấp Bảo Việt / PVI dành cho nhân viên và người thân\", \"Thưởng lương tháng 13, thưởng hiệu suất tuyển dụng & kinh doanh theo quý\", \"Ngân sách 15.000.000 VNĐ/năm hỗ trợ đào tạo và chứng chỉ nghề nghiệp quốc tế\", \"Chuyến du lịch hè thường niên tại các resort 5 sao và chương trình teambuilding\", \"Phụ cấp ăn trưa, trà, cà phê, hoa quả tươi hàng ngày tại pantry công ty\", \"Trang bị máy tính xách tay cao cấp (MacBook Pro / Dell XPS) khi nhận việc\"]}");
        defaultProfile.setUpdatedBy("Hệ thống");
        return repository.save(defaultProfile);
    }

    public CompanyProfile updateProfile(CompanyProfile payload, String username) {
        CompanyProfile existing = getProfile();
        if (payload.getCompanyName() != null) existing.setCompanyName(payload.getCompanyName());
        if (payload.getShortName() != null) existing.setShortName(payload.getShortName());
        if (payload.getLegalName() != null) existing.setLegalName(payload.getLegalName());
        if (payload.getTaxCode() != null) existing.setTaxCode(payload.getTaxCode());
        if (payload.getBusinessLicense() != null) existing.setBusinessLicense(payload.getBusinessLicense());
        if (payload.getFoundedDate() != null) existing.setFoundedDate(payload.getFoundedDate());
        if (payload.getIndustry() != null) existing.setIndustry(payload.getIndustry());
        if (payload.getCompanySize() != null) existing.setCompanySize(payload.getCompanySize());
        if (payload.getEmail() != null) existing.setEmail(payload.getEmail());
        if (payload.getPhone() != null) existing.setPhone(payload.getPhone());
        if (payload.getWebsite() != null) existing.setWebsite(payload.getWebsite());
        if (payload.getAddress() != null) existing.setAddress(payload.getAddress());
        if (payload.getCity() != null) existing.setCity(payload.getCity());
        if (payload.getCountry() != null) existing.setCountry(payload.getCountry());
        if (payload.getDescription() != null) existing.setDescription(payload.getDescription());
        if (payload.getMission() != null) existing.setMission(payload.getMission());
        if (payload.getVision() != null) existing.setVision(payload.getVision());
        if (payload.getCoreValues() != null) existing.setCoreValues(payload.getCoreValues());
        if (payload.getLegalRepresentative() != null) existing.setLegalRepresentative(payload.getLegalRepresentative());
        if (payload.getWorkPolicy() != null) existing.setWorkPolicy(payload.getWorkPolicy());

        existing.setUpdatedAt(Instant.now());
        existing.setUpdatedBy(username != null ? username : "Quản trị viên");
        return repository.save(existing);
    }
}
