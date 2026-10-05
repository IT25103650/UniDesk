package edu.unidesk.service;

import edu.unidesk.exception.BadRequestException;
import edu.unidesk.exception.ResourceNotFoundException;
import edu.unidesk.model.Announcement;
import edu.unidesk.model.User;
import edu.unidesk.model.enums.Role;
import edu.unidesk.repository.AnnouncementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;
    private final AuditLogService auditLogService;

    /** Admin — get all announcements (paged), unfiltered. */
    public Page<Announcement> getAll(int page, int size) {
        return announcementRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
    }

    /** Admin — get announcements with optional search/target-role/published filters (paged). */
    public Page<Announcement> getAllFiltered(String search, String targetRole, Boolean isPublished,
                                              int page, int size) {
        String normalizedSearch = (search != null && !search.isBlank()) ? search.trim() : null;
        String normalizedTarget = (targetRole != null && !targetRole.isBlank()) ? targetRole.trim() : null;
        return announcementRepository.findAllWithFilters(normalizedSearch, normalizedTarget, isPublished,
                PageRequest.of(page, size));
    }

    /** Public — get currently active announcements, regardless of role (legacy/unfiltered view). */
    public List<Announcement> getActiveAnnouncements() {
        return announcementRepository.findActiveAnnouncements(LocalDateTime.now());
    }

    /**
     * Public — get currently active announcements targeted at this user's role (or at everyone).
     * Role filtering happens here, server-side, so a user can never see an announcement
     * meant for a different role no matter what the client sends.
     */
    public List<Announcement> getActiveAnnouncementsForUser(User user) {
        return announcementRepository.findActiveAnnouncementsForRole(LocalDateTime.now(), user.getRole().name());
    }

    /** Validates a target-role string against the real Role enum (or "ALL"/null for everyone). */
    private String validateTargetRole(String targetRole) {
        if (targetRole == null || targetRole.isBlank() || "ALL".equalsIgnoreCase(targetRole)) {
            return null;
        }
        try {
            return Role.valueOf(targetRole.trim().toUpperCase()).name();
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid target role: " + targetRole);
        }
    }

    private String validatePriority(String priority) {
        if (priority == null || priority.isBlank()) return "NORMAL";
        try {
            return edu.unidesk.model.enums.Priority.valueOf(priority.trim().toUpperCase()).name();
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid priority: " + priority);
        }
    }

    @Transactional
    public Announcement create(String title, String body, LocalDateTime startDate,
                                LocalDateTime endDate, boolean publish, User admin, String ip) {
        return create(title, body, startDate, endDate, publish, null, null, admin, ip);
    }

    @Transactional
    public Announcement create(String title, String body, LocalDateTime startDate,
                                LocalDateTime endDate, boolean publish, String targetRole, String priority,
                                User admin, String ip) {
        Announcement a = Announcement.builder()
                .title(title.trim())
                .body(body.trim())
                .createdBy(admin)
                .isPublished(publish)
                .startDate(startDate)
                .endDate(endDate)
                .targetRole(validateTargetRole(targetRole))
                .priority(validatePriority(priority))
                .build();
        a = announcementRepository.save(a);
        auditLogService.log(admin, "ANNOUNCEMENT_CREATED", "ANNOUNCEMENT", a.getId(),
                "Created: " + title, ip);
        return a;
    }

    @Transactional
    public Announcement update(Long id, String title, String body, LocalDateTime startDate,
                                LocalDateTime endDate, User admin, String ip) {
        return update(id, title, body, startDate, endDate, null, null, admin, ip);
    }

    @Transactional
    public Announcement update(Long id, String title, String body, LocalDateTime startDate,
                                LocalDateTime endDate, String targetRole, String priority,
                                User admin, String ip) {
        Announcement a = announcementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found."));
        if (title != null) a.setTitle(title.trim());
        if (body != null) a.setBody(body.trim());
        if (startDate != null) a.setStartDate(startDate);
        if (endDate != null) a.setEndDate(endDate);
        if (targetRole != null) a.setTargetRole(validateTargetRole(targetRole));
        if (priority != null) a.setPriority(validatePriority(priority));
        a = announcementRepository.save(a);
        auditLogService.log(admin, "ANNOUNCEMENT_UPDATED", "ANNOUNCEMENT", a.getId(),
                "Updated: " + a.getTitle(), ip);
        return a;
    }

    @Transactional
    public Announcement publish(Long id, boolean publish, User admin, String ip) {
        Announcement a = announcementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found."));
        a.setIsPublished(publish);
        a = announcementRepository.save(a);
        auditLogService.log(admin, publish ? "ANNOUNCEMENT_PUBLISHED" : "ANNOUNCEMENT_UNPUBLISHED",
                "ANNOUNCEMENT", a.getId(), a.getTitle(), ip);
        return a;
    }

    @Transactional
    public void delete(Long id, User admin, String ip) {
        Announcement a = announcementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found."));
        announcementRepository.delete(a);
        auditLogService.log(admin, "ANNOUNCEMENT_DELETED", "ANNOUNCEMENT", id,
                "Deleted: " + a.getTitle(), ip);
    }
}
