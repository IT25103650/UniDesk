package edu.unidesk.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Help Desk tag on a ticket (e.g. "Duplicate", "Needs info", "Follow-up").
 * Module 2 (Triage): adding a tag inserts a row, removing it deletes the row.
 */
@Entity
@Table(name = "ticket_tags")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TicketTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @Column(nullable = false, length = 40)
    private String label;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "added_by", nullable = false)
    private User addedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
