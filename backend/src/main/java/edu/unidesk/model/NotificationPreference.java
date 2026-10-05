package edu.unidesk.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

/**
 * Stores per-user notification type preferences.
 * If a preference row exists with enabled=false, that type is suppressed.
 */
@Entity
@Table(name = "notification_preferences",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "notification_type"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class NotificationPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash", "authorities", "department"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** e.g. TICKET_CREATED, TICKET_ASSIGNED, TICKET_REPLIED, TICKET_RESOLVED, TICKET_CLOSED, OVERDUE_REMINDER */
    @Column(name = "notification_type", nullable = false, length = 50)
    private String notificationType;

    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = true;
}
