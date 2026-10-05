package edu.unidesk.service.export;

import edu.unidesk.model.Ticket;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

/**
 * Factory Pattern — concrete product: CSV ticket report.
 * Singleton Pattern — stateless, so one shared instance serves every export.
 */
public class CsvTicketExporter implements TicketExporter {

    private static CsvTicketExporter instance;

    private CsvTicketExporter() {}

    public static synchronized CsvTicketExporter getInstance() {
        if (instance == null) {
            instance = new CsvTicketExporter();
        }
        return instance;
    }

    @Override
    public byte[] export(List<Ticket> tickets, LocalDate from, LocalDate to) {
        StringBuilder sb = new StringBuilder();
        sb.append("Reference,Subject,Status,Priority,Category,Department,Student,Student Email,Created,Resolved\n");
        for (Ticket t : tickets) {
            sb.append(escape(t.getReferenceNo())).append(",");
            sb.append(escape(t.getSubject())).append(",");
            sb.append(t.getStatus()).append(",");
            sb.append(t.getPriority()).append(",");
            sb.append(escape(t.getCategory() != null ? t.getCategory().getName() : "")).append(",");
            sb.append(escape(t.getDepartment() != null ? t.getDepartment().getName() : "Unassigned")).append(",");
            sb.append(escape(t.getStudent() != null ? t.getStudent().getFullName() : "")).append(",");
            sb.append(escape(t.getStudent() != null ? t.getStudent().getEmail() : "")).append(",");
            sb.append(t.getCreatedAt()).append(",");
            sb.append(t.getResolvedAt() != null ? t.getResolvedAt() : "").append("\n");
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    public static String escape(String val) {
        if (val == null) return "";
        if (val.contains(",") || val.contains("\"") || val.contains("\n")) {
            return "\"" + val.replace("\"", "\"\"") + "\"";
        }
        return val;
    }
}
