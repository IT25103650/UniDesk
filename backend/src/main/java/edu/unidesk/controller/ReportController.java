package edu.unidesk.controller;

import edu.unidesk.model.enums.Priority;
import edu.unidesk.model.enums.Role;
import edu.unidesk.model.enums.TicketStatus;
import edu.unidesk.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/reports")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGEMENT')")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(reportService.getDashboardStats());
    }

    @GetMapping("/tickets-by-department")
    public ResponseEntity<List<Map<String, Object>>> getTicketsByDepartment(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        LocalDate fromDate = from != null ? LocalDate.parse(from) : null;
        LocalDate toDate = to != null ? LocalDate.parse(to) : null;
        return ResponseEntity.ok(reportService.getTicketsByDepartment(fromDate, toDate));
    }

    @GetMapping("/tickets-by-category")
    public ResponseEntity<List<Map<String, Object>>> getTicketsByCategory(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        LocalDate fromDate = from != null ? LocalDate.parse(from) : null;
        LocalDate toDate = to != null ? LocalDate.parse(to) : null;
        return ResponseEntity.ok(reportService.getTicketsByCategory(fromDate, toDate));
    }

    @GetMapping("/open-vs-resolved")
    public ResponseEntity<Map<String, Long>> openVsResolved() {
        return ResponseEntity.ok(reportService.getOpenVsResolved());
    }

    @GetMapping("/trends")
    public ResponseEntity<List<Map<String, Object>>> trends(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        LocalDate fromDate = from != null ? LocalDate.parse(from) : LocalDate.now().minusDays(30);
        LocalDate toDate = to != null ? LocalDate.parse(to) : LocalDate.now();
        return ResponseEntity.ok(reportService.getTicketTrends(fromDate, toDate));
    }

    @GetMapping("/export-csv")
    public ResponseEntity<String> exportCsv(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) Long departmentId) {
        LocalDate fromDate = from != null ? LocalDate.parse(from) : LocalDate.now().minusDays(90);
        LocalDate toDate = to != null ? LocalDate.parse(to) : LocalDate.now();
        TicketStatus statusEnum = (status != null && !status.isBlank()) ? TicketStatus.valueOf(status.toUpperCase()) : null;
        Priority priorityEnum = (priority != null && !priority.isBlank()) ? Priority.valueOf(priority.toUpperCase()) : null;
        String csv = reportService.exportTicketsCsv(fromDate, toDate, statusEnum, priorityEnum, departmentId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"tickets-report.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }

    /** Filtered account listing report — a plain export, not analytics. */
    @GetMapping("/export-users-csv")
    public ResponseEntity<String> exportUsersCsv(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String search) {
        Role roleEnum = (role != null && !role.isBlank()) ? Role.valueOf(role.toUpperCase()) : null;
        String searchTerm = (search != null && !search.isBlank()) ? search.trim() : null;
        String csv = reportService.exportUsersCsv(roleEnum, searchTerm);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"users-report.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }

    @GetMapping("/export/pdf")
    public ResponseEntity<byte[]> exportTicketsPdf(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        LocalDate fromDate = from != null ? LocalDate.parse(from) : LocalDate.now().minusDays(90);
        LocalDate toDate = to != null ? LocalDate.parse(to) : LocalDate.now();
        byte[] pdf = reportService.exportTicketsPdf(fromDate, toDate);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"tickets-report.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping("/export/excel")
    public ResponseEntity<byte[]> exportTicketsExcel(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        LocalDate fromDate = from != null ? LocalDate.parse(from) : LocalDate.now().minusDays(90);
        LocalDate toDate = to != null ? LocalDate.parse(to) : LocalDate.now();
        byte[] excel = reportService.exportTicketsExcel(fromDate, toDate);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"tickets-report.xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excel);
    }

    @GetMapping("/staff-performance")
    public ResponseEntity<List<Map<String, Object>>> getStaffPerformance(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        LocalDate fromDate = from != null ? LocalDate.parse(from) : null;
        LocalDate toDate = to != null ? LocalDate.parse(to) : null;
        return ResponseEntity.ok(reportService.getStaffPerformance(fromDate, toDate));
    }

    @GetMapping("/speed-analytics")
    public ResponseEntity<Map<String, Object>> getSpeedAnalytics(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        LocalDate fromDate = from != null ? LocalDate.parse(from) : null;
        LocalDate toDate = to != null ? LocalDate.parse(to) : null;
        return ResponseEntity.ok(reportService.getSpeedAnalytics(fromDate, toDate));
    }

    @GetMapping("/department-speed")
    public ResponseEntity<List<Map<String, Object>>> getDepartmentSpeed(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        LocalDate fromDate = from != null ? LocalDate.parse(from) : null;
        LocalDate toDate = to != null ? LocalDate.parse(to) : null;
        return ResponseEntity.ok(reportService.getDepartmentSpeedBenchmark(fromDate, toDate));
    }

    @GetMapping("/export-staff-csv")
    public ResponseEntity<String> exportStaffCsv(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        LocalDate fromDate = from != null ? LocalDate.parse(from) : LocalDate.now().minusDays(90);
        LocalDate toDate = to != null ? LocalDate.parse(to) : LocalDate.now();
        String csv = reportService.exportStaffPerformanceCsv(fromDate, toDate);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"staff-performance-report.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }
}
