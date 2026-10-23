package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.WithdrawalResultResponse;
import com.example.auth_service.dto.WithdrawalValidationResponse;
import com.example.auth_service.entity.*;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CandidateApplicationWithdrawalServiceTest {

    @Mock
    private CandidateApplicationRepository applicationRepository;

    @Mock
    private CandidateApplicationWithdrawTokenRepository tokenRepository;

    @Mock
    private RecruitmentRequisitionRepository requisitionRepository;

    @Mock
    private RequisitionAssignmentRepository assignmentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private MailService mailService;

    @InjectMocks
    private CandidateApplicationWithdrawalService service;

    private CandidateApplication sampleApp;
    private CandidateApplicationWithdrawToken sampleToken;
    private RecruitmentRequisition sampleReq;
    private RequisitionAssignment sampleAssignment;
    private User sampleRecruiter;

    @BeforeEach
    void setUp() {
        sampleApp = new CandidateApplication();
        sampleApp.setId(101L);
        sampleApp.setRequisitionId(202L);
        sampleApp.setCandidateUserId(303L);
        sampleApp.setFullName("Nguyen Van A");
        sampleApp.setEmail("candidate@test.com");
        sampleApp.setStage("APPLIED");

        sampleToken = new CandidateApplicationWithdrawToken();
        sampleToken.setId(1L);
        sampleToken.setToken("valid-secret-token-123");
        sampleToken.setApplicationId(101L);
        sampleToken.setExpiryDate(Instant.now().plus(7, ChronoUnit.DAYS));
        sampleToken.setUsed(false);
        sampleToken.setCreatedAt(Instant.now());

        sampleReq = new RecruitmentRequisition();
        sampleReq.setId(202L);
        sampleReq.setRequisitionCode("REQ-2026-001");
        sampleReq.setTitle("Ky su Phan mem Senior");

        sampleAssignment = new RequisitionAssignment();
        sampleAssignment.setId(501L);
        sampleAssignment.setRequisitionId(202L);
        sampleAssignment.setUserId(808L);
        sampleAssignment.setRole(RoleName.RECRUITER);
        sampleAssignment.setPrimary(true);

        sampleRecruiter = new User();
        sampleRecruiter.setId(808L);
        sampleRecruiter.setEmail("recruiter@company.com");
        sampleRecruiter.setFullName("Recruiter Lead");
    }

    @Test
    @DisplayName("1. Rút hồ sơ hợp lệ thành công qua token: cập nhật stage=WITHDRAWN, mark token used, gửi thông báo recruiter")
    void testConfirmWithdrawal_valid_success() {
        when(tokenRepository.findByToken("valid-secret-token-123")).thenReturn(Optional.of(sampleToken));
        when(applicationRepository.findById(101L)).thenReturn(Optional.of(sampleApp));
        when(applicationRepository.save(any(CandidateApplication.class))).thenAnswer(i -> i.getArgument(0));
        when(tokenRepository.save(any(CandidateApplicationWithdrawToken.class))).thenAnswer(i -> i.getArgument(0));
        when(requisitionRepository.findById(202L)).thenReturn(Optional.of(sampleReq));
        when(assignmentRepository.findByRequisitionIdAndRole(202L, RoleName.RECRUITER)).thenReturn(List.of(sampleAssignment));
        when(userRepository.findById(808L)).thenReturn(Optional.of(sampleRecruiter));
        when(notificationRepository.existsByUserIdAndRelatedEntityTypeAndRelatedEntityIdAndType(
                808L, "CANDIDATE_APPLICATION", 101L, "CANDIDATE_WITHDRAWAL")).thenReturn(false);

        WithdrawalResultResponse result = service.confirmWithdrawal("valid-secret-token-123", "Đã nhận việc nơi khác");

        assertThat(result.success()).isTrue();
        assertThat(result.stage()).isEqualTo("WITHDRAWN");
        assertThat(sampleApp.getStage()).isEqualTo("WITHDRAWN");
        assertThat(sampleApp.getWithdrawnAt()).isNotNull();
        assertThat(sampleApp.getWithdrawalReason()).isEqualTo("Đã nhận việc nơi khác");
        assertThat(sampleToken.isUsed()).isTrue();
        assertThat(sampleToken.getUsedAt()).isNotNull();

        // Verify in-app notification saved for recruiter
        ArgumentCaptor<Notification> notifCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(notifCaptor.capture());
        Notification savedNotif = notifCaptor.getValue();
        assertThat(savedNotif.getUserId()).isEqualTo(808L);
        assertThat(savedNotif.getType()).isEqualTo("CANDIDATE_WITHDRAWAL");
        assertThat(savedNotif.getTitle()).contains("Ứng viên đã rút hồ sơ");
        assertThat(savedNotif.getContent()).contains("Nguyen Van A");
        assertThat(savedNotif.getContent()).contains("Ky su Phan mem Senior");

        // Verify email dispatched to recruiter
        verify(mailService).sendCandidateWithdrawnNotification("recruiter@company.com", "Nguyen Van A", "Ky su Phan mem Senior", 101L);
    }

    @Test
    @DisplayName("2. Token không hợp lệ: ném BadRequestException")
    void testConfirmWithdrawal_invalidToken() {
        when(tokenRepository.findByToken("non-existent-token")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.confirmWithdrawal("non-existent-token", null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Liên kết rút hồ sơ không hợp lệ hoặc không tồn tại.");

        assertThatThrownBy(() -> service.confirmWithdrawal("", null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Mã token không được để trống.");

        assertThatThrownBy(() -> service.confirmWithdrawal(null, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Mã token không được để trống.");
    }

    @Test
    @DisplayName("3. Token hết hạn hoặc đã sử dụng: ném BadRequestException")
    void testConfirmWithdrawal_expiredOrUsedToken() {
        // Case: token already used
        sampleToken.setUsed(true);
        when(tokenRepository.findByToken("used-token")).thenReturn(Optional.of(sampleToken));

        assertThatThrownBy(() -> service.confirmWithdrawal("used-token", null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Liên kết rút hồ sơ này đã được sử dụng.");

        // Case: token expired
        sampleToken.setUsed(false);
        sampleToken.setExpiryDate(Instant.now().minus(1, ChronoUnit.HOURS));
        when(tokenRepository.findByToken("expired-token")).thenReturn(Optional.of(sampleToken));

        assertThatThrownBy(() -> service.confirmWithdrawal("expired-token", null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Liên kết rút hồ sơ đã hết hạn.");
    }

    @Test
    @DisplayName("4. Người dùng không có quyền rút hồ sơ (khác candidateUserId): ném AccessDeniedException")
    void testConfirmWithdrawalByCandidate_unauthorizedUser() {
        when(applicationRepository.findById(101L)).thenReturn(Optional.of(sampleApp));

        Long maliciousUserId = 9999L; // Different from sampleApp.candidateUserId (303L)
        assertThatThrownBy(() -> service.confirmWithdrawalByCandidate(101L, maliciousUserId, "Lý do"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Bạn không có quyền thao tác trên hồ sơ ứng tuyển này.");

        // Verify status was NOT changed
        assertThat(sampleApp.getStage()).isEqualTo("APPLIED");
        verify(applicationRepository, never()).save(any());
    }

    @Test
    @DisplayName("5. Hồ sơ không tồn tại: ném ResourceNotFoundException")
    void testConfirmWithdrawal_applicationNotFound() {
        when(tokenRepository.findByToken("valid-token")).thenReturn(Optional.of(sampleToken));
        when(applicationRepository.findById(101L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.confirmWithdrawal("valid-token", null))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Hồ sơ ứng tuyển không tồn tại.");
    }

    @Test
    @DisplayName("6. Hồ sơ đã rút trước đó: ném BadRequestException")
    void testConfirmWithdrawal_alreadyWithdrawn() {
        sampleApp.setStage("WITHDRAWN");
        when(tokenRepository.findByToken("valid-token")).thenReturn(Optional.of(sampleToken));
        when(applicationRepository.findById(101L)).thenReturn(Optional.of(sampleApp));

        assertThatThrownBy(() -> service.confirmWithdrawal("valid-token", null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Hồ sơ đã được rút trước đó.");

        // Same for "Ứng viên rút"
        sampleApp.setStage("Ứng viên rút");
        assertThatThrownBy(() -> service.confirmWithdrawal("valid-token", null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Hồ sơ đã được rút trước đó.");
    }

    @Test
    @DisplayName("7. Không xác định được hoặc không có recruiter phụ trách: xử lý êm thuận, ghi log, không gán bừa recruiter")
    void testConfirmWithdrawal_noRecruiterAssigned_gracefulFallback() {
        when(tokenRepository.findByToken("valid-token")).thenReturn(Optional.of(sampleToken));
        when(applicationRepository.findById(101L)).thenReturn(Optional.of(sampleApp));
        when(applicationRepository.save(any(CandidateApplication.class))).thenAnswer(i -> i.getArgument(0));
        when(tokenRepository.save(any(CandidateApplicationWithdrawToken.class))).thenAnswer(i -> i.getArgument(0));
        when(requisitionRepository.findById(202L)).thenReturn(Optional.of(sampleReq));
        // No recruiters assigned
        when(assignmentRepository.findByRequisitionIdAndRole(202L, RoleName.RECRUITER)).thenReturn(Collections.emptyList());

        WithdrawalResultResponse result = service.confirmWithdrawal("valid-token", null);

        assertThat(result.success()).isTrue();
        assertThat(sampleApp.getStage()).isEqualTo("WITHDRAWN");
        // Verify NO notifications were created for a random user
        verify(notificationRepository, never()).save(any());
        verify(mailService, never()).sendCandidateWithdrawnNotification(any(), any(), any(), any());
    }

    @Test
    @DisplayName("8. Trạng thái không thay đổi nếu thao tác thất bại (ví dụ: hồ sơ ở trạng thái HIRED không thể rút)")
    void testConfirmWithdrawal_stageUnchangedWhenNonWithdrawable() {
        sampleApp.setStage("HIRED");
        when(tokenRepository.findByToken("valid-token")).thenReturn(Optional.of(sampleToken));
        when(applicationRepository.findById(101L)).thenReturn(Optional.of(sampleApp));

        assertThatThrownBy(() -> service.confirmWithdrawal("valid-token", null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Hồ sơ đã hoàn tất tuyển dụng, không thể rút hồ sơ vào lúc này.");

        assertThat(sampleApp.getStage()).isEqualTo("HIRED");
        assertThat(sampleToken.isUsed()).isFalse();
        verify(applicationRepository, never()).save(any());
        verify(tokenRepository, never()).save(any());
    }

    @Test
    @DisplayName("9. Không tạo nhiều thông báo khi request được gửi lặp lại (idempotent)")
    void testConfirmWithdrawal_noDuplicateNotifications() {
        when(tokenRepository.findByToken("valid-token")).thenReturn(Optional.of(sampleToken));
        when(applicationRepository.findById(101L)).thenReturn(Optional.of(sampleApp));
        when(applicationRepository.save(any(CandidateApplication.class))).thenAnswer(i -> i.getArgument(0));
        when(tokenRepository.save(any(CandidateApplicationWithdrawToken.class))).thenAnswer(i -> i.getArgument(0));
        when(requisitionRepository.findById(202L)).thenReturn(Optional.of(sampleReq));
        when(assignmentRepository.findByRequisitionIdAndRole(202L, RoleName.RECRUITER)).thenReturn(List.of(sampleAssignment));
        when(userRepository.findById(808L)).thenReturn(Optional.of(sampleRecruiter));
        // Simulate already notified
        when(notificationRepository.existsByUserIdAndRelatedEntityTypeAndRelatedEntityIdAndType(
                808L, "CANDIDATE_APPLICATION", 101L, "CANDIDATE_WITHDRAWAL")).thenReturn(true);

        WithdrawalResultResponse result = service.confirmWithdrawal("valid-token", null);

        assertThat(result.success()).isTrue();
        verify(notificationRepository, never()).save(any());
        verify(mailService, never()).sendCandidateWithdrawnNotification(any(), any(), any(), any());
    }

    @Test
    @DisplayName("GET validation: kiểm tra liên kết email mà KHÔNG thay đổi dữ liệu (AC1)")
    void testValidateWithdrawalToken_safeGetDoesNotMutate() {
        when(tokenRepository.findByToken("valid-token")).thenReturn(Optional.of(sampleToken));
        when(applicationRepository.findById(101L)).thenReturn(Optional.of(sampleApp));
        when(requisitionRepository.findById(202L)).thenReturn(Optional.of(sampleReq));

        WithdrawalValidationResponse res = service.validateWithdrawalToken("valid-token");

        assertThat(res.valid()).isTrue();
        assertThat(res.candidateName()).isEqualTo("Nguyen Van A");
        assertThat(res.positionTitle()).isEqualTo("Ky su Phan mem Senior");
        assertThat(res.alreadyWithdrawn()).isFalse();

        // Ensure no mutation happened
        assertThat(sampleApp.getStage()).isEqualTo("APPLIED");
        assertThat(sampleToken.isUsed()).isFalse();
        verify(applicationRepository, never()).save(any());
        verify(tokenRepository, never()).save(any());
    }

    @Test
    @DisplayName("Xác nhận rút hồ sơ trực tiếp bởi ứng viên đã đăng nhập thành công")
    void testConfirmWithdrawalByCandidate_success() {
        when(applicationRepository.findById(101L)).thenReturn(Optional.of(sampleApp));
        when(applicationRepository.save(any(CandidateApplication.class))).thenAnswer(i -> i.getArgument(0));
        when(tokenRepository.findTopByApplicationIdAndUsedFalseOrderByCreatedAtDesc(101L)).thenReturn(Optional.of(sampleToken));
        when(requisitionRepository.findById(202L)).thenReturn(Optional.of(sampleReq));
        when(assignmentRepository.findByRequisitionIdAndRole(202L, RoleName.RECRUITER)).thenReturn(List.of(sampleAssignment));
        when(userRepository.findById(808L)).thenReturn(Optional.of(sampleRecruiter));

        WithdrawalResultResponse res = service.confirmWithdrawalByCandidate(101L, 303L, "Đổi định hướng");

        assertThat(res.success()).isTrue();
        assertThat(sampleApp.getStage()).isEqualTo("WITHDRAWN");
        assertThat(sampleApp.getWithdrawalReason()).isEqualTo("Đổi định hướng");
        assertThat(sampleToken.isUsed()).isTrue();
    }

    @Test
    @DisplayName("Fallback: Thông báo cho toàn bộ Recruiter đang hoạt động khi yêu cầu tuyển dụng chưa có phân công Recruiter cụ thể")
    void testConfirmWithdrawal_fallbackToActiveRecruitersWhenNoAssignment() {
        when(tokenRepository.findByToken("valid-secret-token-123")).thenReturn(Optional.of(sampleToken));
        when(applicationRepository.findById(101L)).thenReturn(Optional.of(sampleApp));
        when(applicationRepository.save(any(CandidateApplication.class))).thenAnswer(i -> i.getArgument(0));
        when(tokenRepository.save(any(CandidateApplicationWithdrawToken.class))).thenAnswer(i -> i.getArgument(0));
        when(requisitionRepository.findById(202L)).thenReturn(Optional.of(sampleReq));
        // No assignment for this requisition
        when(assignmentRepository.findByRequisitionIdAndRole(202L, RoleName.RECRUITER)).thenReturn(List.of());
        // System has active recruiters
        when(userRepository.findActiveUsersByRoleName(RoleName.RECRUITER)).thenReturn(List.of(sampleRecruiter));
        when(notificationRepository.existsByUserIdAndRelatedEntityTypeAndRelatedEntityIdAndType(
                808L, "CANDIDATE_APPLICATION", 101L, "CANDIDATE_WITHDRAWAL")).thenReturn(false);

        WithdrawalResultResponse result = service.confirmWithdrawal("valid-secret-token-123", "Lý do cá nhân");

        assertThat(result.success()).isTrue();
        assertThat(sampleApp.getStage()).isEqualTo("WITHDRAWN");

        ArgumentCaptor<Notification> notifCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(notifCaptor.capture());
        Notification savedNotif = notifCaptor.getValue();
        assertThat(savedNotif.getUserId()).isEqualTo(808L);
        assertThat(savedNotif.getType()).isEqualTo("CANDIDATE_WITHDRAWAL");
        assertThat(savedNotif.getTitle()).isEqualTo("Ứng viên đã rút hồ sơ");

        verify(mailService).sendCandidateWithdrawnNotification("recruiter@company.com", "Nguyen Van A", "Ky su Phan mem Senior", 101L);
    }
}
