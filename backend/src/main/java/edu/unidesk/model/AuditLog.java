package edu.unidesk.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * System-wide audit log — append-only record of security-relevant events.
 *
 * Required by:
 *  - IEEE Code of Ethics §7: "seek, accept, and offer honest criticism"
 *    (audit trail enables accountability)
 *  - Non-functional requirement: "Maintainability of Records"
 *
 * Events logged: USER_LOGIN, USER_LOGOUT, USER_CREATED, USER_ROLE_CHANGED,
 *   USER_DISABLED, TICKET_CREATED, TICKET_STATUS_CHANGED, TICKET_ASSIGNED,
 *   WELFARE_CASE_CREATED, WELFARE_STATUS_CHANGED, PASSWORD_RESET_REQUESTED
 *
 * Passwords and sensitive personal data are NEVER included in the detail field.
 */
@Entity
@Table(name = "audit_log")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Null for pre-auth events (e.g., failed login attempt). */
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash", "authorities", "department"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Column(name = "actor_email", length = 255)
    private String actorEmail;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(name = "entity_type", length = 50)
    private String entityType;

    @Column(name = "entity_id")
    private Long entityId;

    /** Plain-text or JSON description — NEVER contains passwords. */
    @Column(length = 1000)
    private String detail;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
