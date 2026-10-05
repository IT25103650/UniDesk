package edu.unidesk.dto.welfare;

import edu.unidesk.model.WelfareAttachment;

import java.time.LocalDateTime;

public record WelfareAttachmentResponse(
        Long id,
        Long caseId,
        Long uploadedById,
        String uploadedByName,
        String fileName,
        Long fileSize,
        String contentType,
        LocalDateTime uploadedAt
) {
    public static WelfareAttachmentResponse from(WelfareAttachment a) {
        return new WelfareAttachmentResponse(
                a.getId(),
                a.getWelfareCase().getId(),
                a.getUploadedBy().getId(),
                a.getUploadedBy().getFullName(),
                a.getFileName(),
                a.getFileSize(),
                a.getContentType(),
                a.getUploadedAt()
        );
    }
}
