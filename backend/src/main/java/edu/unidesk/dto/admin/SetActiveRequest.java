package edu.unidesk.dto.admin;

import jakarta.validation.constraints.NotNull;

public record SetActiveRequest(
        @NotNull(message = "Active flag is required.")
        Boolean active
) {}
