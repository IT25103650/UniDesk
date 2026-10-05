package edu.unidesk.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record VerifySecurityAnswerRequest(
        @NotBlank(message = "Email is required")
        @Email
        String email,

        @NotBlank(message = "Security answer is required")
        String securityAnswer
) {}
