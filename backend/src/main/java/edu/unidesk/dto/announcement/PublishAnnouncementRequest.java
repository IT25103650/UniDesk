package edu.unidesk.dto.announcement;

import jakarta.validation.constraints.NotNull;

public record PublishAnnouncementRequest(
        @NotNull(message = "Publish flag is required.")
        Boolean publish
) {}
