package edu.unidesk.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank(message = "Full name is required.")
        @Size(max = 100)
        String fullName,

        @Size(max = 20)
        String phone
) {}
