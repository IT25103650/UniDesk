package edu.unidesk.model;

import edu.unidesk.model.enums.Priority;
import edu.unidesk.model.enums.TicketStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Regular help-desk ticket.
 * Welfare-related cases MUST NOT use this entity — see WelfareCase.
 * (IEEE Code of Ethics §1 — welfare data separated at the data model level)
 */
@Entity
@Table(name = "tickets")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reference_no", nullable = false, unique = true, length = 20)
    private String referenceNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    /** Set when a Help Desk Officer assigns the ticket to a department. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    /** Department staff member the ticket is assigned to. */
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
    private TicketStatus status = TicketStatus.NEW;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private Priority priority = Priority.NORMAL;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    /** Draft tickets are not yet submitted. */
    @Column(name = "is_draft", nullable = false)
    @Builder.Default
    private Boolean isDraft = false;

    /** Feedback rating 1–5 given by student after resolution. */
    @Column(name = "feedback_rating")
    private Integer feedbackRating;

    /** Optional feedback comment from student after resolution. */
    @Column(name = "feedback_comment", length = 1000)
    private String feedbackComment;

    /** Calculated due date based on priority (HIGH=1d, NORMAL=3d, LOW=7d). */
    @Column(name = "due_date")
    private LocalDateTime dueDate;

    /**
     * When the overdue reminder was last sent for this ticket — tracked on the
     * ticket itself (not derived from notification history) so the 24h dedup
     * guard in OverdueTicketScheduler can't be bypassed by a user dismissing
     * (deleting) their notification, or by the notification's own separate
     * 4-hour dedup window.
     */
    @Column(name = "overdue_notified_at")
    private LocalDateTime overdueNotifiedAt;

    /**
     * Structured resolution summary written by department staff when resolving the
     * ticket — distinct from the ordinary comment thread, shown in a dedicated
     * "Resolution" area rather than mixed into replies.
     */
    @Column(name = "resolution_note", columnDefinition = "NVARCHAR(MAX)")
    private String resolutionNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolution_note_by")
    private User resolutionNoteBy;

    @Column(name = "resolution_note_at")
    private LocalDateTime resolutionNoteAt;

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
