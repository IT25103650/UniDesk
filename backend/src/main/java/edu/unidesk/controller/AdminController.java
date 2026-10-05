package edu.unidesk.controller;

import edu.unidesk.dto.admin.AdminResetPasswordRequest;
import edu.unidesk.dto.admin.CreateUserRequest;
import edu.unidesk.dto.admin.SetActiveRequest;
import edu.unidesk.dto.admin.StudentProfileRequest;
import edu.unidesk.dto.admin.UpdateRoleRequest;
import edu.unidesk.dto.admin.UpdateUserRequest;
import edu.unidesk.exception.BadRequestException;
import edu.unidesk.model.User;
import edu.unidesk.model.enums.Role;
import edu.unidesk.service.StudentProfileService;
import edu.unidesk.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final UserService userService;
    private final StudentProfileService studentProfileService;

    // ── User Management ───────────────────────────────────────────────────────

    @GetMapping("/users")
    public ResponseEntity<Page<User>> getUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Role roleEnum = (role != null && !role.isBlank()) ? Role.valueOf(role.toUpperCase()) : null;
        String searchTerm = (search != null && !search.isBlank()) ? search.trim() : null;
        return ResponseEntity.ok(userService.getAll(roleEnum, searchTerm,
                PageRequest.of(page, size, Sort.by("createdAt").descending())));
    }

    @PostMapping("/users")
    public ResponseEntity<User> createUser(
            @Valid @RequestBody CreateUserRequest request,
            @AuthenticationPrincipal User admin,
            HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(userService.adminCreateUser(
                        request.fullName(), request.email(), request.password(),
                        parseRole(request.role()), request.departmentId(), admin, getIp(httpRequest)));
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<User> updateRole(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRoleRequest request,
            @AuthenticationPrincipal User admin,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(userService.adminUpdateRole(id, parseRole(request.role()), admin, getIp(httpRequest)));
    }

    @PutMapping("/users/{id}/active")
    public ResponseEntity<User> setActive(
            @PathVariable Long id,
            @Valid @RequestBody SetActiveRequest request,
            @AuthenticationPrincipal User admin,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(userService.setActive(id, request.active(), admin, getIp(httpRequest)));
    }

    @PutMapping("/users/{id}/reset-password")
    public ResponseEntity<Void> resetPassword(
            @PathVariable Long id,
            @Valid @RequestBody AdminResetPasswordRequest request,
            @AuthenticationPrincipal User admin,
            HttpServletRequest httpRequest) {
        userService.adminResetPassword(id, request.effectivePassword(), admin, getIp(httpRequest));
        return ResponseEntity.noContent().build();
    }

    /** Get single user profile (admin + all staff roles). */
    @GetMapping("/users/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HELP_DESK_OFFICER','DEPARTMENT_STAFF','WELFARE_OFFICER','MANAGEMENT')")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getById(id));
    }

    /** Admin edits a user's basic info. */
    @PutMapping("/users/{id}")
    public ResponseEntity<User> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request,
            @AuthenticationPrincipal User admin,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(userService.adminUpdateUser(
                id, request.fullName(), request.phone(), request.email(),
                admin, getIp(httpRequest)));
    }

    /** Soft-delete a user account (sets active=false; reversible via PUT /users/{id}/active). */
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(
            @PathVariable Long id,
            @AuthenticationPrincipal User admin,
            HttpServletRequest httpRequest) {
        if (admin.getId().equals(id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        userService.softDeleteUser(id, admin, getIp(httpRequest));
        return ResponseEntity.noContent().build();
    }

    /** Get full student academic profile (admin + staff roles). */
    @GetMapping("/users/{id}/student-profile")
    @PreAuthorize("hasAnyRole('ADMIN','HELP_DESK_OFFICER','DEPARTMENT_STAFF','WELFARE_OFFICER','MANAGEMENT')")
    public ResponseEntity<java.util.Map<String, Object>> getStudentProfile(@PathVariable Long id) {
        return ResponseEntity.ok(studentProfileService.getFullProfile(id));
    }

    /** Admin upserts a student's academic profile. */
    @PutMapping("/users/{id}/student-profile")
    public ResponseEntity<edu.unidesk.model.StudentProfile> upsertStudentProfile(
            @PathVariable Long id,
            @Valid @RequestBody StudentProfileRequest request) {
        return ResponseEntity.ok(studentProfileService.upsertProfile(id, request));
    }

    /** Role names are checked against the enum here so an unknown role is a 400, not a 500. */
    private Role parseRole(String value) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException("role is required.");
        }
        try {
            return Role.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid role: " + value);
        }
    }

    private String getIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return forwarded != null ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }
}
