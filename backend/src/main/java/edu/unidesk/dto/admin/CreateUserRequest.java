package edu.unidesk.dto.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** role is checked against the Role enum in AdminController. */
public record CreateUserRequest(
        @NotBlank(message = "Full name is required.")
        @Size(max = 150, message = "Full name must be at most 150 characters.")
        String fullName,

        @NotBlank(message = "Email is required.")
        @Email(message = "Please provide a valid email address.")
        @Size(max = 255)
        String email,

        @NotBlank(message = "Password is required.")
        @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters.")
        String password,

        @NotBlank(message = "Role is required.")
        String role,

        Long departmentId
) {}
