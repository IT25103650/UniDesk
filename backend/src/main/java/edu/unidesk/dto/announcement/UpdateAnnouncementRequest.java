package edu.unidesk.dto.announcement;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/** Partial update: null fields are left unchanged, but a supplied title/body must not be blank. */
public record UpdateAnnouncementRequest(
        @Pattern(regexp = "(?s).*\\S.*", message = "Title cannot be blank.")
        @Size(max = 200, message = "Title must be at most 200 characters.")
        String title,

        @Pattern(regexp = "(?s).*\\S.*", message = "Announcement body cannot be blank.")
        String body,

        LocalDateTime startDate,

        LocalDateTime endDate,

        @Size(max = 30)
        String targetRole,

        @Size(max = 20)
        String priority
) {
    @AssertTrue(message = "End date must be after the start date.")
    public boolean isEndAfterStart() {
        return startDate == null || endDate == null || endDate.isAfter(startDate);
    }
}
