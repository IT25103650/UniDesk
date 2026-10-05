package edu.unidesk.service;

import edu.unidesk.dto.ticket.AddTriageNoteRequest;
import edu.unidesk.dto.ticket.TicketResponse;
import edu.unidesk.dto.ticket.TriageNoteResponse;
import edu.unidesk.dto.ticket.AddTicketTagRequest;
import edu.unidesk.dto.ticket.TicketTagResponse;
import edu.unidesk.exception.BadRequestException;
import edu.unidesk.exception.ConflictException;
import edu.unidesk.exception.ResourceNotFoundException;
import edu.unidesk.model.Department;
import edu.unidesk.model.Ticket;
import edu.unidesk.model.TicketStatusHistory;
import edu.unidesk.model.TicketTriageNote;
import edu.unidesk.model.TicketTag;
import edu.unidesk.model.User;
import edu.unidesk.model.enums.Priority;
import edu.unidesk.model.enums.Role;
import edu.unidesk.model.enums.TicketStatus;
import edu.unidesk.repository.DepartmentRepository;
import edu.unidesk.repository.TicketRepository;
import edu.unidesk.repository.TicketStatusHistoryRepository;
import edu.unidesk.repository.TicketTriageNoteRepository;
import edu.unidesk.repository.TicketTagRepository;
import edu.unidesk.repository.UserRepository;
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
 * Ticket Triage & Assignment — Help Desk Officer service.
 * Handles the help-desk-wide ticket queue, assignment/forwarding/priority,
 * staff-approved reopen, and triage notes (a dedicated internal-note thread
 * for routing decisions, kept separate from the department reply thread).
 */
@Service
@RequiredArgsConstructor
public class TicketTriageService {

    private final TicketRepository ticketRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final TicketStatusHistoryRepository statusHistoryRepository;
    private final TicketTriageNoteRepository triageNoteRepository;
    private final TicketTagRepository tagRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final TicketMapper mapper;

    /** Help Desk / Admin — all tickets with enhanced filters. */
    public Page<TicketResponse> getAllTickets(TicketStatus status, Priority priority,
                                              Long departmentId, Long categoryId,
                                              LocalDateTime dateFrom, LocalDateTime dateTo,
                                              String search, Pageable pageable) {
        return ticketRepository.findAllWithFilters(status, priority, departmentId, categoryId,
                dateFrom, dateTo, search, pageable)
                .map(mapper::toResponse);
    }

    @Transactional
    public TicketResponse updatePriority(Long id, String priorityStr, User actor, String ip) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));

        Priority priority;
        try {
            priority = Priority.valueOf(priorityStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid priority value: " + priorityStr);
        }

        ticket.setPriority(priority);
        ticket.setDueDate(mapper.calculateDueDate(priority));
        ticketRepository.save(ticket);
        auditLogService.log(actor, "TICKET_PRIORITY_CHANGED", "TICKET", ticket.getId(),
                "Priority set to " + priority.name(), ip);
        return mapper.toResponse(ticket);
    }

    @Transactional
    public TicketResponse assignTicket(Long id, Long departmentId, Long assignedToId, User actor, String ip) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));

        Department dept = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found."));
        if (!Boolean.TRUE.equals(dept.getActive())) {
            throw new BadRequestException("Cannot assign a ticket to a disabled department.");
        }

        String oldStatus = ticket.getStatus().name();
        ticket.setDepartment(dept);

        if (assignedToId != null) {
            User assignee = userRepository.findById(assignedToId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found."));
            ticket.setAssignedTo(assignee);
        }

        if (ticket.getStatus() == TicketStatus.NEW) {
            ticket.setStatus(TicketStatus.ASSIGNED);
        }

        ticketRepository.save(ticket);

        String note = "Assigned to department: " + dept.getName()
                + (ticket.getAssignedTo() != null ? " (staff: " + ticket.getAssignedTo().getFullName() + ")" : "");
        statusHistoryRepository.save(StatusHistoryFactory.getInstance().createTicketHistory(
                ticket, actor,
                oldStatus, ticket.getStatus().name(),
                note));

        auditLogService.log(actor, "TICKET_ASSIGNED", "TICKET", ticket.getId(), note, ip);

        // Notify department staff (or the specific assignee)
        if (ticket.getAssignedTo() != null) {
            notificationService.send(ticket.getAssignedTo(),
                    "Ticket Assigned",
                    "Ticket " + ticket.getReferenceNo() + " has been assigned to you.",
                    "/department/tickets/" + ticket.getId(),
                    "TICKET_ASSIGNED");
        }

        return mapper.toResponse(ticket);
    }

    /**
     * Help Desk removes a department/staff assignment and returns the ticket to the
     * unassigned help-desk queue. Distinct from forwardTicket (which moves the ticket to
     * a different department) — this clears assignment entirely.
     */
    @Transactional
    public TicketResponse unassignTicket(Long id, String reason, User actor, String ip) {
        TextLimits.check(reason, TextLimits.HISTORY_NOTE, "Reason");
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));

        if (ticket.getDepartment() == null && ticket.getAssignedTo() == null) {
            throw new BadRequestException("This ticket is not currently assigned.");
        }
        if (ticket.getStatus() == TicketStatus.RESOLVED || ticket.getStatus() == TicketStatus.CLOSED
                || ticket.getStatus() == TicketStatus.CANCELLED) {
            throw new BadRequestException("Only an active ticket can be unassigned.");
        }

        String oldStatus = ticket.getStatus().name();
        String oldDeptName = ticket.getDepartment() != null ? ticket.getDepartment().getName() : "unassigned";
        User previousAssignee = ticket.getAssignedTo();

        ticket.setDepartment(null);
        ticket.setAssignedTo(null);
        ticket.setStatus(TicketStatus.NEW);
        ticketRepository.save(ticket);

        String note = "Unassigned from department: " + oldDeptName
                + (reason != null && !reason.isBlank() ? " — " + reason.trim() : "");
        statusHistoryRepository.save(StatusHistoryFactory.getInstance().createTicketHistory(
                ticket, actor,
                oldStatus, TicketStatus.NEW.name(),
                note));

        auditLogService.log(actor, "TICKET_UNASSIGNED", "TICKET", ticket.getId(), note, ip);

        if (previousAssignee != null) {
            notificationService.send(previousAssignee,
                    "Ticket Unassigned From You",
                    "Ticket " + ticket.getReferenceNo() + " has been unassigned and returned to the help desk queue.",
                    "/tickets/" + ticket.getId(),
                    null);
        }

        return mapper.toResponse(ticket);
    }

    @Transactional
    public TicketResponse forwardTicket(Long id, Long newDepartmentId, String reason, User actor, String ip) {
        TextLimits.check(reason, TextLimits.HISTORY_NOTE, "Reason");
        if (reason == null || reason.isBlank()) {
            throw new BadRequestException("A reason is required when forwarding a ticket.");
        }

        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));
        mapper.assertCanView(ticket, actor);

        Department newDept = departmentRepository.findById(newDepartmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found."));
        if (!Boolean.TRUE.equals(newDept.getActive())) {
            throw new BadRequestException("Cannot forward a ticket to a disabled department.");
        }

        String oldDept = ticket.getDepartment() != null ? ticket.getDepartment().getName() : "None";
        ticket.setDepartment(newDept);
        ticket.setAssignedTo(null);
        ticketRepository.save(ticket);

        // Log the transfer with reason in status history
        String note = "Forwarded from " + oldDept + " to " + newDept.getName() + ". Reason: " + reason.trim();

        statusHistoryRepository.save(StatusHistoryFactory.getInstance().createTicketHistory(
                ticket, actor,
                ticket.getStatus().name(), ticket.getStatus().name(),
                note));

        auditLogService.log(actor, "TICKET_FORWARDED", "TICKET", ticket.getId(),
                note, ip);

        // Notify the student that their ticket has been forwarded
        notificationService.send(ticket.getStudent(),
                "Ticket Forwarded",
                "Your ticket " + ticket.getReferenceNo() + " has been forwarded to " + newDept.getName() + ".",
                "/tickets/" + ticket.getId(),
                "TICKET_FORWARDED");

        return mapper.toResponse(ticket);
    }

    @Transactional
    public TicketResponse reopenTicket(Long id, User actor, String ip) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));

        if (ticket.getStatus() != TicketStatus.RESOLVED && ticket.getStatus() != TicketStatus.CLOSED) {
            throw new BadRequestException("Only RESOLVED or CLOSED tickets can be reopened.");
        }

        String old = ticket.getStatus().name();
        ticket.setStatus(TicketStatus.IN_PROGRESS);
        ticket.setResolvedAt(null);
        ticketRepository.save(ticket);

        statusHistoryRepository.save(StatusHistoryFactory.getInstance().createTicketHistory(
                ticket, actor,
                old, TicketStatus.IN_PROGRESS.name(),
                "Ticket reopened"));

        auditLogService.log(actor, "TICKET_REOPENED", "TICKET", ticket.getId(),
                old + " → IN_PROGRESS", ip);

        return mapper.toResponse(ticket);
    }

    /**
     * Help Desk / Admin triage note — independent of the ticket_comments thread used
     * by department staff's reply/internal-note workflow. Lets a triager record
     * assignment reasoning without it appearing in the department-facing comment feed.
     */
    @Transactional
    public TriageNoteResponse addTriageNote(Long ticketId, AddTriageNoteRequest request, User author, String ip) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));
        mapper.assertCanView(ticket, author);

        TicketTriageNote note = triageNoteRepository.save(TicketTriageNote.builder()
                .ticket(ticket)
                .author(author)
                .note(request.note().trim())
                .build());

        auditLogService.log(author, "TICKET_TRIAGE_NOTE_ADDED", "TICKET", ticketId,
                "Triage note added (note #" + note.getId() + ")", ip);

        return toTriageNoteResponse(note);
    }

    public List<TriageNoteResponse> getTriageNotes(Long ticketId, User requester) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));
        mapper.assertCanView(ticket, requester);
        return triageNoteRepository.findByTicketIdOrderByCreatedAtDesc(ticketId).stream()
                .map(this::toTriageNoteResponse)
                .toList();
    }

    @Transactional
    public void deleteTriageNote(Long ticketId, Long noteId, User actor, String ip) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));
        mapper.assertCanView(ticket, actor);

        TicketTriageNote note = triageNoteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Triage note not found."));
        if (!note.getTicket().getId().equals(ticketId)) {
            throw new ResourceNotFoundException("Triage note not found on this ticket.");
        }
        if (!note.getAuthor().getId().equals(actor.getId()) && actor.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("You can only delete your own triage notes.");
        }

        triageNoteRepository.delete(note);
        auditLogService.log(actor, "TICKET_TRIAGE_NOTE_DELETED", "TICKET", ticketId,
                "Triage note deleted (note #" + noteId + ")", ip);
    }

    // ── Ticket tags (Module 2) ─────────────────────────────────────────

    /** Maximum tags per ticket, so the label list stays readable. */
    private static final int MAX_TAGS_PER_TICKET = 10;

    @Transactional
    public TicketTagResponse addTag(Long ticketId, AddTicketTagRequest request, User actor, String ip) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));
        mapper.assertCanView(ticket, actor);

        String label = request.label().trim().replaceAll("\\s+", " ");
        if (tagRepository.existsByTicketIdAndLabelIgnoreCase(ticketId, label)) {
            throw new ConflictException("This ticket already has the tag \"" + label + "\".");
        }
        if (tagRepository.countByTicketId(ticketId) >= MAX_TAGS_PER_TICKET) {
            throw new BadRequestException("A ticket can have at most " + MAX_TAGS_PER_TICKET + " tags.");
        }

        TicketTag tag = tagRepository.save(TicketTag.builder()
                .ticket(ticket)
                .label(label)
                .addedBy(actor)
                .build());
        auditLogService.log(actor, "TICKET_TAG_ADDED", "TICKET", ticketId, "Tag added: " + label, ip);
        return toTagResponse(tag);
    }

    public List<TicketTagResponse> getTags(Long ticketId, User requester) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));
        mapper.assertCanView(ticket, requester);
        return tagRepository.findByTicketIdOrderByCreatedAtAsc(ticketId).stream()
                .map(this::toTagResponse)
                .toList();
    }

    @Transactional
    public void deleteTag(Long ticketId, Long tagId, User actor, String ip) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));
        mapper.assertCanView(ticket, actor);

        TicketTag tag = tagRepository.findById(tagId)
                .orElseThrow(() -> new ResourceNotFoundException("Tag not found."));
        if (!tag.getTicket().getId().equals(ticketId)) {
            throw new ResourceNotFoundException("Tag not found on this ticket.");
        }

        tagRepository.delete(tag);
        auditLogService.log(actor, "TICKET_TAG_REMOVED", "TICKET", ticketId, "Tag removed: " + tag.getLabel(), ip);
    }

    private TicketTagResponse toTagResponse(TicketTag t) {
        return new TicketTagResponse(t.getId(), t.getTicket().getId(), t.getLabel(),
                t.getAddedBy() != null ? t.getAddedBy().getFullName() : null, t.getCreatedAt());
    }

    private TriageNoteResponse toTriageNoteResponse(TicketTriageNote n) {
        return new TriageNoteResponse(
                n.getId(), n.getTicket().getId(), n.getAuthor().getId(),
                n.getAuthor().getFullName(), n.getNote(), n.getCreatedAt());
    }
}
