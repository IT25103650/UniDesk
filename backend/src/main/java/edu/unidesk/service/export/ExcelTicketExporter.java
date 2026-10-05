package edu.unidesk.service.export;

import edu.unidesk.model.Ticket;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.List;

/**
 * Factory Pattern — concrete product: Excel (.xlsx) ticket report.
 * Singleton Pattern — stateless, so one shared instance serves every export.
 */
public class ExcelTicketExporter implements TicketExporter {

    private static ExcelTicketExporter instance;

    private ExcelTicketExporter() {}

    public static synchronized ExcelTicketExporter getInstance() {
        if (instance == null) {
            instance = new ExcelTicketExporter();
        }
        return instance;
    }

    @Override
    public byte[] export(List<Ticket> tickets, LocalDate from, LocalDate to) {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Tickets");

            // Header style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Header row
            Row header = sheet.createRow(0);
            String[] columns = {"Reference", "Subject", "Status", "Priority", "Category", "Department", "Student", "Created At", "Resolved At"};
            for (int i = 0; i < columns.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 5000);
            }

            // Data rows
            int rowNum = 1;
            for (Ticket t : tickets) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(t.getReferenceNo());
                row.createCell(1).setCellValue(t.getSubject());
                row.createCell(2).setCellValue(t.getStatus().name());
                row.createCell(3).setCellValue(t.getPriority().name());
                row.createCell(4).setCellValue(t.getCategory() != null ? t.getCategory().getName() : "");
                row.createCell(5).setCellValue(t.getDepartment() != null ? t.getDepartment().getName() : "Unassigned");
                row.createCell(6).setCellValue(t.getStudent() != null ? t.getStudent().getFullName() : "");
                row.createCell(7).setCellValue(t.getCreatedAt().toString());
                row.createCell(8).setCellValue(t.getResolvedAt() != null ? t.getResolvedAt().toString() : "");
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error generating Excel report", e);
        }
    }
}
