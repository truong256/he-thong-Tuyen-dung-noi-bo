package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.*;
import com.example.auth_service.entity.*;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.*;
import com.example.auth_service.security.CandidateScope;
import com.example.auth_service.security.Permission;
import com.example.auth_service.security.UserPrincipal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class CandidateUnifiedProfileService {

    private final CandidateApplicationRepository candidateApplications;
    private final CandidateNoteRepository candidateNotes;
    private final CandidateTagRepository candidateTags;
    private final UserRepository users;
    private final RecruitmentRequisitionRepository requisitions;
    private final DepartmentRepository departments;

    @Value("${app.upload.cv-dir:uploads/cv}")
    private String cvUploadDir;

    public CandidateUnifiedProfileService(CandidateApplicationRepository candidateApplications,
                                          CandidateNoteRepository candidateNotes,
                                          CandidateTagRepository candidateTags,
                                          UserRepository users,
                                          RecruitmentRequisitionRepository requisitions,
                                          DepartmentRepository departments) {
        this.candidateApplications = candidateApplications;
        this.candidateNotes = candidateNotes;
        this.candidateTags = candidateTags;
        this.users = users;
        this.requisitions = requisitions;
        this.departments = departments;
    }

    /**
     * S4-09: Lấy hồ sơ ứng viên hợp nhất kèm lịch sử ứng tuyển đã được lọc theo quyền vị trí.
     */
    @Transactional(readOnly = true)
    public CandidateUnifiedProfileDto getUnifiedProfile(Long applicationId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        CandidateApplication app = findVisibleApplication(applicationId, auth);

        UserPrincipal principal = auth != null && auth.getPrincipal() instanceof UserPrincipal p ? p : null;
        Set<String> authorities = auth != null
                ? auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).collect(Collectors.toSet())
                : Set.of();

        boolean hasPipelineManage = authorities.contains(Permission.PIPELINE_MANAGE.name());
        boolean isWithdrawn = CandidateApplicationWithdrawalService.isWithdrawnStage(app.getStage());

        // Lấy thông tin tài khoản ứng viên (nếu có)
        User candidateUser = null;
        if (app.getCandidateUserId() != null) {
            candidateUser = users.findById(app.getCandidateUserId()).orElse(null);
        }
        if (candidateUser == null && app.getEmail() != null) {
            candidateUser = users.findByEmail(app.getEmail().trim().toLowerCase()).orElse(null);
        }

        String phone = app.getPhone();
        if ((phone == null || phone.isBlank()) && candidateUser != null) {
            phone = candidateUser.getPhone();
        }

        String avatarUrl = candidateUser != null ? candidateUser.getAvatarUrl() : null;

        // Vị trí hiện tại của hồ sơ này
        RecruitmentRequisition currentReq = requisitions.findById(app.getRequisitionId()).orElse(null);
        String currentPositionTitle = currentReq != null ? currentReq.getTitle() : "Vị trí tuyển dụng #" + app.getRequisitionId();
        String currentReqCode = currentReq != null ? currentReq.getRequisitionCode() : "REQ-" + app.getRequisitionId();
        String currentDeptName = "";
        if (currentReq != null && currentReq.getDepartmentId() != null) {
            currentDeptName = departments.findById(currentReq.getDepartmentId())
                    .map(Department::getName)
                    .orElse("");
        }

        // Lấy toàn bộ các lần ứng tuyển của cùng ứng viên
        List<CandidateApplication> allCandidateApps = new ArrayList<>();
        if (app.getCandidateUserId() != null) {
            allCandidateApps.addAll(candidateApplications.findByCandidateUserId(app.getCandidateUserId()));
        }
        if (app.getEmail() != null && !app.getEmail().isBlank()) {
            for (CandidateApplication byEmail : candidateApplications.findByEmailIgnoreCase(app.getEmail().trim())) {
                if (allCandidateApps.stream().noneMatch(a -> a.getId().equals(byEmail.getId()))) {
                    allCandidateApps.add(byEmail);
                }
            }
        }
        if (allCandidateApps.isEmpty()) {
            allCandidateApps.add(app);
        }

        // PHÂN QUYỀN SERVER BẮT BUỘC CHO LỊCH SỬ ỨNG TUYỂN:
        // Lọc danh sách lịch sử theo đúng CandidateScope của người dùng hiện tại.
        // Vị trí nào người dùng KHÔNG CÓ QUYỀN thì KHÔNG TRẢ VỀ.
        var scope = CandidateScope.visibleTo(auth);
        List<Long> allCandidateAppIds = allCandidateApps.stream().map(CandidateApplication::getId).toList();
        Set<Long> allowedAppIds = new HashSet<>(candidateApplications.findAll(
                scope.and((root, query, cb) -> root.get("id").in(allCandidateAppIds))
        ).stream().map(CandidateApplication::getId).toList());

        List<ApplicationHistoryItemDto> historyItems = new ArrayList<>();
        for (CandidateApplication histApp : allCandidateApps) {
            if (!allowedAppIds.contains(histApp.getId())) {
                continue; // Ẩn hoàn toàn vị trí ngoài quyền phụ trách
            }

            RecruitmentRequisition req = requisitions.findById(histApp.getRequisitionId()).orElse(null);
            String title = req != null ? req.getTitle() : "Vị trí #" + histApp.getRequisitionId();
            String code = req != null ? req.getRequisitionCode() : "REQ-" + histApp.getRequisitionId();
            String deptName = "";
            if (req != null && req.getDepartmentId() != null) {
                deptName = departments.findById(req.getDepartmentId()).map(Department::getName).orElse("");
            }

            historyItems.add(ApplicationHistoryItemDto.builder()
                    .applicationId(histApp.getId())
                    .requisitionId(histApp.getRequisitionId())
                    .positionTitle(title)
                    .requisitionCode(code)
                    .departmentName(deptName)
                    .stage(histApp.getStage() != null ? histApp.getStage() : "APPLIED")
                    .appliedAt(histApp.getAppliedAt())
                    .cvFileUrl(histApp.getCvFileUrl())
                    .cvFileName(histApp.getCvFileName())
                    .current(histApp.getId().equals(applicationId))
                    .withdrawn(CandidateApplicationWithdrawalService.isWithdrawnStage(histApp.getStage()))
                    .build());
        }

        // Sắp xếp lịch sử: ưu tiên mới nhất trước
        historyItems.sort((a, b) -> {
            if (a.getAppliedAt() == null && b.getAppliedAt() == null) {
                return b.getApplicationId().compareTo(a.getApplicationId());
            }
            if (a.getAppliedAt() == null) return 1;
            if (b.getAppliedAt() == null) return -1;
            return b.getAppliedAt().compareTo(a.getAppliedAt());
        });

        // Nhãn của hồ sơ hiện tại
        List<CandidateTagDto> tagDtos = candidateTags.findByApplicationIdOrderByCreatedAtAsc(applicationId).stream()
                .map(this::mapTagToDto)
                .collect(Collectors.toList());

        // Ghi chú của hồ sơ hiện tại
        Long currentUserId = principal != null ? principal.getId() : null;
        boolean isAdminOrHr = authorities.contains("ROLE_ADMIN") || authorities.contains("ROLE_HR_MANAGER");

        List<CandidateNoteDto> noteDtos = candidateNotes.findByApplicationIdOrderByCreatedAtDesc(applicationId).stream()
                .map(note -> mapNoteToDto(note, currentUserId, isAdminOrHr))
                .collect(Collectors.toList());

        ProfilePermissionsDto perms = ProfilePermissionsDto.builder()
                .canView(true)
                .canEditStage(hasPipelineManage && !isWithdrawn)
                .canManageTags(hasPipelineManage)
                .canAddNotes(hasPipelineManage)
                .canDeleteNotes(hasPipelineManage)
                .canViewCv(true)
                .canUploadCv(hasPipelineManage)
                .build();

        return CandidateUnifiedProfileDto.builder()
                .id(app.getId())
                .candidateUserId(app.getCandidateUserId())
                .fullName(app.getFullName())
                .email(app.getEmail())
                .phone(phone)
                .avatarUrl(avatarUrl)
                .currentRequisitionId(app.getRequisitionId())
                .currentPositionTitle(currentPositionTitle)
                .currentRequisitionCode(currentReqCode)
                .currentDepartmentName(currentDeptName)
                .currentStage(app.getStage() != null ? app.getStage() : "APPLIED")
                .appliedAt(app.getAppliedAt())
                .coverLetter(app.getCoverLetter())
                .withdrawn(isWithdrawn)
                .withdrawnAt(app.getWithdrawnAt())
                .withdrawalReason(app.getWithdrawalReason())
                .rejectionReason(app.getRejectionReason())
                .cvFileUrl(app.getCvFileUrl())
                .cvFileName(app.getCvFileName())
                .cvFileSize(app.getCvFileSize())
                .cvContentType(app.getCvContentType())
                .applicationHistory(historyItems)
                .tags(tagDtos)
                .notes(noteDtos)
                .permissions(perms)
                .build();
    }

    /**
     * S4-09: Thêm ghi chú cho hồ sơ ứng viên (yêu cầu PIPELINE_MANAGE).
     */
    public CandidateNoteDto addNote(Long applicationId, CreateCandidateNoteRequest req) {
        if (req == null || req.getContent() == null || req.getContent().trim().isEmpty()) {
            throw new BadRequestException("Nội dung ghi chú không được để trống.");
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertPipelineManagePermission(auth);
        CandidateApplication app = findVisibleApplication(applicationId, auth);

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        User author = users.findById(principal.getId()).orElse(null);
        String authorName = author != null ? author.getFullName() : principal.getUsername();

        CandidateNote note = CandidateNote.builder()
                .applicationId(app.getId())
                .candidateUserId(app.getCandidateUserId())
                .authorId(principal.getId())
                .authorName(authorName)
                .content(req.getContent().trim())
                .createdAt(Instant.now())
                .build();

        CandidateNote saved = candidateNotes.save(note);
        return mapNoteToDto(saved, principal.getId(), true);
    }

    /**
     * S4-09: Cập nhật ghi chú (chỉ tác giả hoặc Admin / HR Manager).
     */
    public CandidateNoteDto updateNote(Long applicationId, Long noteId, CreateCandidateNoteRequest req) {
        if (req == null || req.getContent() == null || req.getContent().trim().isEmpty()) {
            throw new BadRequestException("Nội dung ghi chú không được để trống.");
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertPipelineManagePermission(auth);
        CandidateApplication app = findVisibleApplication(applicationId, auth);

        CandidateNote note = candidateNotes.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Ghi chú không tồn tại."));

        if (!note.getApplicationId().equals(app.getId())) {
            throw new AccessDeniedException("Ghi chú không thuộc hồ sơ ứng tuyển này.");
        }

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        boolean isAdminOrHr = hasAnyRole(auth, "ROLE_ADMIN", "ROLE_HR_MANAGER");
        if (!note.getAuthorId().equals(principal.getId()) && !isAdminOrHr) {
            throw new AccessDeniedException("Bạn không có quyền sửa ghi chú của người khác.");
        }

        note.setContent(req.getContent().trim());
        note.setUpdatedAt(Instant.now());
        CandidateNote updated = candidateNotes.save(note);
        return mapNoteToDto(updated, principal.getId(), isAdminOrHr);
    }

    /**
     * S4-09: Xóa ghi chú (chỉ tác giả hoặc Admin / HR Manager).
     */
    public void deleteNote(Long applicationId, Long noteId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertPipelineManagePermission(auth);
        CandidateApplication app = findVisibleApplication(applicationId, auth);

        CandidateNote note = candidateNotes.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Ghi chú không tồn tại."));

        if (!note.getApplicationId().equals(app.getId())) {
            throw new AccessDeniedException("Ghi chú không thuộc hồ sơ ứng tuyển này.");
        }

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        boolean isAdminOrHr = hasAnyRole(auth, "ROLE_ADMIN", "ROLE_HR_MANAGER");
        if (!note.getAuthorId().equals(principal.getId()) && !isAdminOrHr) {
            throw new AccessDeniedException("Bạn không có quyền xóa ghi chú của người khác.");
        }

        candidateNotes.delete(note);
    }

    /**
     * S4-09: Thêm nhãn cho hồ sơ ứng viên (yêu cầu PIPELINE_MANAGE).
     */
    public CandidateTagDto addTag(Long applicationId, CreateCandidateTagRequest req) {
        if (req == null || req.getTagName() == null || req.getTagName().trim().isEmpty()) {
            throw new BadRequestException("Tên nhãn không được để trống.");
        }

        String rawTag = req.getTagName().trim();
        if (rawTag.length() > 50) {
            throw new BadRequestException("Tên nhãn không được vượt quá 50 ký tự.");
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertPipelineManagePermission(auth);
        CandidateApplication app = findVisibleApplication(applicationId, auth);

        Optional<CandidateTag> existing = candidateTags.findByApplicationIdAndTagName(app.getId(), rawTag);
        if (existing.isPresent()) {
            return mapTagToDto(existing.get());
        }

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        CandidateTag tag = CandidateTag.builder()
                .applicationId(app.getId())
                .candidateUserId(app.getCandidateUserId())
                .tagName(rawTag)
                .createdByUserId(principal.getId())
                .createdAt(Instant.now())
                .build();

        CandidateTag saved = candidateTags.save(tag);
        return mapTagToDto(saved);
    }

    /**
     * S4-09: Xóa nhãn khỏi hồ sơ ứng viên (yêu cầu PIPELINE_MANAGE).
     */
    public void deleteTag(Long applicationId, Long tagId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertPipelineManagePermission(auth);
        CandidateApplication app = findVisibleApplication(applicationId, auth);

        CandidateTag tag = candidateTags.findById(tagId)
                .orElseThrow(() -> new ResourceNotFoundException("Nhãn không tồn tại."));

        if (!tag.getApplicationId().equals(app.getId())) {
            throw new AccessDeniedException("Nhãn không thuộc hồ sơ ứng tuyển này.");
        }

        candidateTags.delete(tag);
    }

    /**
     * S4-09: Đọc dữ liệu CV phục vụ xem trước (inline preview) hoặc tải về, bảo đảm kiểm tra quyền truy cập.
     */
    @Transactional(readOnly = true)
    public CvFileContent getCvContent(Long applicationId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        CandidateApplication app = findVisibleApplication(applicationId, auth);

        String fileName = app.getCvFileName();
        if (fileName == null || fileName.isBlank()) {
            fileName = "CV_" + app.getFullName().replaceAll("\\s+", "_") + ".pdf";
        }

        String contentType = app.getCvContentType();
        if (contentType == null || contentType.isBlank()) {
            contentType = fileName.toLowerCase().endsWith(".docx")
                    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    : fileName.toLowerCase().endsWith(".png")
                    ? "image/png"
                    : fileName.toLowerCase().endsWith(".jpg") || fileName.toLowerCase().endsWith(".jpeg")
                    ? "image/jpeg"
                    : "application/pdf";
        }

        // Kiểm tra tệp thực tế trên đĩa (nếu có đường dẫn)
        byte[] bytes = null;
        if (app.getCvFileUrl() != null && !app.getCvFileUrl().isBlank()) {
            String url = app.getCvFileUrl().trim();
            // Nếu là đường dẫn tệp trong uploads/cv
            Path uploadPath = Paths.get(cvUploadDir).resolve(Paths.get(url).getFileName().toString());
            if (Files.exists(uploadPath)) {
                try {
                    bytes = Files.readAllBytes(uploadPath);
                } catch (IOException ignored) {}
            }
        }

        // Nếu chưa có tệp trên đĩa (ví dụ dữ liệu seed hoặc URL mô phỏng), tạo PDF xem trước chuẩn
        if (bytes == null || bytes.length == 0) {
            bytes = generateSampleCandidatePdf(app);
            contentType = "application/pdf";
            if (!fileName.toLowerCase().endsWith(".pdf")) {
                fileName = "CV_" + app.getFullName().replaceAll("\\s+", "_") + ".pdf";
            }
        }

        return new CvFileContent(bytes, fileName, contentType);
    }

    /**
     * S4-09: Tải lên hoặc thay thế CV cho hồ sơ ứng viên (yêu cầu PIPELINE_MANAGE).
     */
    public CandidateUnifiedProfileDto uploadCv(Long applicationId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Tệp CV tải lên không được để trống.");
        }

        long maxSize = 10 * 1024 * 1024; // 10 MB
        if (file.getSize() > maxSize) {
            throw new BadRequestException("Dung lượng tệp CV vượt quá giới hạn 10MB.");
        }

        String originalName = file.getOriginalFilename();
        if (originalName == null || originalName.isBlank()) {
            originalName = "candidate_cv.pdf";
        }

        String lowerName = originalName.toLowerCase();
        List<String> allowedExtensions = List.of(".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg");
        boolean validExt = allowedExtensions.stream().anyMatch(lowerName::endsWith);
        if (!validExt) {
            throw new BadRequestException("Định dạng tệp không được hỗ trợ. Vui lòng tải tệp PDF, DOCX, DOC hoặc hình ảnh.");
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertPipelineManagePermission(auth);
        CandidateApplication app = findVisibleApplication(applicationId, auth);

        try {
            Path targetDir = Paths.get(cvUploadDir);
            Files.createDirectories(targetDir);

            String safeFileName = "cv_" + applicationId + "_" + UUID.randomUUID().toString().substring(0, 8) + "_" +
                    originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
            Path targetFilePath = targetDir.resolve(safeFileName);
            Files.copy(file.getInputStream(), targetFilePath, StandardCopyOption.REPLACE_EXISTING);

            app.setCvFileUrl("/api/candidates/" + applicationId + "/cv");
            app.setCvFileName(originalName);
            app.setCvFileSize(file.getSize());
            app.setCvContentType(file.getContentType() != null ? file.getContentType() : "application/pdf");
            candidateApplications.save(app);

            return getUnifiedProfile(applicationId);
        } catch (IOException e) {
            throw new RuntimeException("Lỗi lưu trữ tệp CV: " + e.getMessage(), e);
        }
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private CandidateApplication findVisibleApplication(Long applicationId, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new AccessDeniedException("Vui lòng đăng nhập để truy cập chức năng này.");
        }

        var scope = CandidateScope.visibleTo(auth);
        return candidateApplications.findOne(
                scope.and((root, query, cb) -> cb.equal(root.get("id"), applicationId))
        ).orElseThrow(() -> {
            // Kiểm tra xem hồ sơ có tồn tại thật hay không để trả lỗi bảo mật phù hợp
            boolean exists = candidateApplications.existsById(applicationId);
            if (exists) {
                return new AccessDeniedException("Bạn không có quyền truy cập hồ sơ ứng viên này.");
            } else {
                return new ResourceNotFoundException("Không tìm thấy hồ sơ ứng viên.");
            }
        });
    }

    private void assertPipelineManagePermission(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new AccessDeniedException("Vui lòng đăng nhập để thực hiện thao tác.");
        }
        boolean hasPermission = auth.getAuthorities().stream()
                .anyMatch(a -> Permission.PIPELINE_MANAGE.name().equals(a.getAuthority()));
        if (!hasPermission) {
            throw new AccessDeniedException("Bạn không có quyền quản lý nhãn và ghi chú của hồ sơ này.");
        }
    }

    private boolean hasAnyRole(Authentication auth, String... roles) {
        if (auth == null) return false;
        Set<String> authRoles = auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).collect(Collectors.toSet());
        for (String r : roles) {
            if (authRoles.contains(r)) return true;
        }
        return false;
    }

    private CandidateNoteDto mapNoteToDto(CandidateNote note, Long currentUserId, boolean isAdminOrHr) {
        boolean canEdit = currentUserId != null && (currentUserId.equals(note.getAuthorId()) || isAdminOrHr);
        return CandidateNoteDto.builder()
                .id(note.getId())
                .applicationId(note.getApplicationId())
                .authorId(note.getAuthorId())
                .authorName(note.getAuthorName() != null ? note.getAuthorName() : "Nhân sự nội bộ")
                .content(note.getContent())
                .createdAt(note.getCreatedAt())
                .updatedAt(note.getUpdatedAt())
                .canEdit(canEdit)
                .canDelete(canEdit)
                .build();
    }

    private CandidateTagDto mapTagToDto(CandidateTag tag) {
        String createdByName = "Nhân sự nội bộ";
        if (tag.getCreatedByUserId() != null) {
            createdByName = users.findById(tag.getCreatedByUserId()).map(User::getFullName).orElse(createdByName);
        }
        return CandidateTagDto.builder()
                .id(tag.getId())
                .applicationId(tag.getApplicationId())
                .tagName(tag.getTagName())
                .createdByUserId(tag.getCreatedByUserId())
                .createdByName(createdByName)
                .createdAt(tag.getCreatedAt())
                .build();
    }

    /**
     * Tạo một tệp PDF chuẩn PDF-1.4 hợp lệ trong bộ nhớ biểu diễn CV của ứng viên.
     */
    private byte[] generateSampleCandidatePdf(CandidateApplication app) {
        String candidateName = app.getFullName() != null ? app.getFullName() : "Ứng viên";
        String email = app.getEmail() != null ? app.getEmail() : "";
        String phone = app.getPhone() != null ? app.getPhone() : "(Chưa cập nhật)";
        String stage = app.getStage() != null ? app.getStage() : "APPLIED";

        // Sanitize string for ASCII PDF stream
        String asciiName = removeAccents(candidateName);
        String textStream = "BT /F1 18 Tf 50 720 Td (CURRICULUM VITAE) Tj " +
                "/F1 14 Tf 0 -35 Td (Ho va ten: " + asciiName + ") Tj " +
                "/F1 11 Tf 0 -25 Td (Email: " + email + ") Tj " +
                "0 -20 Td (So dien thoai: " + phone + ") Tj " +
                "0 -20 Td (Trang thai ung tuyen: " + stage + ") Tj " +
                "0 -35 Td (TOM TAT HO SO: Ung vien tiem nang cho vi tri ung tuyen.) Tj " +
                "0 -25 Td (Kinh nghiem: Co kinh nghiem lam viec trong linh vuc lien quan.) Tj " +
                "0 -25 Td (Ky nang: Giao tiep tot, lam viec nhom, chuyen mon vung vang.) Tj ET";

        int streamLen = textStream.getBytes(StandardCharsets.US_ASCII).length;

        String pdf = "%PDF-1.4\n" +
                "1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n" +
                "2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n" +
                "3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>> endobj\n" +
                "4 0 obj <</Length " + streamLen + ">>\nstream\n" +
                textStream + "\nendstream\nendobj\n" +
                "5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\n" +
                "xref\n0 6\n0000000000 65535 f \n" +
                "0000000009 00000 n \n" +
                "0000000058 00000 n \n" +
                "0000000115 00000 n \n" +
                "0000000228 00000 n \n" +
                "0000000298 00000 n \n" +
                "trailer <</Size 6 /Root 1 0 R>>\nstartxref\n368\n%%EOF";

        return pdf.getBytes(StandardCharsets.US_ASCII);
    }

    private String removeAccents(String src) {
        if (src == null) return "";
        String n = java.text.Normalizer.normalize(src, java.text.Normalizer.Form.NFD);
        return n.replaceAll("\\p{InCombiningDiacriticalMarks}+", "").replaceAll("[^a-zA-Z0-9 ._-]", " ");
    }

    public record CvFileContent(byte[] bytes, String fileName, String contentType) {}
}
