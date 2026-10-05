package edu.unidesk.controller;

import edu.unidesk.dto.notification.SendNotificationRequest;
import edu.unidesk.exception.BadRequestException;
import edu.unidesk.model.AuditLog;
import edu.unidesk.model.User;
import edu.unidesk.model.enums.Role;
import edu.unidesk.service.AuditLogService;
import edu.unidesk.service.NotificationService;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Module 5 — Notifications, Announcements and Audit Logging: the admin-only endpoints.
 * (Same URLs as before under /api/admin; moved out of AdminController so Module 6's
 * controller contains only Module 6 functions.)
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class NotificationAdminController {

    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    /** Admin manually composes and sends a notification to one user, or broadcasts to a whole role. */
    @PostMapping("/notifications")
    public ResponseEntity<Map<String, Object>> sendNotification(
            @Valid @RequestBody SendNotificationRequest request,
            @AuthenticationPrincipal User admin,
            HttpServletRequest httpRequest) {
        Role role = request.role() != null && !request.role().isBlank() ? parseRole(request.role()) : null;
        int recipients = notificationService.sendManual(
                request.userId(), role, request.title(), request.message(),
                admin, getIp(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("recipients", recipients));
    }

    /** Admin views the audit log, filtered by action, actor and date range. */
    @GetMapping("/audit")
    public ResponseEntity<Page<AuditLog>> getAuditLog(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        PageRequest pr = PageRequest.of(page, size, Sort.by("createdAt").descending());
        LocalDateTime dateFromDt = dateFrom != null && !dateFrom.isBlank()
                ? LocalDate.parse(dateFrom).atStartOfDay() : null;
        LocalDateTime dateToDt = dateTo != null && !dateTo.isBlank()
                ? LocalDate.parse(dateTo).atTime(23, 59, 59) : null;
        return ResponseEntity.ok(auditLogService.search(action, actor, dateFromDt, dateToDt, pr));
    }

    /** Role names are checked against the enum here so an unknown role is a 400, not a 500. */
    private Role parseRole(String value) {
        try {
            return Role.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid role: " + value);
        }
    }

    private String getIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return forwarded != null ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }
}
