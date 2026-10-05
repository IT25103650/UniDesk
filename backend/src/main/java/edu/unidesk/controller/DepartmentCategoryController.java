package edu.unidesk.controller;

import edu.unidesk.dto.admin.CreateCategoryRequest;
import edu.unidesk.dto.admin.CreateDepartmentRequest;
import edu.unidesk.dto.admin.UpdateCategoryRequest;
import edu.unidesk.dto.admin.UpdateDepartmentRequest;
import edu.unidesk.model.Category;
import edu.unidesk.model.Department;
import edu.unidesk.model.User;
import edu.unidesk.repository.UserRepository;
import edu.unidesk.service.CategoryService;
import edu.unidesk.service.DepartmentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DepartmentCategoryController {

    private final DepartmentService departmentService;
    private final CategoryService categoryService;
    private final UserRepository userRepository;

    // ── Departments ───────────────────────────────────────────────────────────

    @GetMapping("/departments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Department>> getDepartments(
            @RequestParam(defaultValue = "false") boolean activeOnly) {
        return ResponseEntity.ok(activeOnly ? departmentService.getActiveOnly() : departmentService.getAll());
    }

    @PostMapping("/departments")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Department> createDepartment(
            @Valid @RequestBody CreateDepartmentRequest body,
            @AuthenticationPrincipal User admin, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(departmentService.create(body.name(), body.description(),
                admin, getIp(httpRequest)));
    }

    @PutMapping("/departments/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Department> updateDepartment(
            @PathVariable Long id, @Valid @RequestBody UpdateDepartmentRequest body,
            @AuthenticationPrincipal User admin, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(departmentService.update(id,
                body.name(), body.description(), body.active(),
                admin, getIp(httpRequest)));
    }

    /** Returns all active staff users assigned to a given department.
     *  Accessible by Help Desk Officers and Admins for ticket assignment triage. */
    @GetMapping("/departments/{id}/staff")
    @PreAuthorize("hasAnyRole('HELP_DESK_OFFICER','ADMIN')")
    public ResponseEntity<List<User>> getDepartmentStaff(@PathVariable Long id) {
        return ResponseEntity.ok(userRepository.findByDepartmentId(id));
    }

    @DeleteMapping("/departments/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteDepartment(
            @PathVariable Long id, @AuthenticationPrincipal User admin, HttpServletRequest httpRequest) {
        departmentService.delete(id, admin, getIp(httpRequest));
        return ResponseEntity.ok(Map.of("message", "Department deleted successfully."));
    }

    // ── Categories ────────────────────────────────────────────────────────────

    @GetMapping("/categories")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Category>> getCategories(
            @RequestParam(defaultValue = "false") boolean activeOnly) {
        return ResponseEntity.ok(activeOnly ? categoryService.getActiveOnly() : categoryService.getAll());
    }

    @PostMapping("/categories")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Category> createCategory(
            @Valid @RequestBody CreateCategoryRequest body,
            @AuthenticationPrincipal User admin, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(categoryService.create(
                body.name(), body.description(), body.departmentId(),
                admin, getIp(httpRequest)));
    }

    @PutMapping("/categories/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Category> updateCategory(
            @PathVariable Long id, @Valid @RequestBody UpdateCategoryRequest body,
            @AuthenticationPrincipal User admin, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(categoryService.update(id,
                body.name(), body.description(), body.departmentId(), body.active(),
                admin, getIp(httpRequest)));
    }

    @DeleteMapping("/categories/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteCategory(
            @PathVariable Long id, @AuthenticationPrincipal User admin, HttpServletRequest httpRequest) {
        categoryService.delete(id, admin, getIp(httpRequest));
        return ResponseEntity.ok(Map.of("message", "Category deleted successfully."));
    }

    private String getIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return forwarded != null ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }
}
