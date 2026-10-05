package edu.unidesk.controller;

import edu.unidesk.service.StudentProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Allows staff officers to view student profiles when handling tickets.
 * Read-only for staff; admin has full CRUD via AdminController.
 */
@RestController
@RequestMapping("/api/students")
@PreAuthorize("hasAnyRole('ADMIN','HELP_DESK_OFFICER','DEPARTMENT_STAFF','WELFARE_OFFICER','MANAGEMENT')")
@RequiredArgsConstructor
public class StudentProfileController {

    private final StudentProfileService studentProfileService;

    /**
     * GET /api/students/{userId}/profile
     * Returns the full student profile including personal details, fees and exam records.
     * Accessible by any logged-in staff role so officers can view profiles while handling tickets.
     */
    @GetMapping("/{userId}/profile")
    public ResponseEntity<Map<String, Object>> getStudentProfile(@PathVariable Long userId) {
        return ResponseEntity.ok(studentProfileService.getFullProfile(userId));
    }
}
