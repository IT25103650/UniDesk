package edu.unidesk.service;

import edu.unidesk.dto.welfare.*;
import edu.unidesk.exception.BadRequestException;
import edu.unidesk.exception.ResourceNotFoundException;
import edu.unidesk.model.*;
import edu.unidesk.model.enums.Role;
import edu.unidesk.model.enums.WelfareStatus;
import edu.unidesk.repository.*;
import edu.unidesk.service.history.StatusHistoryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

/**
 * WelfareService — COMPLETELY ISOLATED from TicketService and TicketRepository.
 *
 * This service ONLY injects welfare-related repositories:
 *   - WelfareCaseRepository
 *   - WelfareCommentRepository
 *   - WelfareStatusHistoryRepository
 *
 * It does NOT inject TicketRepository, TicketCommentRepository, etc.
 *
 * Access control (IEEE Code of Ethics §1 — welfare data privacy):
 *   - Students: own cases only
 *   - Welfare Officers: all cases
 *   - Admins: all cases
 *   - Help Desk Officers: DENIED at @PreAuthorize on controller
 *   - Department Staff: DENIED at @PreAuthorize on controller
 */
@Service
@RequiredArgsConstructor
public class WelfareService {

    private final WelfareCaseRepository welfareCaseRepository;
    private final WelfareCommentRepository commentRepository;
    private final WelfareStatusHistoryRepository statusHistoryRepository;
    private final WelfareAttachmentRepository attachmentRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    private synchronized String generateReferenceNo() {
        long count = welfareCaseRepository.count() + 1;
        String candidate = String.format("WEL-%06d", count);
        while (welfareCaseRepository.findByReferenceNo(candidate).isPresent()) {
            count++;
            candidate = String.format("WEL-%06d", count);
        }
        return candidate;
    }

    @Transactional
    public WelfareCaseResponse createCase(CreateWelfareCaseRequest request, User student, String ip) {
        String refNo = generateReferenceNo();

        WelfareCase wc = WelfareCase.builder()
                .referenceNo(refNo)
                .student(student)
                .subject(request.subject().trim())
                .description(request.description().trim())
                .status(WelfareStatus.NEW)
                .isUrgent(false)
                .build();

        wc = welfareCaseRepository.save(wc);

        statusHistoryRepository.save(StatusHistoryFactory.getInstance().createWelfareHistory(
                wc, student,
                null, WelfareStatus.NEW.name(),
                "Welfare case submitted"));

        auditLogService.log(student, "WELFARE_CASE_CREATED", "WELFARE_CASE", wc.getId(),
                "Case created: " + refNo, ip);

        // Notify the student their case was received
        notificationService.send(student,
                "Welfare Case Submitted",
                "Your welfare case " + refNo + " has been submitted and is under review.",
                "/student/welfare/" + wc.getId(),
                "WELFARE_UPDATED");

        // Notify ALL Welfare Officers a new case needs attention
        notificationService.sendToRole(
                edu.unidesk.model.enums.Role.WELFARE_OFFICER,
                "New Welfare Case",
                "A new welfare case " + refNo + " has been submitted by " + student.getFullName() + " and requires attention.",
                "/welfare/cases/" + wc.getId(),
                "WELFARE_UPDATED");

        return toResponse(wc);
    }

    public Page<WelfareCaseResponse> getMyCases(Long studentId, Pageable pageable) {
        return welfareCaseRepository.findByStudentId(studentId, pageable).map(this::toResponse);
    }

    public Page<WelfareCaseResponse> getAllCases(WelfareStatus status, Boolean isUrgent, Pageable pageable) {
        return welfareCaseRepository.findAllWithFilters(status, isUrgent, pageable).map(this::toResponse);
    }

    public WelfareCaseResponse getCaseById(Long id, User requester) {
        WelfareCase wc = welfareCaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Welfare case #" + id + " not found."));
        assertCanAccess(wc, requester);
        return toResponse(wc);
    }

    @Transactional
    public WelfareCaseResponse updateStatus(Long id, String newStatusStr, String note, User actor, String ip) {
        TextLimits.check(note, TextLimits.HISTORY_NOTE, "Note");
        WelfareCase wc = welfareCaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Welfare case not found."));

        if (wc.getStatus() == WelfareStatus.CLOSED) {
            throw new BadRequestException("This welfare case is closed/archived and its status can no longer be changed.");
        }

        WelfareStatus newStatus;
        try {
            newStatus = WelfareStatus.valueOf(newStatusStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid status: " + newStatusStr);
        }

        String oldStatus = wc.getStatus().name();
        wc.setStatus(newStatus);
        if (newStatus == WelfareStatus.RESOLVED) {
            wc.setResolvedAt(LocalDateTime.now());
        }
        welfareCaseRepository.save(wc);

        statusHistoryRepository.save(StatusHistoryFactory.getInstance().createWelfareHistory(
                wc, actor,
                oldStatus, newStatus.name(),
                note));

        auditLogService.log(actor, "WELFARE_STATUS_CHANGED", "WELFARE_CASE", wc.getId(),
                oldStatus + " → " + newStatus.name(), ip);

        notificationService.send(wc.getStudent(),
                "Welfare Case Updated",
                "Your welfare case " + wc.getReferenceNo() + " status changed to " + newStatus.name(),
                "/welfare/" + wc.getId(),
                "WELFARE_UPDATED");

        return toResponse(wc);
    }

    /**
     * Archive/close a welfare case — never a hard-delete. Reuses the existing CLOSED status
     * rather than introducing a new one. Messages, notes, and files are never touched, so
     * confidentiality and history remain fully intact; the case simply leaves the active list.
     */
    @Transactional
    public WelfareCaseResponse archiveCase(Long id, String note, User actor, String ip) {
        TextLimits.check(note, TextLimits.HISTORY_NOTE, "Note");
        WelfareCase wc = welfareCaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Welfare case not found."));

        if (wc.getStatus() == WelfareStatus.CLOSED) {
            throw new BadRequestException("This welfare case is already closed/archived.");
        }

        String oldStatus = wc.getStatus().name();
        wc.setStatus(WelfareStatus.CLOSED);
        if (wc.getResolvedAt() == null) {
            wc.setResolvedAt(LocalDateTime.now());
        }
        welfareCaseRepository.save(wc);

        statusHistoryRepository.save(StatusHistoryFactory.getInstance().createWelfareHistory(
                wc, actor,
                oldStatus, WelfareStatus.CLOSED.name(),
                note != null && !note.isBlank() ? note : "Case archived/closed"));

        auditLogService.log(actor, "WELFARE_CASE_ARCHIVED", "WELFARE_CASE", wc.getId(),
                "Welfare case archived/closed", ip);

        notificationService.send(wc.getStudent(),
                "Welfare Case Closed",
                "Your welfare case " + wc.getReferenceNo() + " has been closed.",
                "/welfare/" + wc.getId(),
                "WELFARE_UPDATED");

        return toResponse(wc);
    }

    @Transactional
    public WelfareCaseResponse setUrgent(Long id, boolean urgent, User actor, String ip) {
        WelfareCase wc = welfareCaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Welfare case not found."));

        wc.setIsUrgent(urgent);
        welfareCaseRepository.save(wc);

        auditLogService.log(actor, "WELFARE_URGENT_FLAG", "WELFARE_CASE", wc.getId(),
                "Urgent flag set to: " + urgent, ip);

        return toResponse(wc);
    }

    @Transactional
    public WelfareCaseResponse assignCase(Long id, Long officerId, User actor, String ip) {
        WelfareCase wc = welfareCaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Welfare case not found."));

        User officer = userRepository.findById(officerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));

        if (officer.getRole() != Role.WELFARE_OFFICER) {
            throw new BadRequestException("Can only assign welfare cases to Welfare Officers.");
        }

        wc.setAssignedTo(officer);
        welfareCaseRepository.save(wc);

        auditLogService.log(actor, "WELFARE_CASE_ASSIGNED", "WELFARE_CASE", wc.getId(),
                "Assigned to: " + officer.getEmail(), ip);

        return toResponse(wc);
    }

    @Transactional
    public WelfareCommentResponse addComment(Long caseId, AddWelfareCommentRequest request, User author) {
        WelfareCase wc = welfareCaseRepository.findById(caseId)
                .orElseThrow(() -> new ResourceNotFoundException("Welfare case not found."));
        assertCanAccess(wc, author);

        // Students can never post internal (confidential) notes
        boolean internal = Boolean.TRUE.equals(request.internal()) && author.getRole() != Role.STUDENT;

        WelfareComment comment = commentRepository.save(WelfareComment.builder()
                .welfareCase(wc)
                .author(author)
                .body(request.body().trim())
                .isInternal(internal)
                .build());

        if (!internal && !author.getId().equals(wc.getStudent().getId())) {
            notificationService.send(wc.getStudent(),
                    "New Message on Your Welfare Case",
                    "A welfare officer has replied to your case " + wc.getReferenceNo(),
                    "/welfare/" + wc.getId(),
                    "WELFARE_REPLIED");
        }

        return toCommentResponse(comment);
    }

    public List<WelfareCommentResponse> getComments(Long caseId, User requester) {
        WelfareCase wc = welfareCaseRepository.findById(caseId)
                .orElseThrow(() -> new ResourceNotFoundException("Welfare case not found."));
        assertCanAccess(wc, requester);

        List<WelfareComment> comments = requester.getRole() == Role.STUDENT
                ? commentRepository.findByCaseIdAndIsInternalFalseOrderByCreatedAtAsc(caseId)
                : commentRepository.findByCaseIdOrderByCreatedAtAsc(caseId);

        return comments.stream().map(this::toCommentResponse).toList();
    }

    public List<WelfareStatusHistory> getStatusHistory(Long caseId, User requester) {
        WelfareCase wc = welfareCaseRepository.findById(caseId)
                .orElseThrow(() -> new ResourceNotFoundException("Welfare case not found."));
        assertCanAccess(wc, requester);
        return statusHistoryRepository.findByCaseIdOrderByChangedAtAsc(caseId);
    }

    public List<WelfareAttachment> getAttachments(Long caseId, User user) {
        WelfareCase wc = welfareCaseRepository.findById(caseId)
                .orElseThrow(() -> new ResourceNotFoundException("Welfare case not found."));
        assertCanAccess(wc, user);
        return attachmentRepository.findByWelfareCaseId(caseId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Welfare officer deletes their own confidential/internal note (Module 4 Delete).
     * Public messages to the student cannot be deleted, to keep the conversation record intact.
     */
    @Transactional
    public void deleteComment(Long caseId, Long commentId, User actor, String ip) {
        WelfareCase wc = welfareCaseRepository.findById(caseId)
                .orElseThrow(() -> new ResourceNotFoundException("Welfare case not found."));
        assertCanAccess(wc, actor);

        WelfareComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Note not found."));
        if (!comment.getWelfareCase().getId().equals(caseId)) {
            throw new ResourceNotFoundException("Note not found on this welfare case.");
        }
        if (!Boolean.TRUE.equals(comment.getIsInternal())) {
            throw new BadRequestException("Only internal notes can be deleted. Messages to the student are kept.");
        }
        if (!comment.getAuthor().getId().equals(actor.getId())) {
            throw new AccessDeniedException("You can only delete your own internal notes.");
        }

        commentRepository.delete(comment);
        auditLogService.log(actor, "WELFARE_INTERNAL_NOTE_DELETED", "WELFARE_CASE", caseId,
                "Internal note deleted (note #" + commentId + ")", ip);
    }

    private void assertCanAccess(WelfareCase wc, User user) {
        Role role = user.getRole();
        if (role == Role.WELFARE_OFFICER) return;
        if (role == Role.STUDENT && wc.getStudent().getId().equals(user.getId())) return;
        // Everyone else — including ADMIN — is DENIED. Welfare case content is
        // confidential and stays inside the welfare officer / owning student
        // trust boundary regardless of administrative privilege.
        throw new AccessDeniedException("You do not have access to welfare cases.");
    }

    private WelfareCaseResponse toResponse(WelfareCase wc) {
        return new WelfareCaseResponse(
                wc.getId(), wc.getReferenceNo(), wc.getSubject(), wc.getDescription(),
                wc.getStatus(), wc.getIsUrgent(),
                wc.getStudent().getId(), wc.getStudent().getFullName(),
                wc.getStudent().getEmail(),
                wc.getStudent().getPhone(),
                wc.getStudent().getStudentId(),
                wc.getAssignedTo() != null ? wc.getAssignedTo().getId() : null,
                wc.getAssignedTo() != null ? wc.getAssignedTo().getFullName() : null,
                wc.getCreatedAt(), wc.getUpdatedAt(), wc.getResolvedAt()
        );
    }

    private WelfareCommentResponse toCommentResponse(WelfareComment c) {
        return new WelfareCommentResponse(
                c.getId(), c.getWelfareCase().getId(),
                c.getAuthor().getId(), c.getAuthor().getFullName(),
                c.getAuthor().getRole().name(),
                c.getBody(), c.getIsInternal(), c.getCreatedAt()
        );
    }
}
