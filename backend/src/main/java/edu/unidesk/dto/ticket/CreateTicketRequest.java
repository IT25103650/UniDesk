package edu.unidesk.dto.ticket;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateTicketRequest(
        @NotNull(message = "Category is required.")
        Long categoryId,

        @NotBlank(message = "Subject is required.")
        @Size(min = 5, max = 300, message = "Subject must be between 5 and 300 characters.")
        String subject,

        @NotBlank(message = "Description is required.")
        @Size(min = 10, message = "Please provide at least 10 characters of description.")
        String description
) {}
