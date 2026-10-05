package edu.unidesk.service;

import edu.unidesk.dto.ticket.AddCommentRequest;
import edu.unidesk.dto.ticket.CommentResponse;
import edu.unidesk.dto.ticket.TicketResponse;
import edu.unidesk.dto.ticket.CreateReplyTemplateRequest;
import edu.unidesk.dto.ticket.ReplyTemplateResponse;
import edu.unidesk.exception.BadRequestException;
import edu.unidesk.exception.ConflictException;
import edu.unidesk.exception.ResourceNotFoundException;
import edu.unidesk.model.Department;
import edu.unidesk.model.DepartmentReplyTemplate;
import edu.unidesk.model.Ticket;
import edu.unidesk.model.TicketComment;
import edu.unidesk.model.TicketStatusHistory;
import edu.unidesk.model.User;
import edu.unidesk.model.enums.Role;
import edu.unidesk.model.enums.TicketStatus;
import edu.unidesk.repository.TicketCommentRepository;
import edu.unidesk.repository.TicketRepository;
import edu.unidesk.repository.TicketStatusHistoryRepository;
import edu.unidesk.repository.DepartmentReplyTemplateRepository;
import edu.unidesk.repository.DepartmentRepository;
import edu.unidesk.service.history.StatusHistoryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Department Response & Overdue Tracking — Department Staff service.
 * Handles the department-assigned ticket queue and archive, resolving/closing
 * tickets, structured resolution notes, and the reply/internal-note comment thread.
 * (Automated overdue-flagging/escalation is a scheduled job — see OverdueTicketScheduler.)
 */
@Service
@RequiredArgsConstructor
public class TicketDepartmentService {

    private final TicketRepository ticketRepository;
    private final TicketCommentRepository commentRepository;
    private final TicketStatusHistoryRepository statusHistoryRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final TicketMapper mapper;
    private final DepartmentReplyTemplateRepository templateRepository;
    private final DepartmentRepository departmentRepository;

    /** Department Staff — tickets assigned to their department. */
    public Page<TicketResponse> getTicketsByDepartment(Long departmentId, Pageable pageable) {
        return ticketRepository.findByDepartmentId(departmentId, pageable).map(mapper::toResponse);
    }

    /** Department tickets with optional status filter. */
    public Page<TicketResponse> getDeptTicketsWithStatus(Long deptId, TicketStatus status, Pageable pageable) {
        return ticketRepository.findByDepartmentIdWithStatus(deptId, status, pageable).map(mapper::toResponse);
    }

    /** Department tickets with advanced filters. */
    public Page<TicketResponse> getDeptTicketsAdvanced(Long deptId, TicketStatus status, Long categoryId,
                                                       String dateFromStr, String dateToStr, String search,
                                                       Pageable pageable) {
        LocalDateTime dateFrom = null;
        LocalDateTime dateTo = null;
        if (dateFromStr != null && !dateFromStr.isBlank()) {
            dateFrom = java.time.LocalDate.parse(dateFromStr).atStartOfDay();
        }
        if (dateToStr != null && !dateToStr.isBlank()) {
            dateTo = java.time.LocalDate.parse(dateToStr).atTime(23, 59, 59);
        }

        return ticketRepository.findAllWithFilters(status, null, deptId, categoryId,
                dateFrom, dateTo, search, pageable)
                .map(mapper::toResponse);
    }

    /** Department Staff — Resolved/Closed tickets previously handled by their own department. */
    public Page<TicketResponse> getDeptArchive(Long deptId, String search, Pageable pageable) {
        String normalizedSearch = (search != null && !search.isBlank()) ? search.trim() : null;
        return ticketRepository.findDeptArchive(deptId, normalizedSearch, pageable).map(mapper::toResponse);
    }

    @Transactional
    public TicketResponse updateStatus(Long id, String newStatusStr, String note, User actor, String ip) {
        TextLimits.check(note, TextLimits.HISTORY_NOTE, "Note");
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));
        mapper.assertCanView(ticket, actor);

        TicketStatus newStatus;
        try {
            newStatus = TicketStatus.valueOf(newStatusStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid status value: " + newStatusStr);
        }

        String oldStatus = ticket.getStatus().name();
        ticket.setStatus(newStatus);
        // A ticket closed directly (without passing through RESOLVED first) still needs a
        // resolution timestamp, otherwise it's silently excluded from resolution-time reporting.
        if ((newStatus == TicketStatus.RESOLVED || newStatus == TicketStatus.CLOSED)
                && ticket.getResolvedAt() == null) {
            ticket.setResolvedAt(LocalDateTime.now());
        }
        ticketRepository.save(ticket);

        statusHistoryRepository.save(StatusHistoryFactory.getInstance().createTicketHistory(
                ticket, actor,
                oldStatus, newStatus.name(),
                note));

        auditLogService.log(actor, "TICKET_STATUS_CHANGED", "TICKET", ticket.getId(),
                oldStatus + " → " + newStatus.name(), ip);

        // Notify the student
        String notifType = newStatus == TicketStatus.RESOLVED ? "TICKET_RESOLVED"
                : (newStatus == TicketStatus.CLOSED ? "TICKET_CLOSED" : null);

        notificationService.send(ticket.getStudent(),
                "Ticket Status Updated",
                "Your ticket " + ticket.getReferenceNo() + " is now " + newStatus.name(),
                "/tickets/" + ticket.getId(),
                notifType);

        return mapper.toResponse(ticket);
    }

    /**
     * Close/archive a resolved ticket — the logical delete-equivalent for finished tickets.
     * Reuses the existing CLOSED status rather than introducing a new one. Only a RESOLVED
     * ticket may be closed this way; history is never deleted, only appended to.
     */
    @Transactional
    public TicketResponse closeResolvedTicket(Long id, String note, User actor, String ip) {
        TextLimits.check(note, TextLimits.HISTORY_NOTE, "Note");
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));
        mapper.assertCanView(ticket, actor);

        if (ticket.getStatus() != TicketStatus.RESOLVED) {
            throw new BadRequestException("Only a resolved ticket can be closed/archived.");
        }

        ticket.setStatus(TicketStatus.CLOSED);
        if (ticket.getResolvedAt() == null) {
            ticket.setResolvedAt(LocalDateTime.now());
        }
        ticketRepository.save(ticket);

        statusHistoryRepository.save(StatusHistoryFactory.getInstance().createTicketHistory(
                ticket, actor,
                TicketStatus.RESOLVED.name(), TicketStatus.CLOSED.name(),
                note != null && !note.isBlank() ? note : "Closed/archived by staff"));

        auditLogService.log(actor, "TICKET_CLOSED", "TICKET", ticket.getId(),
                "Resolved ticket closed/archived", ip);

        notificationService.send(ticket.getStudent(),
                "Ticket Closed",
                "Your ticket " + ticket.getReferenceNo() + " has been closed.",
                "/tickets/" + ticket.getId(),
                "TICKET_CLOSED");

        return mapper.toResponse(ticket);
    }

    /**
     * Department staff records a structured Resolution Note summarizing how a resolved/closed
     * ticket was fixed. Distinct from the ordinary comment thread (a separate, dedicated field
     * on the ticket rather than another reply) and settable only once — call again to change
     * it, use a fresh resolve cycle instead, matching CREATE (not implicit-update) semantics.
     */
    @Transactional
    public TicketResponse addResolutionNote(Long id, String resolutionText, User actor, String ip) {
        TextLimits.check(resolutionText, TextLimits.LONG_TEXT, "Resolution note");
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));
        mapper.assertCanView(ticket, actor);

        if (resolutionText == null || resolutionText.isBlank()) {
            throw new BadRequestException("Resolution note cannot be empty.");
        }
        if (ticket.getStatus() != TicketStatus.RESOLVED && ticket.getStatus() != TicketStatus.CLOSED) {
            throw new BadRequestException("A resolution note can only be added to a resolved or closed ticket.");
        }
        if (ticket.getResolutionNote() != null) {
            throw new BadRequestException("This ticket already has a resolution note.");
        }

        ticket.setResolutionNote(resolutionText.trim());
        ticket.setResolutionNoteBy(actor);
        ticket.setResolutionNoteAt(LocalDateTime.now());
        ticketRepository.save(ticket);

        auditLogService.log(actor, "TICKET_RESOLUTION_NOTE_ADDED", "TICKET", ticket.getId(),
                "Resolution note added", ip);

        return mapper.toResponse(ticket);
    }

    @Transactional
    public CommentResponse addComment(Long ticketId, AddCommentRequest request, User author) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));
        mapper.assertCanView(ticket, author);

        if (ticket.getStatus() == TicketStatus.CLOSED) {
            throw new BadRequestException("This ticket is closed and no longer accepts comments.");
        }

        // Students cannot post internal comments
        boolean internal = request.internal() && author.getRole() != Role.STUDENT;

        TicketComment comment = commentRepository.save(TicketComment.builder()
                .ticket(ticket)
                .author(author)
                .body(request.body().trim())
                .isInternal(internal)
                .build());

        if (!internal && !author.getId().equals(ticket.getStudent().getId())) {
            notificationService.send(ticket.getStudent(),
                    "New Reply on Ticket",
                    "There is a new reply on your ticket " + ticket.getReferenceNo(),
                    "/tickets/" + ticket.getId(),
                    "TICKET_REPLIED");
        }

        return mapper.toCommentResponse(comment);
    }

    /**
     * Staff deletes their own internal note. Never permitted on a public reply, and never
     * on another staff member's note unless the actor is ADMIN (admin override policy).
     */
    @Transactional
    public void deleteComment(Long ticketId, Long commentId, User actor, String ip) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));
        mapper.assertCanView(ticket, actor);

        TicketComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found."));
        if (!comment.getTicket().getId().equals(ticketId)) {
            throw new ResourceNotFoundException("Comment not found on this ticket.");
        }
        if (!Boolean.TRUE.equals(comment.getIsInternal())) {
            throw new BadRequestException("Only internal notes can be deleted this way.");
        }
        if (!comment.getAuthor().getId().equals(actor.getId()) && actor.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("You can only delete your own internal notes.");
        }

        commentRepository.delete(comment);
        auditLogService.log(actor, "TICKET_INTERNAL_NOTE_DELETED", "TICKET", ticketId,
                "Internal note deleted (comment #" + commentId + ")", ip);
    }

    // ── Saved reply templates (Module 3) ───────────────────────────────

    /** Staff see their own department's templates; Admin sees every department's. */
    public List<ReplyTemplateResponse> getReplyTemplates(User requester) {
        List<DepartmentReplyTemplate> templates;
        if (requester.getRole() == Role.ADMIN) {
            templates = templateRepository.findAllByOrderByTitleAsc();
        } else {
            Department dept = requireDepartment(requester);
            templates = templateRepository.findByDepartmentIdOrderByTitleAsc(dept.getId());
        }
        return templates.stream().map(this::toTemplateResponse).toList();
    }

    @Transactional
    public ReplyTemplateResponse createReplyTemplate(CreateReplyTemplateRequest request, User actor, String ip) {
        Department dept = requireDepartment(actor);
        String title = request.title().trim();
        if (templateRepository.existsByDepartmentIdAndTitleIgnoreCase(dept.getId(), title)) {
            throw new ConflictException("Your department already has a template called \"" + title + "\".");
        }
        DepartmentReplyTemplate t = templateRepository.save(DepartmentReplyTemplate.builder()
                .department(dept)
                .title(title)
                .body(request.body().trim())
                .createdBy(actor)
                .build());
        auditLogService.log(actor, "REPLY_TEMPLATE_CREATED", "DEPARTMENT", dept.getId(),
                "Reply template created: " + title, ip);
        return toTemplateResponse(t);
    }

    /** Staff can delete templates in their own department; Admin can delete any. */
    @Transactional
    public void deleteReplyTemplate(Long templateId, User actor, String ip) {
        DepartmentReplyTemplate t = templateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Reply template not found."));
        if (actor.getRole() != Role.ADMIN) {
            Department dept = requireDepartment(actor);
            if (!t.getDepartment().getId().equals(dept.getId())) {
                throw new AccessDeniedException("You can only delete your own department's templates.");
            }
        }
        templateRepository.delete(t);
        auditLogService.log(actor, "REPLY_TEMPLATE_DELETED", "DEPARTMENT", t.getDepartment().getId(),
                "Reply template deleted: " + t.getTitle(), ip);
    }

    private Department requireDepartment(User user) {
        if (user.getDepartment() == null) {
            throw new BadRequestException("You must belong to a department to use reply templates.");
        }
        // Reload by id: the logged-in user is loaded before this request's session, so its lazy
        // department proxy can't be initialised here (reading only the id is safe).
        return departmentRepository.findById(user.getDepartment().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Department not found."));
    }

    private ReplyTemplateResponse toTemplateResponse(DepartmentReplyTemplate t) {
        return new ReplyTemplateResponse(t.getId(), t.getDepartment().getId(), t.getDepartment().getName(),
                t.getTitle(), t.getBody(),
                t.getCreatedBy() != null ? t.getCreatedBy().getId() : null,
                t.getCreatedBy() != null ? t.getCreatedBy().getFullName() : null,
                t.getCreatedAt());
    }

    /**
     * Staff edits their own internal note. Mirrors deleteComment's authorization exactly:
     * never permitted on a public reply, and never on another staff member's note unless
     * the actor is ADMIN. Students never see internal notes, before or after editing.
     */
    @Transactional
    public CommentResponse updateComment(Long ticketId, Long commentId, String newBody, User actor, String ip) {
        TextLimits.check(newBody, TextLimits.LONG_TEXT, "Note text");
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));
        mapper.assertCanView(ticket, actor);

        TicketComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found."));
        if (!comment.getTicket().getId().equals(ticketId)) {
            throw new ResourceNotFoundException("Comment not found on this ticket.");
        }
        if (!Boolean.TRUE.equals(comment.getIsInternal())) {
            throw new BadRequestException("Only internal notes can be edited this way.");
        }
        if (!comment.getAuthor().getId().equals(actor.getId()) && actor.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("You can only edit your own internal notes.");
        }
        if (newBody == null || newBody.isBlank()) {
            throw new BadRequestException("Note text cannot be empty.");
        }

        comment.setBody(newBody.trim());
        // Set explicitly rather than relying solely on @PreUpdate: that callback only fires
        // at flush time, which is after this method builds its response, so the immediate
        // API response would otherwise show a stale/null updatedAt even though the eventual
        // DB write is correct.
        comment.setUpdatedAt(LocalDateTime.now());
        comment = commentRepository.save(comment);

        auditLogService.log(actor, "TICKET_INTERNAL_NOTE_UPDATED", "TICKET", ticketId,
                "Internal note edited (comment #" + commentId + ")", ip);

        return mapper.toCommentResponse(comment);
    }
}
