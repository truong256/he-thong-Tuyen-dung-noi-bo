package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.WithdrawalResultResponse;
import com.example.auth_service.dto.WithdrawalValidationResponse;
import com.example.auth_service.entity.*;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class CandidateApplicationWithdrawalService {

    private static final Logger logger = LoggerFactory.getLogger(CandidateApplicationWithdrawalService.class);

    public static final String STAGE_WITHDRAWN = "WITHDRAWN";
    public static final String STAGE_WITHDRAWN_VI = "Ứng viên rút";

    private final CandidateApplicationRepository applicationRepository;
    private final CandidateApplicationWithdrawTokenRepository tokenRepository;
    private final RecruitmentRequisitionRepository requisitionRepository;
    private final RequisitionAssignmentRepository assignmentRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final MailService mailService;

    private final SecureRandom secureRandom = new SecureRandom();

    public CandidateApplicationWithdrawalService(
            CandidateApplicationRepository applicationRepository,
            CandidateApplicationWithdrawTokenRepository tokenRepository,
            RecruitmentRequisitionRepository requisitionRepository,
            RequisitionAssignmentRepository assignmentRepository,
            UserRepository userRepository,
            NotificationRepository notificationRepository,
            MailService mailService
    ) {
        this.applicationRepository = applicationRepository;
        this.tokenRepository = tokenRepository;
        this.requisitionRepository = requisitionRepository;
        this.assignmentRepository = assignmentRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.mailService = mailService;
    }

    public static boolean isWithdrawnStage(String stage) {
        if (stage == null) return false;
        String s = stage.trim();
        return STAGE_WITHDRAWN.equalsIgnoreCase(s) || STAGE_WITHDRAWN_VI.equalsIgnoreCase(s);
    }

    @Transactional(readOnly = true)
    public WithdrawalValidationResponse validateWithdrawalToken(String token) {
        if (token == null || token.isBlank()) {
            throw new BadRequestException("Mã token không được để trống.");
        }

        CandidateApplicationWithdrawToken tokenEntity = tokenRepository.findByToken(token.trim())
                .orElseThrow(() -> new BadRequestException("Liên kết rút hồ sơ không hợp lệ hoặc không tồn tại."));

        if (tokenEntity.isUsed()) {
            throw new BadRequestException("Liên kết rút hồ sơ này đã được sử dụng.");
        }

        if (tokenEntity.isExpired()) {
            throw new BadRequestException("Liên kết rút hồ sơ đã hết hạn.");
        }

        CandidateApplication app = applicationRepository.findById(tokenEntity.getApplicationId())
                .orElseThrow(() -> new ResourceNotFoundException("Hồ sơ ứng tuyển không tồn tại."));

        boolean alreadyWithdrawn = isWithdrawnStage(app.getStage());

        String positionTitle = "Vị trí tuyển dụng";
        String requisitionCode = "";
        Optional<RecruitmentRequisition> reqOpt = requisitionRepository.findById(app.getRequisitionId());
        if (reqOpt.isPresent()) {
            RecruitmentRequisition req = reqOpt.get();
            positionTitle = req.getTitle();
            requisitionCode = req.getRequisitionCode();
        }

        return new WithdrawalValidationResponse(
                true,
                app.getId(),
                app.getFullName(),
                positionTitle,
                requisitionCode,
                "",
                alreadyWithdrawn,
                app.getStage(),
                alreadyWithdrawn ? "Hồ sơ này đã được rút trước đó." : "Liên kết hợp lệ."
        );
    }

    public WithdrawalResultResponse confirmWithdrawal(String token, String reason) {
        if (token == null || token.isBlank()) {
            throw new BadRequestException("Mã token không được để trống.");
        }

        CandidateApplicationWithdrawToken tokenEntity = tokenRepository.findByToken(token.trim())
                .orElseThrow(() -> new BadRequestException("Liên kết rút hồ sơ không hợp lệ hoặc không tồn tại."));

        if (tokenEntity.isUsed()) {
            throw new BadRequestException("Liên kết rút hồ sơ này đã được sử dụng.");
        }

        if (tokenEntity.isExpired()) {
            throw new BadRequestException("Liên kết rút hồ sơ đã hết hạn.");
        }

        CandidateApplication app = applicationRepository.findById(tokenEntity.getApplicationId())
                .orElseThrow(() -> new ResourceNotFoundException("Hồ sơ ứng tuyển không tồn tại."));

        if (isWithdrawnStage(app.getStage())) {
            throw new BadRequestException("Hồ sơ đã được rút trước đó.");
        }

        if ("HIRED".equalsIgnoreCase(app.getStage())) {
            throw new BadRequestException("Hồ sơ đã hoàn tất tuyển dụng, không thể rút hồ sơ vào lúc này.");
        }

        // 1. Update candidate application state
        app.setStage(STAGE_WITHDRAWN);
        Instant now = Instant.now();
        app.setWithdrawnAt(now);
        app.setWithdrawalReason(reason != null && !reason.isBlank() ? reason.trim() : null);
        CandidateApplication savedApp = applicationRepository.save(app);

        // 2. Mark token as used
        tokenEntity.setUsed(true);
        tokenEntity.setUsedAt(now);
        tokenRepository.save(tokenEntity);

        // 3. Process recruiter notification (AC3)
        notifyRecruiter(savedApp);

        return new WithdrawalResultResponse(
                true,
                "Rút hồ sơ ứng tuyển thành công. Bạn đã chính thức dừng quá trình tuyển dụng cho vị trí này.",
                savedApp.getId(),
                STAGE_WITHDRAWN,
                now
        );
    }

    public WithdrawalResultResponse confirmWithdrawalByCandidate(Long applicationId, Long currentUserId, String reason) {
        if (applicationId == null) {
            throw new BadRequestException("applicationId không được để trống.");
        }
        CandidateApplication app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Hồ sơ ứng tuyển không tồn tại."));

        if (currentUserId == null || !currentUserId.equals(app.getCandidateUserId())) {
            throw new AccessDeniedException("Bạn không có quyền thao tác trên hồ sơ ứng tuyển này.");
        }

        if (isWithdrawnStage(app.getStage())) {
            throw new BadRequestException("Hồ sơ đã được rút trước đó.");
        }

        if ("HIRED".equalsIgnoreCase(app.getStage())) {
            throw new BadRequestException("Hồ sơ đã hoàn tất tuyển dụng, không thể rút hồ sơ vào lúc này.");
        }

        app.setStage(STAGE_WITHDRAWN);
        Instant now = Instant.now();
        app.setWithdrawnAt(now);
        app.setWithdrawalReason(reason != null && !reason.isBlank() ? reason.trim() : null);
        CandidateApplication savedApp = applicationRepository.save(app);

        // Mark any pending tokens for this application as used
        tokenRepository.findTopByApplicationIdAndUsedFalseOrderByCreatedAtDesc(app.getId())
                .ifPresent(tok -> {
                    tok.setUsed(true);
                    tok.setUsedAt(now);
                    tokenRepository.save(tok);
                });

        notifyRecruiter(savedApp);

        return new WithdrawalResultResponse(
                true,
                "Rút hồ sơ ứng tuyển thành công. Bạn đã chính thức dừng quá trình tuyển dụng cho vị trí này.",
                savedApp.getId(),
                STAGE_WITHDRAWN,
                now
        );
    }

    public CandidateApplicationWithdrawToken createWithdrawalToken(Long applicationId) {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        CandidateApplicationWithdrawToken tokenEntity = new CandidateApplicationWithdrawToken();
        tokenEntity.setApplicationId(applicationId);
        tokenEntity.setToken(rawToken);
        tokenEntity.setExpiryDate(Instant.now().plus(7, ChronoUnit.DAYS));
        tokenEntity.setUsed(false);
        tokenEntity.setCreatedAt(Instant.now());
        return tokenRepository.save(tokenEntity);
    }

    public void sendApplicationConfirmationWithWithdrawLink(CandidateApplication app) {
        if (app == null || app.getId() == null) return;
        CandidateApplicationWithdrawToken token = createWithdrawalToken(app.getId());

        String jobTitle = "Vị trí tuyển dụng";
        Optional<RecruitmentRequisition> reqOpt = requisitionRepository.findById(app.getRequisitionId());
        if (reqOpt.isPresent()) {
            jobTitle = reqOpt.get().getTitle();
        }

        mailService.sendApplicationConfirmationEmail(app.getEmail(), app.getFullName(), jobTitle, token.getToken());
    }

    private void notifyRecruiter(CandidateApplication app) {
        Long requisitionId = app.getRequisitionId();
        String positionTitle = "Vị trí tuyển dụng";
        String requisitionCode = "";
        Optional<RecruitmentRequisition> reqOpt = requisitionRepository.findById(requisitionId);
        if (reqOpt.isPresent()) {
            RecruitmentRequisition req = reqOpt.get();
            positionTitle = req.getTitle();
            requisitionCode = req.getRequisitionCode();
        }

        // AC3: Identify assigned recruiter
        List<RequisitionAssignment> recruiterAssignments =
                assignmentRepository.findByRequisitionIdAndRole(requisitionId, RoleName.RECRUITER);

        if (recruiterAssignments.isEmpty()) {
            logger.warn("Không xác định được recruiter phụ trách cho yêu cầu tuyển dụng ID: {} khi ứng viên rút hồ sơ ID: {}. Không gửi thông báo tùy tiện.",
                    requisitionId, app.getId());
            return;
        }

        // Prioritize primary recruiter if defined; otherwise take the assigned recruiter
        RequisitionAssignment targetAssignment = recruiterAssignments.stream()
                .filter(RequisitionAssignment::isPrimary)
                .findFirst()
                .orElse(recruiterAssignments.get(0));

        Long recruiterUserId = targetAssignment.getUserId();
        Optional<User> recruiterUserOpt = userRepository.findById(recruiterUserId);
        if (recruiterUserOpt.isEmpty()) {
            logger.warn("Không tìm thấy thông tin tài khoản recruiter ID: {} được phân công cho yêu cầu ID: {}.",
                    recruiterUserId, requisitionId);
            return;
        }

        User recruiter = recruiterUserOpt.get();

        // Prevent duplicate notification
        boolean alreadyNotified = notificationRepository.existsByUserIdAndRelatedEntityTypeAndRelatedEntityIdAndType(
                recruiterUserId, "CANDIDATE_APPLICATION", app.getId(), "CANDIDATE_WITHDRAWAL");

        if (!alreadyNotified) {
            String notifTitle = "Ứng viên đã rút hồ sơ";
            String notifContent = String.format("Ứng viên %s (%s) đã rút hồ sơ ứng tuyển vị trí %s (Mã: %s).",
                    app.getFullName(), app.getEmail(), positionTitle, requisitionCode);

            Notification notif = new Notification();
            notif.setUserId(recruiterUserId);
            notif.setTitle(notifTitle);
            notif.setContent(notifContent);
            notif.setType("CANDIDATE_WITHDRAWAL");
            notif.setRelatedEntityId(app.getId());
            notif.setRelatedEntityType("CANDIDATE_APPLICATION");
            notif.setRead(false);
            notif.setCreatedAt(Instant.now());
            notificationRepository.save(notif);

            try {
                mailService.sendCandidateWithdrawnNotification(
                        recruiter.getEmail(),
                        app.getFullName(),
                        positionTitle,
                        app.getId()
                );
            } catch (Exception e) {
                logger.error("Lỗi khi gửi email thông báo rút hồ sơ tới recruiter {}: {}", recruiter.getEmail(), e.getMessage());
            }
        }
    }
}
