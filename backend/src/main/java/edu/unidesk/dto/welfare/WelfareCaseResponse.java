package edu.unidesk.dto.welfare;

import edu.unidesk.model.enums.WelfareStatus;

import java.time.LocalDateTime;

public record WelfareCaseResponse(
        Long id,
        String referenceNo,
        String subject,
        String description,
        WelfareStatus status,
        Boolean urgent,
        Long studentId,
        String studentName,
        String studentEmail,
        String studentPhone,
        String studentIdentifier,
        Long assignedToId,
        String assignedToName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime resolvedAt
) {}
