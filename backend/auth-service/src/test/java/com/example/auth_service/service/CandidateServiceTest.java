package com.example.auth_service.service;

import com.example.auth_service.dto.*;
import com.example.auth_service.entity.CandidateApplication;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.repository.CandidateApplicationRepository;
import com.example.auth_service.security.UserPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CandidateServiceTest {

    @Mock
    private CandidateApplicationRepository candidateRepository;

    @Mock
    private CvParsingService cvParsingService;

    @InjectMocks
    private CandidateService candidateService;

    private User recruiterUser;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(candidateService, "cvDir", "target/test-cvs");

        Role role = new Role();
        role.setName(RoleName.RECRUITER);

        recruiterUser = new User();
        recruiterUser.setId(10L);
        recruiterUser.setUsername("recruiter1");
        recruiterUser.setRoles(Set.of(role));

        UserPrincipal principal = UserPrincipal.create(recruiterUser);
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("S4-04: Submitting application with CV parses suggestions into parsed fields without overwriting entered candidate data")
    void testSubmitApplicationWithCv_NonOverwriting() {
        MockMultipartFile cvFile = new MockMultipartFile(
                "file", "my_cv.pdf", "application/pdf", "dummy pdf content".getBytes()
        );

        CvParseResultDto mockParseResult = CvParseResultDto.success(
                "Nguyen Van Extracted", "extracted@ats.com", "0988776655", 1
        );
        when(cvParsingService.parseCv(any(byte[].class))).thenReturn(mockParseResult);

        when(candidateRepository.save(any(CandidateApplication.class)))
                .thenAnswer(invocation -> {
                    CandidateApplication app = invocation.getArgument(0);
                    if (app.getId() == null) app.setId(101L);
                    return app;
                });

        CandidateDetailDto result = candidateService.submitApplication(
                1L, "Tran Van Entered", "entered@candidate.com", "0911223344", 5L, cvFile
        );

        assertThat(result).isNotNull();
        // Candidate's manually entered data remains primary
        assertThat(result.fullName()).isEqualTo("Tran Van Entered");
        assertThat(result.email()).isEqualTo("entered@candidate.com");
        assertThat(result.phone()).isEqualTo("0911223344");

        // Parsed suggestion fields are stored separately
        assertThat(result.parsedFullName()).isEqualTo("Nguyen Van Extracted");
        assertThat(result.parsedEmail()).isEqualTo("extracted@ats.com");
        assertThat(result.parsedPhone()).isEqualTo("0988776655");
        assertThat(result.parsedStatus()).isEqualTo("SUCCESS");
        assertThat(result.isParsedConfirmed()).isFalse();
    }

    @Test
    @DisplayName("S4-04: Submitting application with corrupt CV does not fail application creation")
    void testSubmitApplicationWithCorruptCv_SafeNonBlocking() {
        MockMultipartFile corruptFile = new MockMultipartFile(
                "file", "bad.pdf", "application/pdf", new byte[]{0, 1, 2}
        );

        CvParseResultDto mockFailedResult = CvParseResultDto.failed("Tệp PDF bị lỗi.");
        when(cvParsingService.parseCv(any(byte[].class))).thenReturn(mockFailedResult);

        when(candidateRepository.save(any(CandidateApplication.class)))
                .thenAnswer(invocation -> {
                    CandidateApplication app = invocation.getArgument(0);
                    if (app.getId() == null) app.setId(102L);
                    return app;
                });

        CandidateDetailDto result = candidateService.submitApplication(
                1L, "Le Thi B", "le.b@test.com", "0933445566", null, corruptFile
        );

        // Application was successfully created despite CV parsing failure!
        assertThat(result).isNotNull();
        assertThat(result.fullName()).isEqualTo("Le Thi B");
        assertThat(result.email()).isEqualTo("le.b@test.com");
        assertThat(result.phone()).isEqualTo("0933445566");
        assertThat(result.parsedStatus()).isEqualTo("FAILED");
        assertThat(result.isParsedConfirmed()).isFalse();
    }

    @Test
    @DisplayName("S4-04: Recruiter confirms and saves candidate info, updating primary fields and confirmation timestamp")
    void testConfirmParsedInfo() {
        CandidateApplication existing = new CandidateApplication();
        existing.setId(201L);
        existing.setRequisitionId(1L);
        existing.setFullName("Nguyen Initial");
        existing.setEmail("initial@candidate.com");
        existing.setPhone("0911000000");
        existing.setParsedFullName("Nguyen Van Confirmed");
        existing.setParsedEmail("confirmed@candidate.com");
        existing.setParsedPhone("0988999888");
        existing.setParsedStatus("SUCCESS");
        existing.setIsParsedConfirmed(false);

        when(candidateRepository.findOne(any(Specification.class))).thenReturn(Optional.of(existing));
        when(candidateRepository.save(any(CandidateApplication.class))).thenAnswer(i -> i.getArgument(0));

        ConfirmCandidateInfoRequest confirmReq = new ConfirmCandidateInfoRequest(
                "Nguyen Van Confirmed", "confirmed@candidate.com", "0988999888", "SCREENING"
        );

        CandidateDetailDto confirmed = candidateService.confirmParsedInfo(201L, confirmReq);

        assertThat(confirmed).isNotNull();
        assertThat(confirmed.fullName()).isEqualTo("Nguyen Van Confirmed");
        assertThat(confirmed.email()).isEqualTo("confirmed@candidate.com");
        assertThat(confirmed.phone()).isEqualTo("0988999888");
        assertThat(confirmed.stage()).isEqualTo("SCREENING");
        assertThat(confirmed.isParsedConfirmed()).isTrue();
        assertThat(confirmed.confirmedByUserId()).isEqualTo(10L);
        assertThat(confirmed.confirmedAt()).isNotNull();
    }

    @Test
    @DisplayName("S4-04: Recruiter re-parses CV without overwriting primary fields")
    void testReparseCv_DoesNotOverwritePrimary() {
        CandidateApplication existing = new CandidateApplication();
        existing.setId(202L);
        existing.setRequisitionId(1L);
        existing.setFullName("Nguyen Primary");
        existing.setEmail("primary@test.com");
        existing.setPhone("0900111222");
        existing.setCvFileName("existing_cv.pdf");
        existing.setParsedStatus("NOT_PARSED");

        when(candidateRepository.findOne(any(Specification.class))).thenReturn(Optional.of(existing));
        when(candidateRepository.save(any(CandidateApplication.class))).thenAnswer(i -> i.getArgument(0));

        MockMultipartFile newFile = new MockMultipartFile(
                "file", "new_cv.pdf", "application/pdf", "valid content".getBytes()
        );
        when(cvParsingService.parseCv(any(byte[].class)))
                .thenReturn(CvParseResultDto.success("Nguyen New Suggestion", "new@test.com", "0977665544", 1));

        CandidateDetailDto result = candidateService.reparseCv(202L, newFile);

        // Primary fields still retain original values!
        assertThat(result.fullName()).isEqualTo("Nguyen Primary");
        assertThat(result.email()).isEqualTo("primary@test.com");
        assertThat(result.phone()).isEqualTo("0900111222");

        // Parsed suggestion fields are updated
        assertThat(result.parsedFullName()).isEqualTo("Nguyen New Suggestion");
        assertThat(result.parsedEmail()).isEqualTo("new@test.com");
        assertThat(result.parsedPhone()).isEqualTo("0977665544");
        assertThat(result.parsedStatus()).isEqualTo("SUCCESS");
    }

    @Test
    @DisplayName("S4-04: Candidate not found or outside scope throws AccessDeniedException")
    void testCandidateOutsideScope() {
        when(candidateRepository.findOne(any(Specification.class))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> candidateService.getCandidateDetail(999L))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Bạn không có quyền xem");
    }

    @Test
    @DisplayName("S4-04: Confirming with blank name or email throws BadRequestException")
    void testConfirmWithBlankFieldsThrowsBadRequest() {
        CandidateApplication existing = new CandidateApplication();
        existing.setId(203L);
        when(candidateRepository.findOne(any(Specification.class))).thenReturn(Optional.of(existing));

        ConfirmCandidateInfoRequest invalidReq = new ConfirmCandidateInfoRequest(
                "", "valid@email.com", "0911223344", "APPLIED"
        );

        assertThatThrownBy(() -> candidateService.confirmParsedInfo(203L, invalidReq))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Họ và tên");
    }
}
