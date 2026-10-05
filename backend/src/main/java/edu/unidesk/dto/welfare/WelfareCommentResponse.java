package edu.unidesk.dto.welfare;

import java.time.LocalDateTime;

public record WelfareCommentResponse(
        Long id,
        Long caseId,
        Long authorId,
        String authorName,
        String authorRole,
        String body,
        Boolean isInternal,
        LocalDateTime createdAt
) {}
