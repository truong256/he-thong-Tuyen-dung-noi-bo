package com.example.auth_service.controller;

import com.example.auth_service.dto.*;
import com.example.auth_service.service.CandidateUnifiedProfileService;
import jakarta.validation.Valid;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/candidates/{id}")
public class CandidateUnifiedProfileController {

    private final CandidateUnifiedProfileService service;

    public CandidateUnifiedProfileController(CandidateUnifiedProfileService service) {
        this.service = service;
    }

    /**
     * S4-09: Lấy hồ sơ ứng viên hợp nhất, lịch sử ứng tuyển và quyền thao tác.
     */
    @GetMapping("/profile")
    public ResponseEntity<CandidateUnifiedProfileDto> getUnifiedProfile(@PathVariable Long id) {
        return ResponseEntity.ok(service.getUnifiedProfile(id));
    }

    /**
     * S4-09: Xem trước hoặc tải tệp CV với kiểm tra quyền truy cập server.
     */
    @GetMapping("/cv")
    public ResponseEntity<Resource> getCv(@PathVariable Long id) {
        var cvContent = service.getCvContent(id);
        ByteArrayResource resource = new ByteArrayResource(cvContent.bytes());

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(cvContent.contentType());
        } catch (Exception e) {
            mediaType = MediaType.APPLICATION_PDF;
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + cvContent.fileName() + "\"")
                .header("X-Content-Type-Options", "nosniff")
                .body(resource);
    }

    /**
     * S4-09: Tải lên hoặc cập nhật tệp CV (yêu cầu quyền PIPELINE_MANAGE).
     */
    @PostMapping(value = "/cv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CandidateUnifiedProfileDto> uploadCv(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.ok(service.uploadCv(id, file));
    }

    /**
     * S4-09: Thêm ghi chú mới cho hồ sơ ứng viên.
     */
    @PostMapping("/notes")
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<CandidateNoteDto> addNote(
            @PathVariable Long id,
            @Valid @RequestBody CreateCandidateNoteRequest req
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.addNote(id, req));
    }

    /**
     * S4-09: Sửa ghi chú hồ sơ ứng viên.
     */
    @PutMapping("/notes/{noteId}")
    public ResponseEntity<CandidateNoteDto> updateNote(
            @PathVariable Long id,
            @PathVariable Long noteId,
            @Valid @RequestBody CreateCandidateNoteRequest req
    ) {
        return ResponseEntity.ok(service.updateNote(id, noteId, req));
    }

    /**
     * S4-09: Xóa ghi chú hồ sơ ứng viên.
     */
    @DeleteMapping("/notes/{noteId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> deleteNote(
            @PathVariable Long id,
            @PathVariable Long noteId
    ) {
        service.deleteNote(id, noteId);
        return ResponseEntity.noContent().build();
    }

    /**
     * S4-09: Thêm nhãn cho hồ sơ ứng viên.
     */
    @PostMapping("/tags")
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<CandidateTagDto> addTag(
            @PathVariable Long id,
            @Valid @RequestBody CreateCandidateTagRequest req
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.addTag(id, req));
    }

    /**
     * S4-09: Xóa nhãn khỏi hồ sơ ứng viên.
     */
    @DeleteMapping("/tags/{tagId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> deleteTag(
            @PathVariable Long id,
            @PathVariable Long tagId
    ) {
        service.deleteTag(id, tagId);
        return ResponseEntity.noContent().build();
    }
}
