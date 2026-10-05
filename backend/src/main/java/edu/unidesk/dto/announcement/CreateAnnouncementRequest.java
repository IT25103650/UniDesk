package edu.unidesk.dto.announcement;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/** targetRole and priority are checked against their enums in AnnouncementService. */
public record CreateAnnouncementRequest(
        @NotBlank(message = "Title is required.")
        @Size(max = 200, message = "Title must be at most 200 characters.")
        String title,

        @NotBlank(message = "Announcement body is required.")
        String body,

        Boolean publish,

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
