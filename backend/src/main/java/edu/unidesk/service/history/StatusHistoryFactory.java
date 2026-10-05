package edu.unidesk.service.history;

import edu.unidesk.model.Ticket;
import edu.unidesk.model.TicketStatusHistory;
import edu.unidesk.model.User;
import edu.unidesk.model.WelfareCase;
import edu.unidesk.model.WelfareStatusHistory;

/**
 * Factory Pattern — the single place that creates status-history (audit trail) entries.
 * Used across the ticket submission, help-desk triage, department handling and welfare
 * modules, so every module records status changes the same way instead of repeating
 * the builder code.
 *
 * Singleton Pattern — the factory holds no state, so the whole application shares
 * one instance: private constructor, private static instance, public static getInstance().
 */
public class StatusHistoryFactory {

    private static StatusHistoryFactory instance;

    private StatusHistoryFactory() {}

    public static synchronized StatusHistoryFactory getInstance() {
        if (instance == null) {
            instance = new StatusHistoryFactory();
        }
        return instance;
    }

    /** Creates a history entry for a support ticket. oldStatus is null for a newly submitted ticket. */
    public TicketStatusHistory createTicketHistory(Ticket ticket, User changedBy,
                                                   String oldStatus, String newStatus, String note) {
        return TicketStatusHistory.builder()
                .ticket(ticket)
                .changedBy(changedBy)
                .oldStatus(oldStatus)
                .newStatus(newStatus)
                .note(note)
                .build();
    }

    /** Creates a history entry for a welfare case. oldStatus is null for a newly submitted case. */
    public WelfareStatusHistory createWelfareHistory(WelfareCase welfareCase, User changedBy,
                                                     String oldStatus, String newStatus, String note) {
        return WelfareStatusHistory.builder()
                .welfareCase(welfareCase)
                .changedBy(changedBy)
                .oldStatus(oldStatus)
                .newStatus(newStatus)
                .note(note)
                .build();
    }
}
