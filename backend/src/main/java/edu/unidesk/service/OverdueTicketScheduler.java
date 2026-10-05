package edu.unidesk.service;

import edu.unidesk.model.Ticket;
import edu.unidesk.model.User;
import edu.unidesk.model.enums.Priority;
import edu.unidesk.model.enums.TicketStatus;
import edu.unidesk.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled job that runs every hour to:
 * 1. Flag overdue tickets (past due date, not resolved/closed)
 *    → Sends OVERDUE_REMINDER notification to the student and assigned staff.
 * 2. Escalate stale tickets (no activity for 5+ days)
 *    → Bumps priority to HIGH if currently NORMAL/LOW.
 *
 * IEEE 730 §7.4 — automated monitoring and escalation for SLA compliance.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OverdueTicketScheduler {

    private final TicketRepository ticketRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    /** Stale threshold — tickets with no update for this many days get escalated. */
    private static final int STALE_DAYS = 5;

    /** Runs every hour. */
    @Scheduled(fixedRate = 3600000)
    @Transactional
    public void checkOverdueAndEscalate() {
        flagOverdueTickets();
        escalateStaleTickets();
    }

    private void flagOverdueTickets() {
        List<Ticket> overdue = ticketRepository.findOverdueTickets(LocalDateTime.now());
        LocalDateTime cutoff = LocalDateTime.now().minusHours(24);

        for (Ticket ticket : overdue) {
            // Already reminded about this ticket within the last 24 hours — skip.
            if (ticket.getOverdueNotifiedAt() != null && ticket.getOverdueNotifiedAt().isAfter(cutoff)) {
                continue;
            }

            if (ticket.getStudent() != null) {
                notificationService.send(ticket.getStudent(),
                        "Overdue Ticket Reminder",
                        "Your ticket " + ticket.getReferenceNo() + " is past its due date.",
                        "/tickets/" + ticket.getId(),
                        "OVERDUE_REMINDER");
            }

            if (ticket.getAssignedTo() != null) {
                notificationService.send(ticket.getAssignedTo(),
                        "Overdue Ticket",
                        "Ticket " + ticket.getReferenceNo() + " is overdue and requires attention.",
                        "/department/tickets/" + ticket.getId(),
                        "OVERDUE_REMINDER");
            }

            ticketRepository.markOverdueNotified(ticket.getId(), LocalDateTime.now());
        }

        if (!overdue.isEmpty()) {
            log.info("Overdue check: {} ticket(s) flagged as overdue.", overdue.size());
        }
    }

    private void escalateStaleTickets() {
        LocalDateTime threshold = LocalDateTime.now().minusDays(STALE_DAYS);
        List<Ticket> stale = ticketRepository.findStaleTickets(threshold);

        for (Ticket ticket : stale) {
            // Escalate priority if currently NORMAL or LOW
            if (ticket.getPriority() == Priority.NORMAL || ticket.getPriority() == Priority.LOW) {
                Priority oldPriority = ticket.getPriority();
                ticket.setPriority(Priority.HIGH);
                ticketRepository.save(ticket);

                auditLogService.log(null, "TICKET_ESCALATED", "TICKET", ticket.getId(),
                        "Auto-escalated from " + oldPriority + " to HIGH (no activity for " + STALE_DAYS + " days)",
                        "SYSTEM");

                // Notify assigned staff
                if (ticket.getAssignedTo() != null) {
                    notificationService.send(ticket.getAssignedTo(),
                            "Ticket Escalated",
                            "Ticket " + ticket.getReferenceNo() + " has been automatically escalated to HIGH priority due to inactivity.",
                            "/department/tickets/" + ticket.getId(),
                            "TICKET_ESCALATED");
                }

                // Also notify the student so they are aware of the escalation
                if (ticket.getStudent() != null) {
                    notificationService.send(ticket.getStudent(),
                            "Ticket Escalated",
                            "Your ticket " + ticket.getReferenceNo() + " has been escalated to HIGH priority due to inactivity. Our team will prioritise it shortly.",
                            "/tickets/" + ticket.getId(),
                            "TICKET_ESCALATED");
                }
            }
        }

        if (!stale.isEmpty()) {
            log.info("Escalation check: {} stale ticket(s) evaluated.", stale.size());
        }
    }
}
