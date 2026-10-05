package edu.unidesk.dto.ticket;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AddTicketTagRequest(
        @NotBlank(message = "Tag label is required.")
        @Size(max = 40, message = "Tag label must be at most 40 characters.")
        @Pattern(regexp = "^[\\p{L}\\p{N} _-]+$",
                 message = "Tag label may only contain letters, numbers, spaces, '-' and '_'.")
        String label
) {}
