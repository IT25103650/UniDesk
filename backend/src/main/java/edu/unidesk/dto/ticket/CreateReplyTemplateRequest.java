package edu.unidesk.dto.ticket;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateReplyTemplateRequest(
        @NotBlank(message = "Template title is required.")
        @Size(max = 100, message = "Template title must be at most 100 characters.")
        String title,

        @NotBlank(message = "Template text is required.")
        @Size(max = 5000, message = "Template text must be at most 5000 characters.")
        String body
) {}
