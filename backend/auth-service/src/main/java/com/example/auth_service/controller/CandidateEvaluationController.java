package com.example.auth_service.controller;

import com.example.auth_service.entity.*;
import com.example.auth_service.exception.*;
import com.example.auth_service.repository.*;
import com.example.auth_service.security.CandidateScope;
import com.example.auth_service.security.UserPrincipal;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/evaluations")
@org.springframework.context.annotation.Profile("sprint6-preview")
public class CandidateEvaluationController {

    private final CandidateApplicationRepository applications;
    private final CandidateEvaluationRepository evaluations;

    public record EvaluationRequest(
            @NotNull(message = "candidateId không được để trống") Long candidateId,
            Integer score,
            String feedback
    ) {}

    public record EvaluationResponse(
            Long id,
            Long candidateId,
            Long submittedByUserId,
            Integer score,
            String feedback,
            Instant submittedAt
    ) {
        public static EvaluationResponse from(CandidateEvaluation entity) {
            return new EvaluationResponse(
                    entity.getId(),
                    entity.getCandidateId(),
                    entity.getInterviewerUserId(),
                    entity.getScore(),
                    entity.getFeedback(),
                    entity.getSubmittedAt()
            );
        }
    }

    public CandidateEvaluationController(CandidateApplicationRepository applications,
                                         CandidateEvaluationRepository evaluations) {
        this.applications = applications;
        this.evaluations = evaluations;
    }

    @PostMapping
    @Transactional
    @PreAuthorize("hasAuthority('EVALUATION_SUBMIT')")
    public ResponseEntity<EvaluationResponse> submitEvaluation(@RequestBody EvaluationRequest req) {
        if (req == null || req.candidateId() == null) {
            throw new BadRequestException("candidateId không được để trống.");
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
            throw new AccessDeniedException("Vui lòng đăng nhập.");
        }

        CandidateApplication app = applications.findById(req.candidateId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ ứng viên."));

        boolean isHr = auth.getAuthorities().stream().anyMatch(a -> "ROLE_HR_MANAGER".equals(a.getAuthority()));
        if (!isHr) {
            // Must be the assigned interviewer
            if (app.getInterviewerUserId() == null || !app.getInterviewerUserId().equals(principal.getId())) {
                throw new AccessDeniedException("Bạn không được phân công phỏng vấn hoặc đánh giá ứng viên này.");
            }
        }

        // Real database persistence
        CandidateEvaluation eval = new CandidateEvaluation();
        eval.setCandidateId(app.getId());
        eval.setInterviewerUserId(principal.getId());
        eval.setScore(req.score() != null ? req.score() : 5);
        eval.setFeedback(req.feedback() != null ? req.feedback().trim() : "");
        eval.setSubmittedAt(Instant.now());

        CandidateEvaluation saved = evaluations.save(eval);

        // Update candidate stage in real database
        app.setStage("EVALUATED");
        applications.save(app);

        return ResponseEntity.status(HttpStatus.CREATED).body(EvaluationResponse.from(saved));
    }

    @GetMapping("/{candidateId}")
    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('EVALUATION_READ')")
    public ResponseEntity<EvaluationResponse> getEvaluation(@PathVariable Long candidateId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        var scope = CandidateScope.visibleTo(auth);

        // Check if candidate is visible to current user under RBAC scope
        CandidateApplication app = applications.findOne(scope.and((root, query, cb) -> cb.equal(root.get("id"), candidateId)))
                .orElseThrow(() -> new AccessDeniedException("Bạn không có quyền xem phiếu đánh giá của vị trí hoặc ứng viên này."));

        // Query real database
        CandidateEvaluation eval = evaluations.findTopByCandidateIdOrderBySubmittedAtDesc(candidateId)
                .orElseGet(() -> {
                    // Fallback stub representation if not yet evaluated
                    CandidateEvaluation defaultEval = new CandidateEvaluation();
                    defaultEval.setId(0L);
                    defaultEval.setCandidateId(candidateId);
                    defaultEval.setInterviewerUserId(app.getInterviewerUserId() != null ? app.getInterviewerUserId() : 0L);
                    defaultEval.setScore(5);
                    defaultEval.setFeedback("Hồ sơ ứng viên " + app.getFullName());
                    defaultEval.setSubmittedAt(Instant.now());
                    return defaultEval;
                });

        return ResponseEntity.ok(EvaluationResponse.from(eval));
    }
}
