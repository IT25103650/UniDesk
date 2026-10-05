package edu.unidesk.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import edu.unidesk.model.enums.WelfareStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Welfare case — INTENTIONALLY separate from the Ticket entity.
 *
 * IEEE Code of Ethics §1: "hold paramount the safety, health, and welfare
 * of the public". Welfare case data (sensitive personal information) is
 * isolated at EVERY layer: DB table, repository, service, controller, and
 * API path (/api/welfare vs /api/tickets).
 *
 * Access is restricted to:
 *  - The submitting student (own cases only)
 *  - Welfare Officers
 *  - Admins
 *
 * Help Desk Officers and Department Staff are explicitly DENIED access
 * at the @PreAuthorize level and at this entity's repository query level.
 */
@Entity
@Table(name = "welfare_cases")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class WelfareCase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reference_no", nullable = false, unique = true, length = 20)
    private String referenceNo;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash", "authorities", "department"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash", "authorities", "department"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    private User assignedTo;

    @Column(nullable = false, length = 300)
    private String subject;

    @Column(nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private WelfareStatus status = WelfareStatus.NEW;

    @Column(name = "is_urgent", nullable = false)
    @Builder.Default
    private Boolean isUrgent = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
