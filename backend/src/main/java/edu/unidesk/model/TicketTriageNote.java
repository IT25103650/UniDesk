package edu.unidesk.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Help Desk triage note — an internal note a Help Desk Officer or Admin attaches
 * while triaging/assigning a ticket. Distinct from TicketComment (the department
 * response/reply thread) so triage activity has its own independent record.
 */
@Entity
@Table(name = "ticket_triage_notes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TicketTriageNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
