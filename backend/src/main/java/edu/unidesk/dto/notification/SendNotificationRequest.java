package edu.unidesk.dto.notification;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Admin manually sends a notification to exactly one user OR to every user in one role. */
public record SendNotificationRequest(
        Long userId,

        String role,

        @NotBlank(message = "Title is required.")
        @Size(max = 200, message = "Title must be at most 200 characters.")
        String title,

        @NotBlank(message = "Message is required.")
        @Size(max = 500, message = "Message must be at most 500 characters.")
        String message
) {
    @AssertTrue(message = "Specify exactly one of a target user or a target role.")
    public boolean isSingleTarget() {
        boolean hasUser = userId != null;
        boolean hasRole = role != null && !role.isBlank();
        return hasUser != hasRole;
    }
}
