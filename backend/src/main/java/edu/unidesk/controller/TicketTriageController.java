package edu.unidesk.controller;

import edu.unidesk.dto.ticket.AddTriageNoteRequest;
import edu.unidesk.dto.ticket.AddTicketTagRequest;
import edu.unidesk.dto.ticket.TicketTagResponse;
import edu.unidesk.dto.ticket.TicketResponse;
import edu.unidesk.dto.ticket.TriageNoteResponse;
import edu.unidesk.model.User;
import edu.unidesk.service.ReportService;
import edu.unidesk.service.TicketTriageService;
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
 * Ticket Triage & Assignment — Help Desk Officer endpoints.
 */
@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketTriageController {

    private final TicketTriageService triageService;
    private final ReportService reportService;

    /** Helpdesk-accessible dashboard stats (mirrors admin stats but open to HELP_DESK_OFFICER). */
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('HELP_DESK_OFFICER','ADMIN')")
    public ResponseEntity<Map<String, Object>> getHelpdeskStats() {
        return ResponseEntity.ok(reportService.getDashboardStats());
    }

    /** Help Desk Officers and Admins view all tickets with enhanced filters. */
    @GetMapping
    @PreAuthorize("hasAnyRole('HELP_DESK_OFFICER','ADMIN')")
    public ResponseEntity<Page<TicketResponse>> getAll(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var statusEnum = status != null
                ? edu.unidesk.model.enums.TicketStatus.valueOf(status.toUpperCase()) : null;
        var priorityEnum = priority != null
                ? edu.unidesk.model.enums.Priority.valueOf(priority.toUpperCase()) : null;
        java.time.LocalDateTime dateFromDt = dateFrom != null
                ? java.time.LocalDate.parse(dateFrom).atStartOfDay() : null;
        java.time.LocalDateTime dateToDt = dateTo != null
                ? java.time.LocalDate.parse(dateTo).atTime(23, 59, 59) : null;
        return ResponseEntity.ok(triageService.getAllTickets(statusEnum, priorityEnum, departmentId,
                categoryId, dateFromDt, dateToDt, search,
                PageRequest.of(page, size, Sort.by("createdAt").descending())));
    }

    @PutMapping("/{id}/priority")
    @PreAuthorize("hasAnyRole('HELP_DESK_OFFICER','ADMIN')")
    public ResponseEntity<TicketResponse> updatePriority(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(triageService.updatePriority(id,
                body.get("priority"), user, getIp(httpRequest)));
    }

    @PutMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('HELP_DESK_OFFICER','ADMIN')")
    public ResponseEntity<TicketResponse> assign(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        Long deptId = body.get("departmentId") != null
                ? Long.parseLong(body.get("departmentId").toString()) : null;
        Long assignedToId = body.get("assignedToId") != null
                ? Long.parseLong(body.get("assignedToId").toString()) : null;
        return ResponseEntity.ok(triageService.assignTicket(id, deptId, assignedToId, user, getIp(httpRequest)));
    }

    /** Help Desk removes a department/staff assignment, returning the ticket to the unassigned queue. */
    @PutMapping("/{id}/unassign")
    @PreAuthorize("hasAnyRole('HELP_DESK_OFFICER','ADMIN')")
    public ResponseEntity<TicketResponse> unassign(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(triageService.unassignTicket(id, reason, user, getIp(httpRequest)));
    }

    @PutMapping("/{id}/forward")
    @PreAuthorize("hasAnyRole('DEPARTMENT_STAFF','HELP_DESK_OFFICER','ADMIN')")
    public ResponseEntity<TicketResponse> forward(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        Long newDeptId = Long.parseLong(body.get("departmentId").toString());
        String reason = body.get("reason") != null ? body.get("reason").toString() : null;
        return ResponseEntity.ok(triageService.forwardTicket(id, newDeptId, reason, user, getIp(httpRequest)));
    }

    @PutMapping("/{id}/reopen")
    @PreAuthorize("hasAnyRole('HELP_DESK_OFFICER','ADMIN')")
    public ResponseEntity<TicketResponse> reopen(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(triageService.reopenTicket(id, user, getIp(httpRequest)));
    }

    /** Help Desk / Admin adds a triage note while assigning/routing the ticket. */
    @PostMapping("/{id}/triage-notes")
    @PreAuthorize("hasAnyRole('HELP_DESK_OFFICER','ADMIN')")
    public ResponseEntity<TriageNoteResponse> addTriageNote(
            @PathVariable Long id,
            @Valid @RequestBody AddTriageNoteRequest request,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(triageService.addTriageNote(id, request, user, getIp(httpRequest)));
    }

    @GetMapping("/{id}/triage-notes")
    @PreAuthorize("hasAnyRole('HELP_DESK_OFFICER','ADMIN')")
    public ResponseEntity<List<TriageNoteResponse>> getTriageNotes(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(triageService.getTriageNotes(id, user));
    }

    /** Author deletes their own triage note (Admin may delete any). */
    @DeleteMapping("/{id}/triage-notes/{noteId}")
    @PreAuthorize("hasAnyRole('HELP_DESK_OFFICER','ADMIN')")
    public ResponseEntity<Map<String, String>> deleteTriageNote(
            @PathVariable Long id,
            @PathVariable Long noteId,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        triageService.deleteTriageNote(id, noteId, user, getIp(httpRequest));
        return ResponseEntity.ok(Map.of("message", "Triage note deleted."));
    }

    // ── Ticket tags (Module 2) ─────────────────────────────────────────

    @PostMapping("/{id}/tags")
    @PreAuthorize("hasAnyRole('HELP_DESK_OFFICER','ADMIN')")
    public ResponseEntity<TicketTagResponse> addTag(
            @PathVariable Long id,
            @Valid @RequestBody AddTicketTagRequest request,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(triageService.addTag(id, request, user, getIp(httpRequest)));
    }

    @GetMapping("/{id}/tags")
    @PreAuthorize("hasAnyRole('HELP_DESK_OFFICER','ADMIN')")
    public ResponseEntity<List<TicketTagResponse>> getTags(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(triageService.getTags(id, user));
    }

    @DeleteMapping("/{id}/tags/{tagId}")
    @PreAuthorize("hasAnyRole('HELP_DESK_OFFICER','ADMIN')")
    public ResponseEntity<Map<String, String>> deleteTag(
            @PathVariable Long id,
            @PathVariable Long tagId,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        triageService.deleteTag(id, tagId, user, getIp(httpRequest));
        return ResponseEntity.ok(Map.of("message", "Tag removed."));
    }

    private String getIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return forwarded != null ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }
}
