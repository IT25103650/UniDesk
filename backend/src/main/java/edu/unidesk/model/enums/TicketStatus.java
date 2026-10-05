package edu.unidesk.model.enums;

public enum TicketStatus {
    NEW,
    ASSIGNED,
    IN_PROGRESS,
    RESOLVED,
    CLOSED,
    /** Student withdrew the ticket themselves — distinct from staff-driven CLOSED. */
    CANCELLED
}
