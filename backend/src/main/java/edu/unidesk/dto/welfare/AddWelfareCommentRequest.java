package edu.unidesk.dto.welfare;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddWelfareCommentRequest(
        @NotBlank(message = "Message body is required.")
        @Size(max = 5000)
        String body,
        Boolean internal
) {}
