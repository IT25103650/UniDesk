package edu.unidesk.dto.admin;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Full replacement of a student's academic profile (the admin form always sends every field). */
public record StudentProfileRequest(
        @Size(max = 20, message = "NIC number must be at most 20 characters.") String nicNumber,
        @Past(message = "Date of birth must be in the past.") LocalDate dateOfBirth,
        @Size(max = 10) String gender,
        @Size(max = 500) String address,
        @Size(max = 100) String city,
        @Size(max = 150) String guardianName,
        @Size(max = 20, message = "Guardian phone must be at most 20 characters.") String guardianPhone,
        @Size(max = 50) String guardianRelationship,
        @Size(max = 150) String degreeProgramme,
        @Size(max = 150) String faculty,
        @Size(max = 150) String specialisation,
        @Min(value = 1990, message = "Intake year looks invalid.") @Max(value = 2100, message = "Intake year looks invalid.") Integer intakeYear,
        @Size(max = 20) String intakeMonth,
        @Min(value = 1, message = "Semester must be at least 1.") @Max(value = 12, message = "Semester must be at most 12.") Integer currentSemester,
        @Size(max = 20) String academicYear,
        @DecimalMin(value = "0.00", message = "CGPA must be between 0.00 and 4.00.") @DecimalMax(value = "4.00", message = "CGPA must be between 0.00 and 4.00.") BigDecimal cgpa,
        @Size(max = 50) String scholarshipStatus,
        Boolean hostelResident,
        @Size(max = 500) String medicalNotes
) {}
