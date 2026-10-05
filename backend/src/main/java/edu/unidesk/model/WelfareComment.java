package edu.unidesk.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Private communication channel for welfare cases.
 * Visible only to the student who owns the case, the assigned welfare officer,
 * and admins. Never exposed through ticket comment APIs.
 */
@Entity
@Table(name = "welfare_comments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WelfareComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id", nullable = false)
    private WelfareCase welfareCase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String body;

    /** Internal notes are visible only to welfare officers/admins, never to the student. */
    @Builder.Default
    @Column(name = "is_internal", nullable = false)
    private Boolean isInternal = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
