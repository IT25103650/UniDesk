package edu.unidesk.service;

import edu.unidesk.exception.BadRequestException;
import edu.unidesk.exception.ResourceNotFoundException;
import edu.unidesk.model.User;
import edu.unidesk.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Shared / Common — a signed-in user's own account (any role): view profile,
 * update profile, change password. Kept separate from UserService, which holds
 * only Module 6's admin user-management functions.
 */
@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    /** Loads the user with their department, so it serialises for DEPARTMENT_STAFF too. */
    public User getOwnProfile(Long userId) {
        return userRepository.findByIdWithDepartment(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
    }

    @Transactional
    public User updateOwnProfile(Long userId, String fullName, String phone) {
        User user = getOwnProfile(userId);
        if (fullName != null && !fullName.isBlank()) user.setFullName(fullName.trim());
        if (phone != null) user.setPhone(phone.trim());
        return userRepository.save(user);
    }

    @Transactional
    public void changeOwnPassword(Long userId, String currentPassword, String newPassword, String ip) {
        User user = getOwnProfile(userId);
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect.");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        auditLogService.log(user, "PASSWORD_CHANGED", "USER", userId,
                "User changed their own password", ip);
    }
}
