package edu.unidesk.dto.ticket;

import java.time.LocalDateTime;

public record CommentResponse(
        Long id,
        Long ticketId,
        Long authorId,
        String authorName,
        String authorRole,
        String body,
        Boolean internal,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
