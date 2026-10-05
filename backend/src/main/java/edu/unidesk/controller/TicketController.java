package edu.unidesk.controller;

import edu.unidesk.dto.ticket.*;
import edu.unidesk.model.TicketAttachment;
import edu.unidesk.model.TicketStatusHistory;
import edu.unidesk.model.User;
import edu.unidesk.service.FileStorageService;
import edu.unidesk.service.TicketService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.MalformedURLException;
import java.util.List;
import java.util.Map;

/**
 * Ticket Submission & Tracking — student-facing ticket endpoints.
 */
@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;
    private final FileStorageService fileStorageService;

    /** Students submit tickets. */
    @PostMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<TicketResponse> create(
            @Valid @RequestBody CreateTicketRequest request,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ticketService.createTicket(request, user, getIp(httpRequest)));
    }

    /** Save a ticket as draft. */
    @PostMapping("/draft")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<TicketResponse> saveDraft(
            @Valid @RequestBody CreateTicketRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ticketService.saveDraft(request, user));
    }

    /** Submit a previously saved draft. */
    @PutMapping("/{id}/submit-draft")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<TicketResponse> submitDraft(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(ticketService.submitDraft(id, user, getIp(httpRequest)));
    }

    /** Student deletes their own draft ticket (and any attachments already uploaded to it). */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, String>> deleteDraft(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        List<TicketAttachment> attachments = ticketService.getAttachments(id, user);
        attachments.forEach(fileStorageService::deleteFile);
        ticketService.deleteDraft(id, user, getIp(httpRequest));
        return ResponseEntity.ok(Map.of("message", "Draft ticket deleted."));
    }

    /** Student withdraws a submitted ticket that is still active. */
    @PutMapping("/{id}/withdraw")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<TicketResponse> withdraw(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(ticketService.withdrawTicket(id, reason, user, getIp(httpRequest)));
    }

    /** Student submits feedback/rating on a resolved ticket. */
    @PostMapping("/{id}/feedback")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<TicketResponse> submitFeedback(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User user) {
        int rating = Integer.parseInt(body.get("rating").toString());
        String comment = body.get("comment") != null ? body.get("comment").toString() : null;
        return ResponseEntity.ok(ticketService.submitFeedback(id, rating, comment, user));
    }

    /** Students view their own tickets (with optional status filter). */
    @GetMapping("/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Page<TicketResponse>> getMyTickets(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        var statusEnum = status != null
                ? edu.unidesk.model.enums.TicketStatus.valueOf(status.toUpperCase()) : null;
        return ResponseEntity.ok(ticketService.getMyTicketsWithStatus(user.getId(), statusEnum,
                PageRequest.of(page, size, Sort.by("createdAt").descending())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT','HELP_DESK_OFFICER','DEPARTMENT_STAFF','ADMIN')")
    public ResponseEntity<TicketResponse> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ticketService.getTicketById(id, user));
    }

    /** Student requests reopen of a resolved/closed ticket. */
    @PostMapping("/{id}/request-reopen")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<TicketResponse> requestReopen(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal User user) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(ticketService.requestReopen(id, reason, user));
    }

    @GetMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('STUDENT','HELP_DESK_OFFICER','DEPARTMENT_STAFF','ADMIN')")
    public ResponseEntity<List<CommentResponse>> getComments(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ticketService.getComments(id, user));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('STUDENT','HELP_DESK_OFFICER','DEPARTMENT_STAFF','ADMIN')")
    public ResponseEntity<List<TicketStatusHistory>> getHistory(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ticketService.getStatusHistory(id, user));
    }

    @GetMapping("/{id}/attachments")
    @PreAuthorize("hasAnyRole('STUDENT','HELP_DESK_OFFICER','DEPARTMENT_STAFF','ADMIN')")
    public ResponseEntity<List<edu.unidesk.dto.ticket.AttachmentResponse>> getAttachments(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ticketService.getAttachments(id, user).stream()
                .map(edu.unidesk.dto.ticket.AttachmentResponse::from).toList());
    }

    @PostMapping("/{id}/attachments")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<edu.unidesk.dto.ticket.AttachmentResponse> uploadAttachment(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user) {
        ticketService.getTicketById(id, user); // enforces ownership before accepting the file
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(edu.unidesk.dto.ticket.AttachmentResponse.from(fileStorageService.storeFile(id, file, user)));
    }

    @GetMapping("/{id}/attachments/{fileId}")
    @PreAuthorize("hasAnyRole('STUDENT','HELP_DESK_OFFICER','DEPARTMENT_STAFF','ADMIN')")
    public ResponseEntity<Resource> downloadAttachment(
            @PathVariable Long id,
            @PathVariable Long fileId,
            @AuthenticationPrincipal User user) throws MalformedURLException {
        List<TicketAttachment> attachments = ticketService.getAttachments(id, user);
        TicketAttachment att = attachments.stream().filter(a -> a.getId().equals(fileId))
                .findFirst().orElseThrow(() ->
                        new edu.unidesk.exception.ResourceNotFoundException("Attachment not found."));

        java.nio.file.Path filePath = fileStorageService.loadFile(att.getStoredName());
        Resource resource = new UrlResource(filePath.toUri());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(att.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + att.getOriginalName() + "\"")
                .body(resource);
    }

    /** Delete an attachment. */
    @DeleteMapping("/{id}/attachments/{fileId}")
    @PreAuthorize("hasAnyRole('STUDENT','HELP_DESK_OFFICER','ADMIN')")
    public ResponseEntity<Map<String, String>> deleteAttachment(
            @PathVariable Long id,
            @PathVariable Long fileId,
            @AuthenticationPrincipal User user) {
        List<TicketAttachment> attachments = ticketService.getAttachments(id, user);
        TicketAttachment att = attachments.stream().filter(a -> a.getId().equals(fileId))
                .findFirst().orElseThrow(() ->
                        new edu.unidesk.exception.ResourceNotFoundException("Attachment not found."));
        fileStorageService.deleteFile(att);
        return ResponseEntity.ok(Map.of("message", "Attachment deleted."));
    }

    private String getIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return forwarded != null ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }
}
