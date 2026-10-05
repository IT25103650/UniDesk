package edu.unidesk.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Pre-provisioned student ID roster. Self-registration only succeeds for a
 * student ID that already exists here and hasn't been claimed yet — this
 * prevents anyone from creating an account for a student ID that doesn't
 * actually belong to an enrolled student.
 */
@Entity
@Table(name = "valid_student_ids")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ValidStudentId {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false, unique = true, length = 50)
    private String studentId;

    @Column(name = "is_registered", nullable = false)
    @Builder.Default
    private Boolean isRegistered = false;

    /** Set once this student ID is claimed during registration. */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registered_user_id")
    private User registeredUser;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
