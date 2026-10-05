package edu.unidesk.service;

import edu.unidesk.dto.ticket.*;
import edu.unidesk.exception.BadRequestException;
import edu.unidesk.exception.ResourceNotFoundException;
import edu.unidesk.model.*;
import edu.unidesk.model.enums.Priority;
import edu.unidesk.model.enums.Role;
import edu.unidesk.model.enums.TicketStatus;
import edu.unidesk.repository.*;
import edu.unidesk.service.history.StatusHistoryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;

/**
 * Ticket Submission & Tracking — student-facing ticket service.
 * Handles ticket creation/drafts, withdrawal, feedback, and the student's own
 * read access to a ticket's comments/history/attachments.
 *
 * This service NEVER references WelfareCaseRepository or WelfareCase entities
 * (IEEE Code of Ethics §1 — welfare data isolation enforced at service layer).
 */
@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final TicketCommentRepository commentRepository;
    private final TicketAttachmentRepository attachmentRepository;
    private final TicketStatusHistoryRepository statusHistoryRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final TicketMapper mapper;

    private synchronized String generateReferenceNo() {
        long count = ticketRepository.count() + 1;
        int currentYear = Year.now().getValue();
        String candidate = String.format("TKT-%d-%04d", currentYear, count);
        while (ticketRepository.findByReferenceNo(candidate).isPresent()) {
            count++;
            candidate = String.format("TKT-%d-%04d", currentYear, count);
        }
        return candidate;
    }

    @Transactional
    public TicketResponse createTicket(CreateTicketRequest request, User student, String ipAddress) {
        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found."));
        assertCategoryUsable(category);

        String refNo = generateReferenceNo();

        Ticket ticket = Ticket.builder()
                .referenceNo(refNo)
                .student(student)
                .category(category)
                .department(category.getDepartment())
                .subject(request.subject().trim())
                .description(request.description().trim())
                .status(TicketStatus.NEW)
                .priority(Priority.NORMAL)
                .dueDate(mapper.calculateDueDate(Priority.NORMAL))
                .build();

        ticket = ticketRepository.save(ticket);

        statusHistoryRepository.save(StatusHistoryFactory.getInstance().createTicketHistory(
                ticket, student,
                null, TicketStatus.NEW.name(),
                "Ticket submitted"));

        auditLogService.log(student, "TICKET_CREATED", "TICKET", ticket.getId(),
                "Ticket created: " + refNo, ipAddress);

        notificationService.send(student,
                "Ticket Submitted",
                "Your ticket " + refNo + " has been submitted and is awaiting triage.",
                "/tickets/" + ticket.getId(),
                "TICKET_CREATED");

        // Notify ALL Help Desk Officers that a new ticket needs triage
        notificationService.sendToRole(
                edu.unidesk.model.enums.Role.HELP_DESK_OFFICER,
                "New Ticket Requires Triage",
                "A new ticket " + refNo + " has been submitted by " + student.getFullName() + " and requires triage.",
                "/helpdesk/tickets/" + ticket.getId(),
                "TICKET_CREATED");

        return mapper.toResponse(ticket);
    }

    /** Save a ticket as draft (not yet submitted). */
    @Transactional
    public TicketResponse saveDraft(CreateTicketRequest request, User student) {
        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found."));
        assertCategoryUsable(category);
        assertValidContent(request.subject(), request.description());

        String refNo = generateReferenceNo();

        Ticket ticket = Ticket.builder()
                .referenceNo(refNo)
                .student(student)
                .category(category)
                .subject(request.subject().trim())
                .description(request.description().trim())
                .status(TicketStatus.NEW)
                .priority(Priority.NORMAL)
                .isDraft(true)
                .build();

        ticket = ticketRepository.save(ticket);
        return mapper.toResponse(ticket);
    }

    /** Category and its department must both be active for a ticket or draft to use it. */
    private void assertCategoryUsable(Category category) {
        if (category == null) {
            throw new BadRequestException("Category is required.");
        }
        if (!Boolean.TRUE.equals(category.getActive())) {
            throw new BadRequestException("This category is no longer available.");
        }
        if (category.getDepartment() != null && !Boolean.TRUE.equals(category.getDepartment().getActive())) {
            throw new BadRequestException("This category's department is no longer available.");
        }
    }

    /** Same rules as CreateTicketRequest's bean validation, for paths where it doesn't run. */
    private void assertValidContent(String subject, String description) {
        int subjectLen = subject == null ? 0 : subject.trim().length();
        if (subjectLen < 5 || subjectLen > 300) {
            throw new BadRequestException("Subject must be between 5 and 300 characters.");
        }
        if (description == null || description.trim().length() < 10) {
            throw new BadRequestException("Please provide at least 10 characters of description.");
        }
    }

    /** Submit a previously saved draft. */
    @Transactional
    public TicketResponse submitDraft(Long id, User student, String ip) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));

        if (!ticket.getStudent().getId().equals(student.getId())) {
            throw new AccessDeniedException("Not your ticket.");
        }
        if (!Boolean.TRUE.equals(ticket.getIsDraft())) {
            throw new BadRequestException("This ticket is not a draft.");
        }
        // Re-checked on submit: the category may have been disabled since the draft was saved,
        // and drafts saved before draft validation existed may not meet the content rules.
        assertCategoryUsable(ticket.getCategory());
        assertValidContent(ticket.getSubject(), ticket.getDescription());

        ticket.setIsDraft(false);
        ticket.setDueDate(mapper.calculateDueDate(ticket.getPriority()));
        ticketRepository.save(ticket);

        statusHistoryRepository.save(StatusHistoryFactory.getInstance().createTicketHistory(
                ticket, student,
                null, TicketStatus.NEW.name(),
                "Draft submitted"));

        auditLogService.log(student, "TICKET_CREATED", "TICKET", ticket.getId(),
                "Draft submitted: " + ticket.getReferenceNo(), ip);

        notificationService.send(student,
                "Ticket Submitted",
                "Your ticket " + ticket.getReferenceNo() + " has been submitted and is awaiting triage.",
                "/tickets/" + ticket.getId(),
                "TICKET_CREATED");

        // Notify ALL Help Desk Officers that a new ticket needs triage
        notificationService.sendToRole(
                edu.unidesk.model.enums.Role.HELP_DESK_OFFICER,
                "New Ticket Requires Triage",
                "A new ticket " + ticket.getReferenceNo() + " has been submitted by " + student.getFullName() + " and requires triage.",
                "/helpdesk/tickets/" + ticket.getId(),
                "TICKET_CREATED");

        return mapper.toResponse(ticket);
    }

    /**
     * Permanently delete a draft ticket. Only the owning student may delete it, and only
     * while it is still a draft — once submitted, use {@link #withdrawTicket} instead.
     * Child rows (comments/history) cascade at the DB level; attachment files, if any,
     * must be removed by the caller (controller) via FileStorageService before this runs.
     */
    @Transactional
    public void deleteDraft(Long id, User student, String ip) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));

        if (!ticket.getStudent().getId().equals(student.getId())) {
            throw new AccessDeniedException("Not your ticket.");
        }
        if (!Boolean.TRUE.equals(ticket.getIsDraft())) {
            throw new BadRequestException("Only draft tickets can be deleted. Use withdraw for a submitted ticket.");
        }

        String refNo = ticket.getReferenceNo();
        ticketRepository.delete(ticket);

        auditLogService.log(student, "TICKET_DRAFT_DELETED", "TICKET", id,
                "Draft deleted: " + refNo, ip);
    }

    /**
     * Student withdraws a submitted ticket they no longer need actioned. Distinct from
     * staff-driven CLOSED: this is student-initiated and only allowed while the ticket is
     * still active (not yet resolved/closed, and not already withdrawn).
     */
    @Transactional
    public TicketResponse withdrawTicket(Long id, String reason, User student, String ip) {
        TextLimits.check(reason, TextLimits.HISTORY_NOTE, "Reason");
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));

        if (!ticket.getStudent().getId().equals(student.getId())) {
            throw new AccessDeniedException("Not your ticket.");
        }
        if (Boolean.TRUE.equals(ticket.getIsDraft())) {
            throw new BadRequestException("Draft tickets should be deleted, not withdrawn.");
        }
        if (ticket.getStatus() != TicketStatus.NEW && ticket.getStatus() != TicketStatus.ASSIGNED
                && ticket.getStatus() != TicketStatus.IN_PROGRESS) {
            throw new BadRequestException("Only an active (not yet resolved/closed) ticket can be withdrawn.");
        }

        String oldStatus = ticket.getStatus().name();
        ticket.setStatus(TicketStatus.CANCELLED);
        ticketRepository.save(ticket);

        String note = "Withdrawn by student" + (reason != null && !reason.isBlank() ? ": " + reason.trim() : "");
        statusHistoryRepository.save(StatusHistoryFactory.getInstance().createTicketHistory(
                ticket, student,
                oldStatus, TicketStatus.CANCELLED.name(),
                note));

        auditLogService.log(student, "TICKET_WITHDRAWN", "TICKET", ticket.getId(), note, ip);

        if (ticket.getAssignedTo() != null) {
            notificationService.send(ticket.getAssignedTo(),
                    "Ticket Withdrawn",
                    "Ticket " + ticket.getReferenceNo() + " was withdrawn by the student.",
                    "/department/tickets/" + ticket.getId(),
                    null);
        }

        return mapper.toResponse(ticket);
    }

    /** Student submits feedback/rating on a resolved ticket. */
    @Transactional
    public TicketResponse submitFeedback(Long id, int rating, String comment, User student) {
        TextLimits.check(comment, TextLimits.FEEDBACK, "Feedback comment");
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));

        if (!ticket.getStudent().getId().equals(student.getId())) {
            throw new AccessDeniedException("Not your ticket.");
        }
        if (ticket.getStatus() != TicketStatus.RESOLVED && ticket.getStatus() != TicketStatus.CLOSED) {
            throw new BadRequestException("Feedback can only be given on resolved or closed tickets.");
        }
        if (rating < 1 || rating > 5) {
            throw new BadRequestException("Rating must be between 1 and 5.");
        }

        ticket.setFeedbackRating(rating);
        ticket.setFeedbackComment(comment != null ? comment.trim() : null);
        ticketRepository.save(ticket);
        return mapper.toResponse(ticket);
    }

    /** Student view — own tickets only. */
    public Page<TicketResponse> getMyTickets(Long studentId, Pageable pageable) {
        return ticketRepository.findByStudentId(studentId, pageable).map(mapper::toResponse);
    }

    /** Student My Tickets with optional status filter. */
    public Page<TicketResponse> getMyTicketsWithStatus(Long studentId, TicketStatus status, Pageable pageable) {
        return ticketRepository.findByStudentIdWithStatus(studentId, status, pageable).map(mapper::toResponse);
    }

    public TicketResponse getTicketById(Long id, User requester) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket #" + id + " not found."));

        mapper.assertCanView(ticket, requester);
        return mapper.toResponse(ticket);
    }

    /** Student requests reopen of a closed/resolved ticket. */
    @Transactional
    public TicketResponse requestReopen(Long id, String reason, User student) {
        TextLimits.check(reason, TextLimits.HISTORY_NOTE, "Reason");
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));

        if (!ticket.getStudent().getId().equals(student.getId())) {
            throw new AccessDeniedException("Not your ticket.");
        }
        if (ticket.getStatus() != TicketStatus.RESOLVED && ticket.getStatus() != TicketStatus.CLOSED) {
            throw new BadRequestException("Only RESOLVED or CLOSED tickets can be reopened.");
        }

        // Add a reopen request comment
        String commentBody = "🔄 **Reopen Requested**: " + (reason != null ? reason.trim() : "Student requested reopen.");
        commentRepository.save(TicketComment.builder()
                .ticket(ticket)
                .author(student)
                .body(commentBody)
                .isInternal(false)
                .build());

        // Track reopen request in status history for audit trail
        statusHistoryRepository.save(StatusHistoryFactory.getInstance().createTicketHistory(
                ticket, student,
                ticket.getStatus().name(), ticket.getStatus().name(),
                "Reopen requested: " + (reason != null ? reason.trim() : "Student requested reopen.")));

        // Notify the assigned staff member if there is one, otherwise every Help Desk Officer
        List<User> recipients = ticket.getAssignedTo() != null
                ? List.of(ticket.getAssignedTo())
                : userRepository.findByRole(Role.HELP_DESK_OFFICER);
        for (User recipient : recipients) {
            notificationService.send(recipient,
                    "Reopen Requested",
                    "Student requested reopen for ticket " + ticket.getReferenceNo(),
                    "/helpdesk/tickets/" + ticket.getId(),
                    "TICKET_REOPEN_REQUESTED");
        }

        return mapper.toResponse(ticket);
    }

    public List<CommentResponse> getComments(Long ticketId, User requester) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));
        mapper.assertCanView(ticket, requester);

        List<TicketComment> comments = requester.getRole() == Role.STUDENT
                ? commentRepository.findByTicketIdAndIsInternalFalseOrderByCreatedAtAsc(ticketId)
                : commentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId);

        return comments.stream().map(mapper::toCommentResponse).toList();
    }

    public List<TicketStatusHistory> getStatusHistory(Long ticketId, User requester) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));
        mapper.assertCanView(ticket, requester);
        return statusHistoryRepository.findByTicketIdOrderByChangedAtAsc(ticketId);
    }

    public List<TicketAttachment> getAttachments(Long ticketId, User requester) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));
        mapper.assertCanView(ticket, requester);
        return attachmentRepository.findByTicketId(ticketId);
    }
}
