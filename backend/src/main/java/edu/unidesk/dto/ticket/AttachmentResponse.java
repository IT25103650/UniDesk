package edu.unidesk.dto.ticket;

import edu.unidesk.model.TicketAttachment;

import java.time.LocalDateTime;

public record AttachmentResponse(
        Long id,
        Long ticketId,
        Long uploadedById,
        String uploadedByName,
        String originalName,
        Long fileSize,
        String contentType,
        LocalDateTime createdAt
) {
    public static AttachmentResponse from(TicketAttachment a) {
        return new AttachmentResponse(
                a.getId(),
                a.getTicket().getId(),
                a.getUploadedBy().getId(),
                a.getUploadedBy().getFullName(),
                a.getOriginalName(),
                a.getFileSize(),
                a.getContentType(),
                a.getCreatedAt()
        );
    }
}
