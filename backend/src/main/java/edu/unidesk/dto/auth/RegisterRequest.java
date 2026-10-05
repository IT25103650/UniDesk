package edu.unidesk.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Full name is required")
        @Size(min = 2, max = 150, message = "Full name must be between 2 and 150 characters")
        String fullName,

        @NotBlank(message = "Email is required")
        @Email(message = "Please provide a valid email address")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
        String password,

        @NotBlank(message = "Student ID is required")
        String studentId,

        String phone,

        @NotBlank(message = "Security question is required")
        String securityQuestion,

        @NotBlank(message = "Security answer is required")
        @Size(min = 1, max = 100, message = "Security answer must be between 1 and 100 characters")
        String securityAnswer
) {}
