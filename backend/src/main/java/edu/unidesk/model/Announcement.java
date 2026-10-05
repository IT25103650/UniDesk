package edu.unidesk.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "announcements")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Announcement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String body;

    /** Who created this announcement. */
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash", "authorities", "department"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "is_published", nullable = false)
    @Builder.Default
    private Boolean isPublished = false;

    /**
     * Who should see this announcement: null or "ALL" means every authenticated role;
     * otherwise the exact name of a {@link edu.unidesk.model.enums.Role} constant.
     * Validated against the real Role enum at the service layer — never a free-text value.
     */
    @Column(name = "target_role", length = 30)
    private String targetRole;

    /** Reuses the same {@link edu.unidesk.model.enums.Priority} scale as tickets. */
    @Column(name = "priority", length = 20, nullable = false)
    @Builder.Default
    private String priority = "NORMAL";

    /** Optional — announcement only visible from this date. */
    @Column(name = "start_date")
    private LocalDateTime startDate;

    /** Optional — announcement auto-hides after this date. */
    @Column(name = "end_date")
    private LocalDateTime endDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

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
