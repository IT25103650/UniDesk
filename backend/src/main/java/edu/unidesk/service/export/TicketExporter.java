package edu.unidesk.service.export;

import edu.unidesk.model.Ticket;

import java.time.LocalDate;
import java.util.List;

/**
 * Factory Pattern — common product interface.
 * Every report format implements this, so callers only depend on the interface.
 */
public interface TicketExporter {
    byte[] export(List<Ticket> tickets, LocalDate from, LocalDate to);
}
