package edu.unidesk.controller;

import edu.unidesk.dto.notification.UpdatePreferenceRequest;
import edu.unidesk.model.Notification;
import edu.unidesk.model.User;
import edu.unidesk.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UserNotificationController {

    private final NotificationService notificationService;

    // Profile endpoints live on UserController (/api/users/me) — not duplicated here.

    // ── Notifications ─────────────────────────────────────────────────────────

    @GetMapping("/notifications")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Notification>> getNotifications(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(notificationService.getForUser(user.getId()));
    }

    @GetMapping("/notifications/unread-count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(Map.of("count", notificationService.countUnread(user.getId())));
    }

    @PutMapping("/notifications/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> markRead(
            @PathVariable Long id, @AuthenticationPrincipal User user) {
        notificationService.markRead(id, user.getId());
        return ResponseEntity.noContent().build();
    }

    /** User dismisses (deletes) their own notification. */
    @DeleteMapping("/notifications/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> dismiss(
            @PathVariable Long id, @AuthenticationPrincipal User user) {
        notificationService.dismiss(id, user.getId());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/notifications/read-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal User user) {
        notificationService.markAllRead(user.getId());
        return ResponseEntity.noContent().build();
    }

    // ── Notification Preferences ──────────────────────────────────────────────

    @GetMapping("/notifications/types")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> getNotificationTypes() {
        return ResponseEntity.ok(NotificationService.NOTIFICATION_TYPES);
    }

    @GetMapping("/notifications/preferences")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<edu.unidesk.model.NotificationPreference>> getPreferences(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(notificationService.getPreferences(user.getId()));
    }

    @PutMapping("/notifications/preferences")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<edu.unidesk.model.NotificationPreference> updatePreference(
            @Valid @RequestBody UpdatePreferenceRequest body,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(notificationService.updatePreference(user.getId(), body.type(), body.enabled()));
    }
}
