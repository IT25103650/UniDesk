package edu.unidesk.controller;

import edu.unidesk.dto.ticket.AddCommentRequest;
import edu.unidesk.dto.ticket.CommentResponse;
import edu.unidesk.dto.ticket.CreateReplyTemplateRequest;
import edu.unidesk.dto.ticket.ReplyTemplateResponse;
import edu.unidesk.dto.ticket.TicketResponse;
import edu.unidesk.model.User;
import edu.unidesk.service.TicketDepartmentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Department Response & Overdue Tracking — Department Staff endpoints.
 * (Automated overdue-flagging/escalation is a scheduled job — see OverdueTicketScheduler.)
 */
@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketDepartmentController {

    private final TicketDepartmentService departmentService;

    /** Department staff view tickets assigned to their department (with optional status filter). */
    @GetMapping("/department")
    @PreAuthorize("hasRole('DEPARTMENT_STAFF')")
    public ResponseEntity<Page<TicketResponse>> getDepartmentTickets(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long deptId = user.getDepartment() != null ? user.getDepartment().getId() : -1L;
        var statusEnum = status != null
                ? edu.unidesk.model.enums.TicketStatus.valueOf(status.toUpperCase()) : null;

        return ResponseEntity.ok(departmentService.getDeptTicketsAdvanced(deptId, statusEnum, categoryId,
                dateFrom, dateTo, search, PageRequest.of(page, size, Sort.by("createdAt").descending())));
    }

    /** Department staff — Resolved/Closed archive for their own department only. */
    @GetMapping("/department/archive")
    @PreAuthorize("hasRole('DEPARTMENT_STAFF')")
    public ResponseEntity<Page<TicketResponse>> getDepartmentArchive(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long deptId = user.getDepartment() != null ? user.getDepartment().getId() : -1L;
        return ResponseEntity.ok(departmentService.getDeptArchive(deptId, search,
                PageRequest.of(page, size, Sort.by("resolvedAt").descending())));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('HELP_DESK_OFFICER','ADMIN','DEPARTMENT_STAFF')")
    public ResponseEntity<TicketResponse> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(departmentService.updateStatus(id,
                body.get("status"), body.get("note"), user, getIp(httpRequest)));
    }

    /** Close/archive a resolved ticket — the logical delete-equivalent for finished tickets. */
    @PutMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('DEPARTMENT_STAFF','HELP_DESK_OFFICER','ADMIN')")
    public ResponseEntity<TicketResponse> closeResolved(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        String note = body != null ? body.get("note") : null;
        return ResponseEntity.ok(departmentService.closeResolvedTicket(id, note, user, getIp(httpRequest)));
    }

    /** Department staff records a structured Resolution Note on a resolved/closed ticket. */
    @PostMapping("/{id}/resolution-note")
    @PreAuthorize("hasAnyRole('DEPARTMENT_STAFF','HELP_DESK_OFFICER','ADMIN')")
    public ResponseEntity<TicketResponse> addResolutionNote(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(departmentService.addResolutionNote(id, body.get("note"), user, getIp(httpRequest)));
    }

    @PostMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('STUDENT','HELP_DESK_OFFICER','DEPARTMENT_STAFF','ADMIN')")
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable Long id,
            @Valid @RequestBody AddCommentRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(departmentService.addComment(id, request, user));
    }

    /** Staff deletes their own internal note (never a public reply, never another staff's note unless ADMIN). */
    @DeleteMapping("/{id}/comments/{commentId}")
    @PreAuthorize("hasAnyRole('HELP_DESK_OFFICER','DEPARTMENT_STAFF','ADMIN')")
    public ResponseEntity<Map<String, String>> deleteComment(
            @PathVariable Long id,
            @PathVariable Long commentId,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        departmentService.deleteComment(id, commentId, user, getIp(httpRequest));
        return ResponseEntity.ok(Map.of("message", "Internal note deleted."));
    }

    /** Staff edits their own internal note (never a public reply, never another staff's note unless ADMIN). */
    @PutMapping("/{id}/comments/{commentId}")
    @PreAuthorize("hasAnyRole('HELP_DESK_OFFICER','DEPARTMENT_STAFF','ADMIN')")
    public ResponseEntity<CommentResponse> updateComment(
            @PathVariable Long id,
            @PathVariable Long commentId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(departmentService.updateComment(id, commentId, body.get("body"), user, getIp(httpRequest)));
    }

    // ── Saved reply templates (Module 3) ───────────────────────────────

    @GetMapping("/department/reply-templates")
    @PreAuthorize("hasAnyRole('DEPARTMENT_STAFF','ADMIN')")
    public ResponseEntity<List<ReplyTemplateResponse>> getReplyTemplates(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(departmentService.getReplyTemplates(user));
    }

    @PostMapping("/department/reply-templates")
    @PreAuthorize("hasRole('DEPARTMENT_STAFF')")
    public ResponseEntity<ReplyTemplateResponse> createReplyTemplate(
            @Valid @RequestBody CreateReplyTemplateRequest request,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(departmentService.createReplyTemplate(request, user, getIp(httpRequest)));
    }

    @DeleteMapping("/department/reply-templates/{templateId}")
    @PreAuthorize("hasAnyRole('DEPARTMENT_STAFF','ADMIN')")
    public ResponseEntity<Map<String, String>> deleteReplyTemplate(
            @PathVariable Long templateId,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        departmentService.deleteReplyTemplate(templateId, user, getIp(httpRequest));
        return ResponseEntity.ok(Map.of("message", "Reply template deleted."));
    }

    private String getIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return forwarded != null ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }
}
