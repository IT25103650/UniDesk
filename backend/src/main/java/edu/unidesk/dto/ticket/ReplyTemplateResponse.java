package edu.unidesk.dto.ticket;

import java.time.LocalDateTime;

public record ReplyTemplateResponse(
        Long id,
        Long departmentId,
        String departmentName,
        String title,
        String body,
        Long createdById,
        String createdByName,
        LocalDateTime createdAt
) {}
