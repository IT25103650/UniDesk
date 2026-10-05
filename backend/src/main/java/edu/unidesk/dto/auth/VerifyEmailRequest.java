package edu.unidesk.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record VerifyEmailRequest(
        @NotBlank(message = "Verification code is required")
        String code
) {}
