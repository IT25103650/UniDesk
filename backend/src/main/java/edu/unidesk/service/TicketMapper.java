package edu.unidesk.service;

import edu.unidesk.dto.ticket.CommentResponse;
import edu.unidesk.dto.ticket.TicketResponse;
import edu.unidesk.model.Ticket;
import edu.unidesk.model.TicketComment;
import edu.unidesk.model.User;
import edu.unidesk.model.enums.Priority;
import edu.unidesk.model.enums.Role;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Common ticket access-control rule and response mapping, shared by the
 * ticket-domain services so it's defined once rather than duplicated.
 */
@Component
public class TicketMapper {

    public void assertCanView(Ticket ticket, User user) {
        Role role = user.getRole();
        // WELFARE_OFFICER has zero access to regular tickets — they only see welfare cases
        if (role == Role.WELFARE_OFFICER) throw new AccessDeniedException("Welfare officers cannot access regular tickets.");
        if (role == Role.ADMIN || role == Role.HELP_DESK_OFFICER) return;
        if (role == Role.STUDENT && ticket.getStudent().getId().equals(user.getId())) return;
        if (role == Role.DEPARTMENT_STAFF && ticket.getDepartment() != null
                && user.getDepartment() != null
                && ticket.getDepartment().getId().equals(user.getDepartment().getId())) return;
        throw new AccessDeniedException("You do not have access to this ticket.");
    }

    /** Calculate due date based on priority. */
    public LocalDateTime calculateDueDate(Priority priority) {
        return switch (priority) {
            case HIGH, URGENT -> LocalDateTime.now().plusDays(1);
            case NORMAL -> LocalDateTime.now().plusDays(3);
            case LOW -> LocalDateTime.now().plusDays(7);
        };
    }

    public TicketResponse toResponse(Ticket t) {
        return new TicketResponse(
                t.getId(), t.getReferenceNo(), t.getSubject(), t.getDescription(),
                t.getStatus(), t.getPriority(),
                t.getCategory().getId(), t.getCategory().getName(),
                t.getDepartment() != null ? t.getDepartment().getId() : null,
                t.getDepartment() != null ? t.getDepartment().getName() : null,
                t.getStudent().getId(), t.getStudent().getFullName(),
                t.getStudent().getEmail(),
                t.getStudent().getPhone(),
                t.getStudent().getStudentId(),
                t.getAssignedTo() != null ? t.getAssignedTo().getId() : null,
                t.getAssignedTo() != null ? t.getAssignedTo().getFullName() : null,
                t.getCreatedAt(), t.getUpdatedAt(), t.getResolvedAt(),
                t.getIsDraft(), t.getFeedbackRating(), t.getFeedbackComment(),
                t.getDueDate(),
                t.getResolutionNote(),
                t.getResolutionNoteBy() != null ? t.getResolutionNoteBy().getId() : null,
                t.getResolutionNoteBy() != null ? t.getResolutionNoteBy().getFullName() : null,
                t.getResolutionNoteAt()
        );
    }

    public CommentResponse toCommentResponse(TicketComment c) {
        return new CommentResponse(
                c.getId(), c.getTicket().getId(),
                c.getAuthor().getId(), c.getAuthor().getFullName(),
                c.getAuthor().getRole().name(),
                c.getBody(), c.getIsInternal(), c.getCreatedAt(), c.getUpdatedAt()
        );
    }
}
