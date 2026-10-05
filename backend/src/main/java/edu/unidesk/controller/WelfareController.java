package edu.unidesk.controller;

import edu.unidesk.exception.BadRequestException;
import edu.unidesk.dto.welfare.*;
import edu.unidesk.model.User;
import edu.unidesk.model.WelfareAttachment;
import edu.unidesk.model.WelfareStatusHistory;
import edu.unidesk.model.enums.WelfareStatus;
import edu.unidesk.service.FileStorageService;
import edu.unidesk.service.WelfareService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.MalformedURLException;
import java.util.List;
import java.util.Map;

/**
 * WelfareController — all endpoints under /api/welfare.
 *
 * Access is DENIED to everyone except the case's own student and
 * WELFARE_OFFICER at the @PreAuthorize level — including ADMIN, which has
 * no special override here. Welfare case content (description, comments,
 * contact details) is confidential and stays inside that trust boundary
 * regardless of administrative privilege elsewhere in the system. This is
 * the third layer of the three-layer welfare isolation (DB table → service
 * → controller).
 */
@RestController
@RequestMapping("/api/welfare")
@RequiredArgsConstructor
public class WelfareController {

    private final WelfareService welfareService;
    private final FileStorageService fileStorageService;

    @PostMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<WelfareCaseResponse> create(
            @Valid @RequestBody CreateWelfareCaseRequest request,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(welfareService.createCase(request, user, getIp(httpRequest)));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Page<WelfareCaseResponse>> getMyCases(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(welfareService.getMyCases(user.getId(),
                PageRequest.of(page, size, Sort.by("createdAt").descending())));
    }

    @GetMapping
    @PreAuthorize("hasRole('WELFARE_OFFICER')")
    public ResponseEntity<Page<WelfareCaseResponse>> getAll(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Boolean isUrgent,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        WelfareStatus statusEnum = status != null ? WelfareStatus.valueOf(status.toUpperCase()) : null;
        return ResponseEntity.ok(welfareService.getAllCases(statusEnum, isUrgent,
                PageRequest.of(page, size, Sort.by("createdAt").descending())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT','WELFARE_OFFICER')")
    public ResponseEntity<WelfareCaseResponse> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(welfareService.getCaseById(id, user));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('WELFARE_OFFICER')")
    public ResponseEntity<WelfareCaseResponse> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(welfareService.updateStatus(id,
                body.get("status"), body.get("note"), user, getIp(httpRequest)));
    }

    /** Archive/close a welfare case — logical delete-equivalent, never a hard-delete. */
    @PutMapping("/{id}/archive")
    @PreAuthorize("hasRole('WELFARE_OFFICER')")
    public ResponseEntity<WelfareCaseResponse> archive(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        String note = body != null ? body.get("note") : null;
        return ResponseEntity.ok(welfareService.archiveCase(id, note, user, getIp(httpRequest)));
    }

    @PutMapping("/{id}/urgent")
    @PreAuthorize("hasRole('WELFARE_OFFICER')")
    public ResponseEntity<WelfareCaseResponse> setUrgent(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        if (body == null || body.get("urgent") == null) {
            throw new BadRequestException("Request must include \"urgent\": true or false.");
        }
        return ResponseEntity.ok(welfareService.setUrgent(id,
                Boolean.TRUE.equals(body.get("urgent")), user, getIp(httpRequest)));
    }

    @PutMapping("/{id}/assign")
    @PreAuthorize("hasRole('WELFARE_OFFICER')")
    public ResponseEntity<WelfareCaseResponse> assign(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        Long officerId = Long.parseLong(body.get("officerId").toString());
        return ResponseEntity.ok(welfareService.assignCase(id, officerId, user, getIp(httpRequest)));
    }

    @PostMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('STUDENT','WELFARE_OFFICER')")
    public ResponseEntity<WelfareCommentResponse> addComment(
            @PathVariable Long id,
            @Valid @RequestBody AddWelfareCommentRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(welfareService.addComment(id, request, user));
    }

    /** Welfare officer deletes their own internal note. */
    @DeleteMapping("/{id}/comments/{commentId}")
    @PreAuthorize("hasRole('WELFARE_OFFICER')")
    public ResponseEntity<Map<String, String>> deleteComment(
            @PathVariable Long id,
            @PathVariable Long commentId,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        welfareService.deleteComment(id, commentId, user, getIp(httpRequest));
        return ResponseEntity.ok(Map.of("message", "Internal note deleted."));
    }

    @GetMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('STUDENT','WELFARE_OFFICER')")
    public ResponseEntity<List<WelfareCommentResponse>> getComments(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(welfareService.getComments(id, user));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('STUDENT','WELFARE_OFFICER')")
    public ResponseEntity<List<WelfareStatusHistory>> getHistory(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(welfareService.getStatusHistory(id, user));
    }

    @GetMapping("/{id}/attachments")
    @PreAuthorize("hasAnyRole('STUDENT','WELFARE_OFFICER')")
    public ResponseEntity<List<edu.unidesk.dto.welfare.WelfareAttachmentResponse>> getAttachments(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(welfareService.getAttachments(id, user).stream()
                .map(edu.unidesk.dto.welfare.WelfareAttachmentResponse::from).toList());
    }

    @PostMapping("/{id}/attachments")
    @PreAuthorize("hasAnyRole('STUDENT','WELFARE_OFFICER')")
    public ResponseEntity<edu.unidesk.dto.welfare.WelfareAttachmentResponse> uploadAttachment(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user) {
        welfareService.getCaseById(id, user); // enforces ownership before accepting the file
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(edu.unidesk.dto.welfare.WelfareAttachmentResponse.from(fileStorageService.storeWelfareFile(id, file, user)));
    }

    @GetMapping("/{id}/attachments/{fileId}")
    @PreAuthorize("hasAnyRole('STUDENT','WELFARE_OFFICER')")
    public ResponseEntity<Resource> downloadAttachment(
            @PathVariable Long id,
            @PathVariable Long fileId,
            @AuthenticationPrincipal User user) throws MalformedURLException {
        List<WelfareAttachment> attachments = welfareService.getAttachments(id, user);
        WelfareAttachment att = attachments.stream().filter(a -> a.getId().equals(fileId))
                .findFirst().orElseThrow(() ->
                        new edu.unidesk.exception.ResourceNotFoundException("Attachment not found."));

        java.nio.file.Path filePath = fileStorageService.loadFile(att.getStoredName());
        Resource resource = new UrlResource(filePath.toUri());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(att.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + att.getFileName() + "\"")
                .body(resource);
    }

    /** Delete a welfare attachment. */
    @DeleteMapping("/{id}/attachments/{fileId}")
    @PreAuthorize("hasAnyRole('STUDENT','WELFARE_OFFICER')")
    public ResponseEntity<Map<String, String>> deleteAttachment(
            @PathVariable Long id,
            @PathVariable Long fileId,
            @AuthenticationPrincipal User user) {
        List<WelfareAttachment> attachments = welfareService.getAttachments(id, user);
        WelfareAttachment att = attachments.stream().filter(a -> a.getId().equals(fileId))
                .findFirst().orElseThrow(() ->
                        new edu.unidesk.exception.ResourceNotFoundException("Attachment not found."));
        fileStorageService.deleteWelfareFile(att);
        return ResponseEntity.ok(Map.of("message", "Attachment deleted."));
    }

    private String getIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return forwarded != null ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }
}
