package edu.unidesk.dto.ticket;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddTriageNoteRequest(
        @NotBlank(message = "Note text is required.")
        @Size(max = 2000, message = "Note is too long.")
        String note
) {}
