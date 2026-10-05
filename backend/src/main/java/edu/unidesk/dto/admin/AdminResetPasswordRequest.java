package edu.unidesk.dto.admin;

import jakarta.validation.constraints.Size;

/** Accepts either "newPassword" or "password" (the admin UI sends "password"). */
public record AdminResetPasswordRequest(
        @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters.")
        String newPassword,

        @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters.")
        String password
) {
    public String effectivePassword() {
        return newPassword != null ? newPassword : password;
    }
}
