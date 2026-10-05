package com.example.auth_service.controller;

import com.example.auth_service.dto.CompetencyCriterionResponse;
import com.example.auth_service.dto.CreateInterviewQuestionRequest;
import com.example.auth_service.dto.InterviewQuestionResponse;
import com.example.auth_service.dto.UpdateInterviewQuestionRequest;
import com.example.auth_service.service.InterviewQuestionService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/interview-questions", "/api/questions"})
public class InterviewQuestionController {

    private final InterviewQuestionService interviewQuestionService;

    public InterviewQuestionController(InterviewQuestionService interviewQuestionService) {
        this.interviewQuestionService = interviewQuestionService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('CATALOG_READ')")
    public ResponseEntity<Page<InterviewQuestionResponse>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String difficultyLevel,
            @RequestParam(required = false) Long jobTitleId,
            @RequestParam(required = false) Long criterionId,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.clamp(size, 1, 100),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        return ResponseEntity.ok(
                interviewQuestionService.search(
                        search,
                        difficultyLevel,
                        jobTitleId,
                        criterionId,
                        active,
                        pageable
                )
        );
    }

    @GetMapping("/criteria")
    @PreAuthorize("hasAuthority('CATALOG_READ')")
    public ResponseEntity<List<CompetencyCriterionResponse>> getCriteria() {
        return ResponseEntity.ok(interviewQuestionService.getCriteria());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('CATALOG_READ')")
    public ResponseEntity<InterviewQuestionResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(interviewQuestionService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('CATALOG_MANAGE')")
    public ResponseEntity<InterviewQuestionResponse> create(
            @Valid @RequestBody CreateInterviewQuestionRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(interviewQuestionService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('CATALOG_MANAGE')")
    public ResponseEntity<InterviewQuestionResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateInterviewQuestionRequest request
    ) {
        return ResponseEntity.ok(interviewQuestionService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('CATALOG_MANAGE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        interviewQuestionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
