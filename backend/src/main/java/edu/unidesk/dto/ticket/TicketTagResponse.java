package edu.unidesk.dto.ticket;

import java.time.LocalDateTime;

public record TicketTagResponse(
        Long id,
        Long ticketId,
        String label,
        String addedByName,
        LocalDateTime createdAt
) {}
