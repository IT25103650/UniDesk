package edu.unidesk.service;

import edu.unidesk.exception.BadRequestException;
import edu.unidesk.exception.ResourceNotFoundException;
import edu.unidesk.model.Ticket;
import edu.unidesk.model.TicketAttachment;
import edu.unidesk.model.User;
import edu.unidesk.model.WelfareCase;
import edu.unidesk.model.WelfareAttachment;
import edu.unidesk.repository.TicketAttachmentRepository;
import edu.unidesk.repository.TicketRepository;
import edu.unidesk.repository.WelfareAttachmentRepository;
import edu.unidesk.repository.WelfareCaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    @Value("${app.file.upload-dir}")
    private String uploadDir;

    @Value("${app.file.max-size-bytes}")
    private long maxSizeBytes;

    private final TicketRepository ticketRepository;
    private final TicketAttachmentRepository attachmentRepository;
    private final WelfareCaseRepository welfareCaseRepository;
    private final WelfareAttachmentRepository welfareAttachmentRepository;

    private static final java.util.Set<String> ALLOWED_TYPES = java.util.Set.of(
            "application/pdf", "image/jpeg", "image/png", "image/gif",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain"
    );

    @Transactional
    public TicketAttachment storeFile(Long ticketId, MultipartFile file, User uploader) {
        if (file.isEmpty()) throw new BadRequestException("File is empty.");
        if (file.getSize() > maxSizeBytes) {
            throw new BadRequestException("File exceeds maximum allowed size of 10 MB.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new BadRequestException("File type not allowed. Permitted: PDF, images, Word, text.");
        }

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));

        // UUID filename prevents path traversal; also reject '..' explicitly, as welfare uploads do
        String originalName = org.springframework.util.StringUtils.cleanPath(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "");
        if (originalName.contains("..")) throw new BadRequestException("Path traversal attempt detected.");
        String extension = getExtension(originalName);
        String storedName = UUID.randomUUID() + extension;

        try {
            Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            Path target = dir.resolve(storedName);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file. Please try again.", e);
        }

        TicketAttachment attachment = TicketAttachment.builder()
                .ticket(ticket)
                .uploadedBy(uploader)
                .originalName(file.getOriginalFilename())
                .storedName(storedName)
                .fileSize(file.getSize())
                .contentType(contentType)
                .build();

        return attachmentRepository.save(attachment);
    }

    public Path loadFile(String storedName) {
        // Validate no path traversal
        Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path file = dir.resolve(storedName).normalize();
        if (!file.startsWith(dir)) {
            throw new BadRequestException("Invalid file path.");
        }
        if (!Files.exists(file)) {
            throw new ResourceNotFoundException("File not found.");
        }
        return file;
    }

    @Transactional
    public WelfareAttachment storeWelfareFile(Long caseId, MultipartFile file, User uploader) {
        if (file.isEmpty()) throw new BadRequestException("File is empty.");
        if (file.getSize() > maxSizeBytes) {
            throw new BadRequestException("File size exceeds maximum limit.");
        }
        if (file.getContentType() == null || !ALLOWED_TYPES.contains(file.getContentType())) {
            throw new BadRequestException("File type not allowed. Permitted: PDF, images, Word, text.");
        }

        WelfareCase wc = welfareCaseRepository.findById(caseId)
                .orElseThrow(() -> new ResourceNotFoundException("Welfare case not found."));

        try {
            Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);

            String originalName = org.springframework.util.StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown");
            if (originalName.contains("..")) throw new BadRequestException("Path traversal attempt detected.");

            String storedName = UUID.randomUUID().toString() + getExtension(originalName);
            Path targetLocation = dir.resolve(storedName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            WelfareAttachment attachment = WelfareAttachment.builder()
                    .welfareCase(wc)
                    .uploadedBy(uploader)
                    .fileName(originalName)
                    .storedName(storedName)
                    .fileSize(file.getSize())
                    .contentType(file.getContentType())
                    .build();

            return welfareAttachmentRepository.save(attachment);

        } catch (IOException ex) {
            throw new RuntimeException("Could not store file. Please try again!", ex);
        }
    }

    @Transactional
    public void deleteWelfareFile(WelfareAttachment attachment) {
        try {
            Path file = loadFile(attachment.getStoredName());
            Files.deleteIfExists(file);
        } catch (Exception e) {
            // Log it, but don't fail the DB deletion if file is already gone
        }
        welfareAttachmentRepository.delete(attachment);
    }

    @Transactional
    public void deleteFile(TicketAttachment attachment) {
        try {
            Path file = loadFile(attachment.getStoredName());
            Files.deleteIfExists(file);
        } catch (Exception e) {
            // Log it, but don't fail the DB deletion if file is already gone
        }
        attachmentRepository.delete(attachment);
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf("."));
    }
}
