package edu.unidesk.service;

import edu.unidesk.dto.admin.StudentProfileRequest;
import edu.unidesk.exception.BadRequestException;
import edu.unidesk.exception.ResourceNotFoundException;
import edu.unidesk.model.StudentExam;
import edu.unidesk.model.StudentProfile;
import edu.unidesk.model.StudentSemesterFee;
import edu.unidesk.model.Ticket;
import edu.unidesk.model.User;
import edu.unidesk.model.enums.Role;
import edu.unidesk.repository.StudentExamRepository;
import edu.unidesk.repository.StudentProfileRepository;
import edu.unidesk.repository.StudentSemesterFeeRepository;
import edu.unidesk.repository.TicketRepository;
import edu.unidesk.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StudentProfileService {

    private final StudentProfileRepository profileRepo;
    private final StudentSemesterFeeRepository feeRepo;
    private final StudentExamRepository examRepo;
    private final UserRepository userRepo;
    private final TicketRepository ticketRepo;

    /** Returns a full aggregate profile map for a student user. */
    @Transactional(readOnly = true)
    public Map<String, Object> getFullProfile(Long userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        StudentProfile profile = profileRepo.findByUserId(userId).orElse(null);
        List<StudentSemesterFee> fees = feeRepo.findByUserIdOrderByAcademicYearDescSemesterDesc(userId);
        List<StudentExam> exams = examRepo.findByUserIdOrderByAcademicYearDescSemesterAscModuleCodeAsc(userId);
        List<Ticket> tickets = ticketRepo.findByStudentIdOrderByCreatedAtDesc(userId);

        Map<String, Object> result = new HashMap<>();

        // User basics
        result.put("userId", user.getId());
        result.put("fullName", user.getFullName());
        result.put("email", user.getEmail());
        result.put("phone", user.getPhone());
        result.put("studentId", user.getStudentId());
        result.put("role", user.getRole().name());
        result.put("active", user.getActive());
        result.put("createdAt", user.getCreatedAt());

        // Academic profile — real data only. A missing profile/field means "not provided",
        // never a fabricated placeholder that could be mistaken for a genuine record.
        result.put("nicNumber", profile != null ? profile.getNicNumber() : null);
        result.put("dateOfBirth", profile != null ? profile.getDateOfBirth() : null);
        result.put("gender", profile != null ? profile.getGender() : null);
        result.put("address", profile != null ? profile.getAddress() : null);
        result.put("city", profile != null ? profile.getCity() : null);
        result.put("guardianName", profile != null ? profile.getGuardianName() : null);
        result.put("guardianPhone", profile != null ? profile.getGuardianPhone() : null);
        result.put("guardianRelationship", profile != null ? profile.getGuardianRelationship() : null);
        result.put("degreeProgramme", profile != null ? profile.getDegreeProgramme() : null);
        result.put("faculty", profile != null ? profile.getFaculty() : null);
        result.put("specialisation", profile != null ? profile.getSpecialisation() : null);
        result.put("intakeYear", profile != null ? profile.getIntakeYear() : null);
        result.put("intakeMonth", profile != null ? profile.getIntakeMonth() : null);
        result.put("currentSemester", profile != null ? profile.getCurrentSemester() : null);
        result.put("academicYear", profile != null ? profile.getAcademicYear() : null);
        result.put("cgpa", profile != null ? profile.getCgpa() : null);
        result.put("scholarshipStatus", profile != null ? profile.getScholarshipStatus() : null);
        result.put("hostelResident", profile != null ? profile.getHostelResident() : null);
        result.put("medicalNotes", profile != null ? profile.getMedicalNotes() : null);
        result.put("hasProfile", profile != null);

        // Map fees to clean JSON-safe maps — an empty list means no fee records exist, not
        // a signal to invent some.
        List<Map<String, Object>> feeList = fees.stream().map(f -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", f.getId());
            m.put("academicYear", f.getAcademicYear());
            m.put("semester", f.getSemester());
            m.put("totalFee", f.getTotalFee());
            m.put("paidAmount", f.getPaidAmount());
            m.put("dueDate", f.getDueDate());
            m.put("paidDate", f.getPaidDate());
            m.put("status", f.getStatus());
            m.put("remarks", f.getRemarks());
            return m;
        }).toList();

        // Map exams to clean JSON-safe maps — likewise, empty means empty.
        List<Map<String, Object>> examList = exams.stream().map(e -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", e.getId());
            m.put("academicYear", e.getAcademicYear());
            m.put("semester", e.getSemester());
            m.put("moduleCode", e.getModuleCode());
            m.put("moduleName", e.getModuleName());
            m.put("credits", e.getCredits());
            m.put("grade", e.getGrade());
            m.put("gradePoints", e.getGradePoints());
            m.put("result", e.getResult());
            m.put("examDate", e.getExamDate());
            return m;
        }).toList();

        // Full ticket history — every ticket regardless of status/date, not just
        // currently-open ones, so staff can see the complete pattern of a
        // student's help desk interactions from their profile.
        List<Map<String, Object>> ticketList = tickets.stream().map(t -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", t.getId());
            m.put("referenceNo", t.getReferenceNo());
            m.put("subject", t.getSubject());
            m.put("status", t.getStatus());
            m.put("priority", t.getPriority());
            m.put("categoryName", t.getCategory() != null ? t.getCategory().getName() : null);
            m.put("departmentName", t.getDepartment() != null ? t.getDepartment().getName() : null);
            m.put("isDraft", t.getIsDraft());
            m.put("createdAt", t.getCreatedAt());
            m.put("resolvedAt", t.getResolvedAt());
            m.put("feedbackRating", t.getFeedbackRating());
            return m;
        }).toList();

        result.put("fees", feeList);
        result.put("exams", examList);
        result.put("tickets", ticketList);

        return result;
    }

    /**
     * Upsert (create or update) a student profile. The admin form always sends the full
     * profile, so every field is replaced (a blank field clears the stored value).
     */
    @Transactional
    public StudentProfile upsertProfile(Long userId, StudentProfileRequest req) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getRole() != Role.STUDENT) {
            throw new BadRequestException("Academic profiles can only be stored for student accounts.");
        }

        StudentProfile profile = profileRepo.findByUserId(userId)
                .orElse(StudentProfile.builder().user(user).build());

        profile.setNicNumber(req.nicNumber());
        profile.setDateOfBirth(req.dateOfBirth());
        profile.setGender(req.gender());
        profile.setAddress(req.address());
        profile.setCity(req.city());
        profile.setGuardianName(req.guardianName());
        profile.setGuardianPhone(req.guardianPhone());
        profile.setGuardianRelationship(req.guardianRelationship());
        profile.setDegreeProgramme(req.degreeProgramme());
        profile.setFaculty(req.faculty());
        profile.setSpecialisation(req.specialisation());
        profile.setIntakeYear(req.intakeYear());
        profile.setIntakeMonth(req.intakeMonth());
        profile.setCurrentSemester(req.currentSemester());
        profile.setAcademicYear(req.academicYear());
        profile.setCgpa(req.cgpa());
        profile.setScholarshipStatus(req.scholarshipStatus());
        if (req.hostelResident() != null) profile.setHostelResident(req.hostelResident());
        profile.setMedicalNotes(req.medicalNotes());

        return profileRepo.save(profile);
    }
}
