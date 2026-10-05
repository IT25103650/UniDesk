package edu.unidesk.dto.ticket;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddCommentRequest(
        @NotBlank(message = "Comment body is required.")
        @Size(max = 5000, message = "Comment is too long.")
        String body,

        boolean internal
) {}
