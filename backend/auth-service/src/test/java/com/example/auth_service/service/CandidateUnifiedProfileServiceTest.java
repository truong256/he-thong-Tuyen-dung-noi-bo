package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.*;
import com.example.auth_service.entity.*;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.*;
import com.example.auth_service.security.Permission;
import com.example.auth_service.security.UserPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CandidateUnifiedProfileServiceTest {

    @Mock private CandidateApplicationRepository candidateApplications;
    @Mock private CandidateNoteRepository candidateNotes;
    @Mock private CandidateTagRepository candidateTags;
    @Mock private UserRepository users;
    @Mock private RecruitmentRequisitionRepository requisitions;
    @Mock private DepartmentRepository departments;

    private CandidateUnifiedProfileService service;
    private Path tempCvDir;

    private UserPrincipal recruiterPrincipal;
    private UserPrincipal hiringManagerPrincipal;
    private UserPrincipal adminPrincipal;

    @BeforeEach
    void setUp() throws Exception {
        service = new CandidateUnifiedProfileService(
                candidateApplications,
                candidateNotes,
                candidateTags,
                users,
                requisitions,
                departments
        );

        tempCvDir = Files.createTempDirectory("ats_cv_test");
        org.springframework.test.util.ReflectionTestUtils.setField(service, "cvUploadDir", tempCvDir.toString());

        recruiterPrincipal = new UserPrincipal(10L, "recruiter@company.com", "Recruiter User", "pass", "ACTIVE",
                List.of(new SimpleGrantedAuthority("ROLE_RECRUITER"),
                        new SimpleGrantedAuthority(Permission.CANDIDATE_READ_ASSIGNED.name()),
                        new SimpleGrantedAuthority(Permission.PIPELINE_MANAGE.name())));

        hiringManagerPrincipal = new UserPrincipal(20L, "hm@company.com", "HM User", "pass", "ACTIVE",
                List.of(new SimpleGrantedAuthority("ROLE_HIRING_MANAGER"),
                        new SimpleGrantedAuthority(Permission.CANDIDATE_READ_ASSIGNED.name())));

        adminPrincipal = new UserPrincipal(1L, "admin@company.com", "Admin User", "pass", "ACTIVE",
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"),
                        new SimpleGrantedAuthority(Permission.CANDIDATE_READ_ALL.name()),
                        new SimpleGrantedAuthority(Permission.PIPELINE_MANAGE.name())));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        if (tempCvDir != null) {
            try {
                Files.walk(tempCvDir)
                        .sorted(Comparator.reverseOrder())
                        .map(Path::toFile)
                        .forEach(File::delete);
            } catch (Exception ignored) {}
        }
    }

    private void authenticate(UserPrincipal principal) {
        var token = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(token);
    }

    @Test
    @DisplayName("S4-09 AC1: Lấy hồ sơ hợp nhất thành công với đầy đủ thông tin vị trí, CV, nhãn và ghi chú")
    void testGetUnifiedProfile_success() {
        authenticate(recruiterPrincipal);

        CandidateApplication app = new CandidateApplication();
        app.setId(100L);
        app.setRequisitionId(1L);
        app.setCandidateUserId(55L);
        app.setFullName("Nguyen Van An");
        app.setEmail("an.nguyen@test.com");
        app.setPhone("0987654321");
        app.setStage("SCREENING");
        app.setAppliedAt(Instant.now());
        app.setCvFileUrl("/api/candidates/100/cv");
        app.setCvFileName("my_cv.pdf");

        when(candidateApplications.findOne(any(Specification.class))).thenReturn(Optional.of(app));
        when(candidateApplications.findByCandidateUserId(55L)).thenReturn(List.of(app));
        when(candidateApplications.findByEmailIgnoreCase("an.nguyen@test.com")).thenReturn(List.of(app));
        when(candidateApplications.findAll(any(Specification.class))).thenReturn(List.of(app));

        RecruitmentRequisition req = new RecruitmentRequisition();
        req.setId(1L);
        req.setRequisitionCode("REQ-IT-001");
        req.setTitle("Senior Java Developer");
        req.setDepartmentId(10L);
        when(requisitions.findById(1L)).thenReturn(Optional.of(req));

        Department dept = new Department();
        dept.setId(10L);
        dept.setName("Phong Cong Nghe Thong Tin");
        when(departments.findById(10L)).thenReturn(Optional.of(dept));

        CandidateTag tag = CandidateTag.builder().id(1L).applicationId(100L).tagName("Java Spring").build();
        when(candidateTags.findByApplicationIdOrderByCreatedAtAsc(100L)).thenReturn(List.of(tag));

        CandidateNote note = CandidateNote.builder().id(1L).applicationId(100L).authorId(10L).authorName("Recruiter User").content("Ung vien tot").build();
        when(candidateNotes.findByApplicationIdOrderByCreatedAtDesc(100L)).thenReturn(List.of(note));

        CandidateUnifiedProfileDto result = service.getUnifiedProfile(100L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(100L);
        assertThat(result.getFullName()).isEqualTo("Nguyen Van An");
        assertThat(result.getCurrentPositionTitle()).isEqualTo("Senior Java Developer");
        assertThat(result.getCurrentDepartmentName()).isEqualTo("Phong Cong Nghe Thong Tin");
        assertThat(result.getTags()).hasSize(1);
        assertThat(result.getNotes()).hasSize(1);
        assertThat(result.getPermissions().isCanAddNotes()).isTrue();
        assertThat(result.getPermissions().isCanManageTags()).isTrue();
    }

    @Test
    @DisplayName("S4-09 AC2: Lịch sử ứng tuyển lọc bỏ các vị trí ngoài phạm vi phân công của Recruiter")
    void testGetUnifiedProfile_filtersOutOfScopeHistory() {
        authenticate(recruiterPrincipal);

        CandidateApplication app1 = new CandidateApplication();
        app1.setId(101L);
        app1.setRequisitionId(1L); // Vị trí recruiter có quyền
        app1.setCandidateUserId(55L);
        app1.setFullName("Le Thi B");
        app1.setEmail("b.le@test.com");
        app1.setStage("INTERVIEW");

        CandidateApplication app2 = new CandidateApplication();
        app2.setId(102L);
        app2.setRequisitionId(2L); // Vị trí khác mà recruiter KHÔNG được phân công
        app2.setCandidateUserId(55L);
        app2.setFullName("Le Thi B");
        app2.setEmail("b.le@test.com");
        app2.setStage("APPLIED");

        when(candidateApplications.findOne(any(Specification.class))).thenReturn(Optional.of(app1));
        when(candidateApplications.findByCandidateUserId(55L)).thenReturn(List.of(app1, app2));
        when(candidateApplications.findByEmailIgnoreCase("b.le@test.com")).thenReturn(List.of(app1, app2));

        // CandidateScope chỉ trả về app1 trong danh sách quyền
        when(candidateApplications.findAll(any(Specification.class))).thenReturn(List.of(app1));

        RecruitmentRequisition req1 = new RecruitmentRequisition();
        req1.setId(1L);
        req1.setTitle("Backend Engineer");
        when(requisitions.findById(1L)).thenReturn(Optional.of(req1));

        CandidateUnifiedProfileDto result = service.getUnifiedProfile(101L);

        assertThat(result).isNotNull();
        // Lịch sử CHỈ chứa app1, hoàn toàn KHÔNG chứa app2
        assertThat(result.getApplicationHistory()).hasSize(1);
        assertThat(result.getApplicationHistory().get(0).getApplicationId()).isEqualTo(101L);
    }

    @Test
    @DisplayName("S4-09 AC3: Truy cập hồ sơ ngoài phạm vi hoặc không tồn tại bị từ chối")
    void testGetUnifiedProfile_forbiddenOrNotFound() {
        authenticate(recruiterPrincipal);

        when(candidateApplications.findOne(any(Specification.class))).thenReturn(Optional.empty());
        when(candidateApplications.existsById(999L)).thenReturn(true);

        assertThrows(AccessDeniedException.class, () -> service.getUnifiedProfile(999L));

        when(candidateApplications.existsById(888L)).thenReturn(false);
        assertThrows(ResourceNotFoundException.class, () -> service.getUnifiedProfile(888L));
    }

    @Test
    @DisplayName("S4-09 AC4: Thêm ghi chú thành công khi có quyền PIPELINE_MANAGE")
    void testAddNote_success() {
        authenticate(recruiterPrincipal);

        CandidateApplication app = new CandidateApplication();
        app.setId(100L);
        when(candidateApplications.findOne(any(Specification.class))).thenReturn(Optional.of(app));

        User author = new User();
        author.setId(10L);
        author.setFullName("Recruiter User");
        when(users.findById(10L)).thenReturn(Optional.of(author));

        when(candidateNotes.save(any(CandidateNote.class))).thenAnswer(inv -> {
            CandidateNote n = inv.getArgument(0);
            n.setId(501L);
            return n;
        });

        CreateCandidateNoteRequest req = new CreateCandidateNoteRequest("Ứng viên làm test rất tốt");
        CandidateNoteDto result = service.addNote(100L, req);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(501L);
        assertThat(result.getContent()).isEqualTo("Ứng viên làm test rất tốt");
        assertThat(result.getAuthorName()).isEqualTo("Recruiter User");
    }

    @Test
    @DisplayName("S4-09 AC5: Hiring Manager chỉ có quyền xem, bị từ chối ghi chú (403 AccessDenied)")
    void testAddNote_hiringManagerDenied() {
        authenticate(hiringManagerPrincipal);

        CreateCandidateNoteRequest req = new CreateCandidateNoteRequest("Ghi chú của HM");
        assertThrows(AccessDeniedException.class, () -> service.addNote(100L, req));
    }

    @Test
    @DisplayName("S4-09 AC6: Sửa và xóa ghi chú chỉ dành cho tác giả hoặc Admin")
    void testUpdateAndDeleteNote_permissionChecks() {
        authenticate(recruiterPrincipal); // user id 10L

        CandidateApplication app = new CandidateApplication();
        app.setId(100L);
        when(candidateApplications.findOne(any(Specification.class))).thenReturn(Optional.of(app));

        CandidateNote note = CandidateNote.builder()
                .id(201L)
                .applicationId(100L)
                .authorId(99L) // Tác giả khác
                .content("Ghi chu cua nguoi khac")
                .build();
        when(candidateNotes.findById(201L)).thenReturn(Optional.of(note));

        CreateCandidateNoteRequest updateReq = new CreateCandidateNoteRequest("Cố tình sửa");
        // Recruiter id 10 không thể sửa ghi chú của tác giả id 99
        assertThrows(AccessDeniedException.class, () -> service.updateNote(100L, 201L, updateReq));
        assertThrows(AccessDeniedException.class, () -> service.deleteNote(100L, 201L));

        // Đổi sang Admin -> được phép sửa và xóa
        authenticate(adminPrincipal);
        when(candidateNotes.save(any(CandidateNote.class))).thenAnswer(inv -> inv.getArgument(0));

        CandidateNoteDto updated = service.updateNote(100L, 201L, updateReq);
        assertThat(updated.getContent()).isEqualTo("Cố tình sửa");

        service.deleteNote(100L, 201L);
        verify(candidateNotes).delete(note);
    }

    @Test
    @DisplayName("S4-09 AC7: Thêm và xóa nhãn hồ sơ ứng viên")
    void testAddAndDeleteTag() {
        authenticate(recruiterPrincipal);

        CandidateApplication app = new CandidateApplication();
        app.setId(100L);
        when(candidateApplications.findOne(any(Specification.class))).thenReturn(Optional.of(app));
        when(candidateTags.findByApplicationIdAndTagName(100L, "Java Core")).thenReturn(Optional.empty());

        when(candidateTags.save(any(CandidateTag.class))).thenAnswer(inv -> {
            CandidateTag t = inv.getArgument(0);
            t.setId(301L);
            return t;
        });

        CreateCandidateTagRequest tagReq = new CreateCandidateTagRequest("Java Core");
        CandidateTagDto tag = service.addTag(100L, tagReq);
        assertThat(tag).isNotNull();
        assertThat(tag.getTagName()).isEqualTo("Java Core");

        // Xóa nhãn
        CandidateTag existingTag = CandidateTag.builder().id(301L).applicationId(100L).tagName("Java Core").build();
        when(candidateTags.findById(301L)).thenReturn(Optional.of(existingTag));

        service.deleteTag(100L, 301L);
        verify(candidateTags).delete(existingTag);
    }

    @Test
    @DisplayName("S4-09 AC8: Đọc tệp CV xem trước tạo PDF chuẩn khi chưa có tệp đĩa")
    void testGetCvContent_samplePdf() {
        authenticate(recruiterPrincipal);

        CandidateApplication app = new CandidateApplication();
        app.setId(100L);
        app.setFullName("Tran Van Cuong");
        app.setEmail("cuong@test.com");
        app.setPhone("0912345678");

        when(candidateApplications.findOne(any(Specification.class))).thenReturn(Optional.of(app));

        var cvContent = service.getCvContent(100L);
        assertThat(cvContent).isNotNull();
        assertThat(cvContent.bytes()).isNotEmpty();
        assertThat(cvContent.contentType()).isEqualTo("application/pdf");
        assertThat(new String(cvContent.bytes(), 0, 8)).contains("%PDF-1.4");
    }

    @Test
    @DisplayName("S4-09 AC9: Tải lên CV xác thực kích thước và định dạng tệp")
    void testUploadCv_validation() {
        authenticate(recruiterPrincipal);

        CandidateApplication app = new CandidateApplication();
        app.setId(100L);
        app.setRequisitionId(1L);
        app.setCandidateUserId(55L);
        app.setFullName("Nguyen Van An");
        app.setEmail("an.nguyen@test.com");

        when(candidateApplications.findOne(any(Specification.class))).thenReturn(Optional.of(app));

        // Tệp rỗng
        MockMultipartFile emptyFile = new MockMultipartFile("file", "cv.pdf", "application/pdf", new byte[0]);
        assertThrows(BadRequestException.class, () -> service.uploadCv(100L, emptyFile));

        // Tệp đuôi nguy hiểm (.exe)
        MockMultipartFile exeFile = new MockMultipartFile("file", "malware.exe", "application/octet-stream", "dummy".getBytes());
        assertThrows(BadRequestException.class, () -> service.uploadCv(100L, exeFile));

        // Tệp PDF hợp lệ
        MockMultipartFile validPdf = new MockMultipartFile("file", "my_cv.pdf", "application/pdf", "%PDF-1.4 sample content".getBytes());
        when(candidateApplications.save(any(CandidateApplication.class))).thenAnswer(inv -> inv.getArgument(0));

        when(requisitions.findById(1L)).thenReturn(Optional.of(new RecruitmentRequisition()));
        when(candidateApplications.findByCandidateUserId(55L)).thenReturn(List.of(app));
        when(candidateApplications.findByEmailIgnoreCase("an.nguyen@test.com")).thenReturn(List.of(app));
        when(candidateApplications.findAll(any(Specification.class))).thenReturn(List.of(app));

        CandidateUnifiedProfileDto updated = service.uploadCv(100L, validPdf);
        assertThat(updated).isNotNull();
        assertThat(updated.getCvFileName()).isEqualTo("my_cv.pdf");
    }
}
