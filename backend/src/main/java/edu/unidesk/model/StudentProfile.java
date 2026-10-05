package edu.unidesk.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Extended academic & personal profile for STUDENT role users.
 * Linked 1-to-1 with the users table.
 */
@Entity
@Table(name = "student_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "nic_number", length = 20)
    private String nicNumber;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(length = 10)
    private String gender;

    @Column(length = 500)
    private String address;

    @Column(length = 100)
    private String city;

    @Column(name = "guardian_name", length = 150)
    private String guardianName;

    @Column(name = "guardian_phone", length = 20)
    private String guardianPhone;

    @Column(name = "guardian_relationship", length = 50)
    private String guardianRelationship;

    @Column(name = "degree_programme", length = 150)
    private String degreeProgramme;

    @Column(length = 150)
    private String faculty;

    @Column(length = 150)
    private String specialisation;

    @Column(name = "intake_year")
    private Integer intakeYear;

    @Column(name = "intake_month", length = 20)
    private String intakeMonth;

    @Column(name = "current_semester")
    private Integer currentSemester;

    @Column(name = "academic_year", length = 20)
    private String academicYear;

    @Column(precision = 3, scale = 2)
    private BigDecimal cgpa;

    @Column(name = "scholarship_status", length = 50)
    private String scholarshipStatus;

    @Column(name = "hostel_resident", nullable = false)
    @Builder.Default
    private Boolean hostelResident = false;

    @Column(name = "medical_notes", length = 500)
    private String medicalNotes;

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
