package edu.unidesk.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Exam / module result record for a student.
 */
@Entity
@Table(name = "student_exams")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentExam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "academic_year", nullable = false, length = 20)
    private String academicYear;

    @Column(nullable = false)
    private Integer semester;

    @Column(name = "module_code", nullable = false, length = 20)
    private String moduleCode;

    @Column(name = "module_name", nullable = false, length = 200)
    private String moduleName;

    @Column
    private Integer credits;

    @Column(length = 5)
    private String grade;

    @Column(name = "grade_points", precision = 3, scale = 2)
    private BigDecimal gradePoints;

    @Column(length = 10)
    private String result;

    @Column(name = "exam_date")
    private LocalDate examDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
