package edu.unidesk.service;

import edu.unidesk.exception.BadRequestException;
import edu.unidesk.exception.ResourceNotFoundException;
import edu.unidesk.model.Department;
import edu.unidesk.model.User;
import edu.unidesk.model.enums.Role;
import edu.unidesk.repository.DepartmentRepository;
import edu.unidesk.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    public User getById(Long id) {
        // Fetch-joins department so it's fully populated before the entity leaves
        // this method — otherwise serializing a DEPARTMENT_STAFF user's lazy
        // department proxy in a JSON response throws "no Session".
        return userRepository.findByIdWithDepartment(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
    }

    public Page<User> getAll(Pageable pageable) {
        return userRepository.findAll(pageable);
    }

    public Page<User> getAll(Role role, String search, Pageable pageable) {
        return userRepository.findWithFilters(role, search, pageable);
    }

    @Transactional
    public User adminCreateUser(String fullName, String email, String password,
                                 Role role, Long departmentId, User admin, String ip) {
        if (fullName == null || fullName.isBlank()) {
            throw new BadRequestException("Full name is required.");
        }
        if (email == null || !EMAIL_PATTERN.matcher(email.trim()).matches()) {
            throw new BadRequestException("Please provide a valid email address.");
        }
        if (password == null || password.length() < 8 || password.length() > 72) {
            throw new BadRequestException("Password must be between 8 and 72 characters.");
        }
        if (userRepository.existsByEmail(email.toLowerCase())) {
            throw new BadRequestException("A user with this email already exists.");
        }

        Department dept = departmentId != null
                ? departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found."))
                : null;

        User user = User.builder()
                .fullName(fullName.trim())
                .email(email.toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(password))
                .role(role)
                .department(dept)
                .active(true)
                .emailVerified(true)
                .build();
        user = userRepository.save(user);

        auditLogService.log(admin, "USER_CREATED", "USER", user.getId(),
                "Admin created user with role: " + role.name(), ip);
        return user;
    }

    @Transactional
    public User adminUpdateRole(Long userId, Role newRole, User admin, String ip) {
        assertNotSelf(userId, admin, "change your own role");
        User user = getById(userId);
        String oldRole = user.getRole().name();
        user.setRole(newRole);
        userRepository.save(user);
        auditLogService.log(admin, "USER_ROLE_CHANGED", "USER", userId,
                oldRole + " → " + newRole.name(), ip);
        return user;
    }

    @Transactional
    public User setActive(Long userId, boolean active, User admin, String ip) {
        if (!active) assertNotSelf(userId, admin, "deactivate your own account");
        User user = getById(userId);
        user.setActive(active);
        userRepository.save(user);
        auditLogService.log(admin, active ? "USER_ENABLED" : "USER_DISABLED", "USER", userId,
                "Account " + (active ? "enabled" : "disabled"), ip);
        return user;
    }

    /** Admin resets another user's password. */
    @Transactional
    public void adminResetPassword(Long userId, String newPassword, User admin, String ip) {
        if (newPassword == null || newPassword.length() < 8 || newPassword.length() > 72) {
            throw new BadRequestException("Password must be between 8 and 72 characters.");
        }
        User user = getById(userId);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        auditLogService.log(admin, "ADMIN_PASSWORD_RESET", "USER", userId,
                "Admin reset password for: " + user.getEmail(), ip);
    }

    /** Admin edits a user's basic info. */
    @Transactional
    public User adminUpdateUser(Long userId, String fullName, String phone, String email, User admin, String ip) {
        User user = getById(userId);
        if (fullName != null && !fullName.isBlank()) user.setFullName(fullName.trim());
        if (phone != null) user.setPhone(phone.trim());
        if (email != null && !email.isBlank()) {
            String normalised = email.toLowerCase().trim();
            if (!normalised.equals(user.getEmail()) && userRepository.existsByEmail(normalised)) {
                throw new edu.unidesk.exception.BadRequestException("Email already in use.");
            }
            user.setEmail(normalised);
        }
        userRepository.save(user);
        auditLogService.log(admin, "USER_UPDATED", "USER", userId, "Admin updated user info", ip);
        return user;
    }

    /** Soft-delete: deactivate the account permanently but keep history intact. */
    @Transactional
    public void softDeleteUser(Long userId, User admin, String ip) {
        assertNotSelf(userId, admin, "delete your own account");
        User user = getById(userId);
        user.setActive(false);
        userRepository.save(user);
        auditLogService.log(admin, "USER_DELETED", "USER", userId,
                "Admin soft-deleted account: " + user.getEmail(), ip);
    }

    /** Stops an admin locking themselves out — previously only the UI prevented this. */
    private void assertNotSelf(Long targetUserId, User admin, String action) {
        if (admin != null && targetUserId != null && targetUserId.equals(admin.getId())) {
            throw new BadRequestException("You cannot " + action + ".");
        }
    }
}
