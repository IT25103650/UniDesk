package edu.unidesk.service;

import edu.unidesk.exception.BadRequestException;

/**
 * Length checks for free-text fields that arrive in plain Map request bodies
 * (no DTO, so no @Size annotation). Keeps text within its database column so a
 * long value returns a clean 400 instead of a database error.
 */
public final class TextLimits {

    /** Text that is stored inside a status-history note (column limit 500, minus the prefix we add). */
    public static final int HISTORY_NOTE = 400;
    /** Matches the 5000-character limit on creating a comment. */
    public static final int LONG_TEXT = 5000;
    /** Ticket.feedback_comment column length. */
    public static final int FEEDBACK = 1000;

    private TextLimits() {}

    public static void check(String value, int max, String fieldName) {
        if (value != null && value.trim().length() > max) {
            throw new BadRequestException(fieldName + " must be " + max + " characters or fewer.");
        }
    }
}
