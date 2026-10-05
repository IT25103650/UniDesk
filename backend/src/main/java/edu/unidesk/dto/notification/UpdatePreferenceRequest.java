package edu.unidesk.dto.notification;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdatePreferenceRequest(
        @NotBlank(message = "Notification type is required.")
        @Size(max = 50, message = "Notification type is too long.")
        String type,

        @NotNull(message = "Enabled flag is required.")
        Boolean enabled
) {}
