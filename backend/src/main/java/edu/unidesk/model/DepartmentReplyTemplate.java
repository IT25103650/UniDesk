package edu.unidesk.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * A saved reply a department reuses when answering students.
 * Module 3 (Department): saving a template inserts a row, removing it deletes the row.
 */
@Entity
@Table(name = "department_reply_templates")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DepartmentReplyTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String body;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
