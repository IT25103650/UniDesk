package edu.unidesk.dto.ticket;

import java.time.LocalDateTime;

public record TriageNoteResponse(
        Long id,
        Long ticketId,
        Long authorId,
        String authorName,
        String note,
        LocalDateTime createdAt
) {}
