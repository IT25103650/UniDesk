package edu.unidesk.dto.auth;

import edu.unidesk.model.enums.Role;

public record AuthResponse(
        String accessToken,
        String tokenType,
        Long userId,
        String fullName,
        String email,
        Role role,
        Long departmentId,
        String departmentName
) {
    public AuthResponse(String accessToken, Long userId, String fullName, String email, Role role,
                        Long departmentId, String departmentName) {
        this(accessToken, "Bearer", userId, fullName, email, role, departmentId, departmentName);
    }
}
