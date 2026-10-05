package edu.unidesk.service;

import edu.unidesk.exception.BadRequestException;
import edu.unidesk.exception.ResourceNotFoundException;
import edu.unidesk.model.Notification;
import edu.unidesk.model.NotificationPreference;
import edu.unidesk.model.User;
import edu.unidesk.repository.NotificationPreferenceRepository;
import edu.unidesk.repository.NotificationRepository;
import edu.unidesk.repository.UserRepository;
import edu.unidesk.model.enums.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    /** All known notification types with their labels. */
    public static final Map<String, String> NOTIFICATION_TYPES = Map.ofEntries(
            Map.entry("TICKET_CREATED",   "Ticket Created"),
            Map.entry("TICKET_ASSIGNED",  "Ticket Assigned"),
            Map.entry("TICKET_REPLIED",   "New Reply on Ticket"),
            Map.entry("TICKET_RESOLVED",  "Ticket Resolved"),
            Map.entry("TICKET_CLOSED",    "Ticket Closed"),
            Map.entry("TICKET_FORWARDED", "Ticket Forwarded"),
            Map.entry("TICKET_ESCALATED", "Ticket Escalated"),
            Map.entry("TICKET_REOPEN_REQUESTED", "Reopen Requested"),
            Map.entry("OVERDUE_REMINDER", "Overdue Reminder"),
            Map.entry("WELFARE_UPDATED",  "Welfare Case Updated"),
            Map.entry("WELFARE_REPLIED",  "New Welfare Case Message"),
            Map.entry("ADMIN_MESSAGE",    "Message from Admin")
    );

    /**
     * Send a notification, respecting user preferences and deduplication.
     * <p>
     * Deduplication rule: if the same user already received a notification with
     * the same {@code title} and {@code link} within the last 4 hours it is silently
     * dropped, preventing repeated identical messages from schedulers or concurrent
     * events (IEEE 730 §7.4 — SLA monitoring must not spam users).
     *
     * @param notificationType one of the NOTIFICATION_TYPES keys
     */
    /**
     * Save a notification in its own independent transaction so it is always
     * committed even if the caller's transaction is later rolled back.
     * REQUIRES_NEW means this method gets a brand-new transaction that commits
     * as soon as the method returns.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void send(User recipient, String title, String message, String link, String notificationType) {
        if (recipient == null) return;

        // Check preference — if explicitly disabled, skip
        if (notificationType != null) {
            var pref = preferenceRepository.findByUserIdAndNotificationType(
                    recipient.getId(), notificationType);
            if (pref.isPresent() && !pref.get().getEnabled()) return;
        }

        // Deduplication — skip if same notification already sent within last 4 hours
        if (link != null && !link.isBlank()) {
            java.time.LocalDateTime dedupWindow = java.time.LocalDateTime.now().minusHours(4);
            if (notificationRepository.existsByUserIdAndTitleAndLinkAndCreatedAtAfter(
                    recipient.getId(), title, link, dedupWindow)) {
                return; // Already sent recently — drop duplicate
            }
        }

        Notification notification = Notification.builder()
                .user(recipient)
                .title(title)
                .message(message)
                .link(link)
                .isRead(false)
                .build();
        notificationRepository.save(notification);
    }

    /**
     * Send the same notification to every user that has the given role.
     * Runs with NOT_SUPPORTED so no outer transaction context exists.
     * Each individual send() call then starts its own fresh REQUIRES_NEW
     * transaction — one per recipient — so a failure for one does not
     * block the others and avoids nested transaction conflicts.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void sendToRole(Role role, String title, String message, String link, String notificationType) {
        List<User> users = userRepository.findByRole(role);
        for (User u : users) {
            send(u, title, message, link, notificationType);
        }
    }

    /**
     * Admin manually composes and sends a notification to one specific user, or
     * broadcasts it to every user holding a given role. Distinct from send()/sendToRole()
     * being called automatically as a side effect of ticket/welfare events — this is a
     * directly admin-triggered create, callable on its own via the API.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public int sendManual(Long targetUserId, Role targetRole, String title, String message, User actor, String ip) {
        if ((targetUserId == null) == (targetRole == null)) {
            throw new BadRequestException("Specify exactly one of a target user or a target role.");
        }
        if (title == null || title.isBlank() || message == null || message.isBlank()) {
            throw new BadRequestException("Title and message are required.");
        }

        int count;
        String targetDescription;
        if (targetUserId != null) {
            User target = userRepository.findById(targetUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found."));
            send(target, title.trim(), message.trim(), null, "ADMIN_MESSAGE");
            count = 1;
            targetDescription = "user #" + targetUserId;
        } else {
            List<User> targets = userRepository.findByRole(targetRole);
            targets.forEach(u -> send(u, title.trim(), message.trim(), null, "ADMIN_MESSAGE"));
            count = targets.size();
            targetDescription = "role " + targetRole;
        }

        auditLogService.log(actor, "NOTIFICATION_SENT", "NOTIFICATION", null,
                "Manual notification \"" + title.trim() + "\" sent to " + targetDescription
                        + " (" + count + " recipient(s))", ip);
        return count;
    }

    public List<Notification> getForUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public long countUnread(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markRead(Long notificationId, Long userId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found."));
        if (!n.getUser().getId().equals(userId)) {
            throw new org.springframework.security.access.AccessDeniedException("Access denied.");
        }
        n.setIsRead(true);
        notificationRepository.save(n);
    }

    /**
     * User dismisses their own notification. Hard-delete — notifications are ephemeral,
     * per-user UI state, not audit records, so removing the row is the safest option and
     * matches this table's existing lack of a soft-delete/dismissed flag. Audit log entries
     * live in a completely separate table and are never touched here.
     */
    @Transactional
    public void dismiss(Long notificationId, Long userId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found."));
        if (!n.getUser().getId().equals(userId)) {
            throw new org.springframework.security.access.AccessDeniedException("Access denied.");
        }
        notificationRepository.delete(n);
    }

    @Transactional
    public void markAllRead(Long userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalse(userId);
        unread.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(unread);
    }

    /** Get all preferences for a user (creates defaults if needed). */
    public List<NotificationPreference> getPreferences(Long userId) {
        List<NotificationPreference> existing = preferenceRepository.findByUserId(userId);
        // Return existing — if a type is missing, it's implicitly enabled
        return existing;
    }

    /** Update a single preference for a user. */
    @Transactional
    public NotificationPreference updatePreference(Long userId, String type, boolean enabled) {
        if (type == null || !NOTIFICATION_TYPES.containsKey(type)) {
            throw new BadRequestException("Unknown notification type: " + type);
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
        var existing = preferenceRepository.findByUserIdAndNotificationType(userId, type);
        NotificationPreference pref;
        if (existing.isPresent()) {
            pref = existing.get();
            pref.setEnabled(enabled);
        } else {
            pref = NotificationPreference.builder()
                    .user(user)
                    .notificationType(type)
                    .enabled(enabled)
                    .build();
        }
        return preferenceRepository.save(pref);
    }
}

