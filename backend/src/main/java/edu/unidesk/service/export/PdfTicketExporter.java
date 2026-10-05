package edu.unidesk.service.export;

import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import edu.unidesk.model.Ticket;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.List;

/**
 * Factory Pattern — concrete product: PDF ticket report.
 * Singleton Pattern — stateless, so one shared instance serves every export.
 */
public class PdfTicketExporter implements TicketExporter {

    private static PdfTicketExporter instance;

    private PdfTicketExporter() {}

    public static synchronized PdfTicketExporter getInstance() {
        if (instance == null) {
            instance = new PdfTicketExporter();
        }
        return instance;
    }

    @Override
    public byte[] export(List<Ticket> tickets, LocalDate from, LocalDate to) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate());
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Paragraph title = new Paragraph("Tickets Report (" + from + " to " + to + ")", titleFont);
            title.setAlignment(Paragraph.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            PdfPTable table = new PdfPTable(7);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1.5f, 3f, 1.5f, 1.5f, 2f, 2f, 1.5f});

            Font headFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD);
            String[] headers = {"Reference", "Subject", "Status", "Priority", "Department", "Student", "Created"};
            for (String header : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(header, headFont));
                cell.setBackgroundColor(Color.LIGHT_GRAY);
                cell.setHorizontalAlignment(PdfPCell.ALIGN_CENTER);
                table.addCell(cell);
            }

            Font rowFont = FontFactory.getFont(FontFactory.HELVETICA);
            for (Ticket t : tickets) {
                table.addCell(new Phrase(t.getReferenceNo(), rowFont));
                table.addCell(new Phrase(t.getSubject(), rowFont));
                table.addCell(new Phrase(t.getStatus().name(), rowFont));
                table.addCell(new Phrase(t.getPriority().name(), rowFont));
                table.addCell(new Phrase(t.getDepartment() != null ? t.getDepartment().getName() : "Unassigned", rowFont));
                table.addCell(new Phrase(t.getStudent() != null ? t.getStudent().getFullName() : "", rowFont));
                table.addCell(new Phrase(t.getCreatedAt().toLocalDate().toString(), rowFont));
            }

            document.add(table);
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error generating PDF", e);
        }
    }
}
