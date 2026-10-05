package edu.unidesk.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SecurityQuestionRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Please provide a valid email address")
        String email
) {}
