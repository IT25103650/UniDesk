package edu.unidesk.service.export;

/**
 * Factory Pattern — decides which TicketExporter to create for a given format,
 * so ReportService never instantiates concrete exporter classes itself.
 *
 * Singleton Pattern — the factory is stateless, so the whole application shares
 * one instance: private constructor, private static instance, public static getInstance().
 */
public class TicketExporterFactory {

    private static TicketExporterFactory instance;

    private TicketExporterFactory() {}

    public static synchronized TicketExporterFactory getInstance() {
        if (instance == null) {
            instance = new TicketExporterFactory();
        }
        return instance;
    }

    public TicketExporter createExporter(String format) {
        if (format.equalsIgnoreCase("CSV")) {
            return CsvTicketExporter.getInstance();
        } else if (format.equalsIgnoreCase("PDF")) {
            return PdfTicketExporter.getInstance();
        } else if (format.equalsIgnoreCase("EXCEL")) {
            return ExcelTicketExporter.getInstance();
        }
        throw new IllegalArgumentException("Unknown export format: " + format);
    }
}
