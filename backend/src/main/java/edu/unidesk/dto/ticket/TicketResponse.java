package edu.unidesk.dto.ticket;

import edu.unidesk.model.enums.Priority;
import edu.unidesk.model.enums.TicketStatus;

import java.time.LocalDateTime;

public record TicketResponse(
        Long id,
        String referenceNo,
        String subject,
        String description,
        TicketStatus status,
        Priority priority,
        Long categoryId,
        String categoryName,
        Long departmentId,
        String departmentName,
        Long studentId,
        String studentName,
        String studentEmail,
        String studentPhone,
        String studentIdentifier,
        Long assignedToId,
        String assignedToName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime resolvedAt,
        Boolean isDraft,
        Integer feedbackRating,
        String feedbackComment,
        LocalDateTime dueDate,
        String resolutionNote,
        Long resolutionNoteById,
        String resolutionNoteByName,
        LocalDateTime resolutionNoteAt
) {}
