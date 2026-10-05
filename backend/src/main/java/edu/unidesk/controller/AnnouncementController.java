package edu.unidesk.controller;

import edu.unidesk.dto.announcement.CreateAnnouncementRequest;
import edu.unidesk.dto.announcement.PublishAnnouncementRequest;
import edu.unidesk.dto.announcement.UpdateAnnouncementRequest;
import edu.unidesk.model.Announcement;
import edu.unidesk.model.User;
import edu.unidesk.service.AnnouncementService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/announcements")
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementService announcementService;

    /** Authenticated users — active announcements targeted at their own role (or everyone). */
    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Announcement>> getActive(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(announcementService.getActiveAnnouncementsForUser(user));
    }

    /** Admin — get all announcements (paged), with optional search/target/status filters. */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<Announcement>> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String targetRole,
            @RequestParam(required = false) Boolean isPublished,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (search != null || targetRole != null || isPublished != null) {
            return ResponseEntity.ok(announcementService.getAllFiltered(search, targetRole, isPublished, page, size));
        }
        return ResponseEntity.ok(announcementService.getAll(page, size));
    }

    /** Admin — create announcement. */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Announcement> create(
            @Valid @RequestBody CreateAnnouncementRequest body,
            @AuthenticationPrincipal User admin,
            HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(announcementService.create(body.title(), body.body(), body.startDate(), body.endDate(),
                        Boolean.TRUE.equals(body.publish()), body.targetRole(), body.priority(),
                        admin, getIp(request)));
    }

    /** Admin — update announcement. */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Announcement> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAnnouncementRequest body,
            @AuthenticationPrincipal User admin,
            HttpServletRequest request) {
        return ResponseEntity.ok(announcementService.update(id, body.title(), body.body(),
                body.startDate(), body.endDate(), body.targetRole(), body.priority(), admin, getIp(request)));
    }

    /** Admin — publish or unpublish. */
    @PutMapping("/{id}/publish")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Announcement> publish(
            @PathVariable Long id,
            @Valid @RequestBody PublishAnnouncementRequest body,
            @AuthenticationPrincipal User admin,
            HttpServletRequest request) {
        return ResponseEntity.ok(announcementService.publish(id, body.publish(), admin, getIp(request)));
    }

    /** Admin — delete announcement. */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal User admin,
            HttpServletRequest request) {
        announcementService.delete(id, admin, getIp(request));
        return ResponseEntity.noContent().build();
    }

    private String getIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return forwarded != null ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }
}
