package edu.unidesk.service;

import edu.unidesk.model.AuditLog;
import edu.unidesk.model.User;
import edu.unidesk.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * AuditLogService — central audit trail per IEEE 730 §7.4 Records Maintenance.
 *
 * All security-relevant actions must flow through this service:
 *   authentication, ticket mutations, welfare mutations, user changes.
 *
 * Uses @Async so audit logging never slows the primary request path.
 * Runs in a separate transaction so audit logs survive even if the
 * outer transaction rolls back — matching ISO/IEC 25010 reliability.
 */
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Async
    public void log(User actor, String action, String entityType, Long entityId,
                    String details, String ipAddress) {
        AuditLog log = AuditLog.builder()
                .actor(actor)
                .actorEmail(actor != null ? actor.getEmail() : "SYSTEM")
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .detail(details)
                .ipAddress(ipAddress)
                .build();
        auditLogRepository.save(log);
    }

    @Async
    public void logUnauthenticated(String email, String action, String details, String ipAddress) {
        AuditLog log = AuditLog.builder()
                .actorEmail(email)
                .action(action)
                .entityType("AUTH")
                .detail(details)
                .ipAddress(ipAddress)
                .build();
        auditLogRepository.save(log);
    }

    /**
     * Detaches a user's audit trail before their account is deleted (synchronous,
     * unlike {@link #log}, since the caller needs it to have happened before the
     * subsequent delete — otherwise the actor_id FK still blocks it).
     */
    public void detachActor(Long userId) {
        auditLogRepository.detachActor(userId);
    }

    public Page<AuditLog> getAll(Pageable pageable) {
        return auditLogRepository.findAll(pageable);
    }

    public Page<AuditLog> search(String action, Pageable pageable) {
        return auditLogRepository.findByActionContainingIgnoreCase(action, pageable);
    }

    public Page<AuditLog> search(String action, String actorEmail, LocalDateTime dateFrom,
                                  LocalDateTime dateTo, Pageable pageable) {
        return auditLogRepository.findWithFilters(action, actorEmail, dateFrom, dateTo, pageable);
    }
}
