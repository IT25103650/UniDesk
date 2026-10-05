package edu.unidesk.dto.welfare;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateWelfareCaseRequest(
        @NotBlank(message = "Subject is required.")
        @Size(min = 5, max = 300)
        String subject,

        @NotBlank(message = "Description is required.")
        @Size(min = 10)
        String description
) {}
