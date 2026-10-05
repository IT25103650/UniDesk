package edu.unidesk.service;

import edu.unidesk.model.Ticket;
import edu.unidesk.model.enums.TicketStatus;
import edu.unidesk.model.enums.WelfareStatus;
import edu.unidesk.repository.TicketRepository;
import edu.unidesk.repository.UserRepository;
import edu.unidesk.repository.WelfareCaseRepository;
import edu.unidesk.service.export.CsvTicketExporter;
import edu.unidesk.service.export.TicketExporterFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import edu.unidesk.model.User;
import edu.unidesk.model.TicketComment;
import edu.unidesk.model.enums.Priority;
import edu.unidesk.model.enums.Role;
import edu.unidesk.repository.TicketCommentRepository;
import org.springframework.data.domain.Pageable;
import java.time.Duration;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final TicketRepository ticketRepository;
    private final WelfareCaseRepository welfareCaseRepository;
    private final UserRepository userRepository;
    private final TicketCommentRepository ticketCommentRepository;

    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalTickets", ticketRepository.count());
        stats.put("newTickets", ticketRepository.countByStatus(TicketStatus.NEW));
        stats.put("assignedTickets", ticketRepository.countByStatus(TicketStatus.ASSIGNED));
        stats.put("inProgressTickets", ticketRepository.countByStatus(TicketStatus.IN_PROGRESS));
        stats.put("resolvedTickets", ticketRepository.countByStatus(TicketStatus.RESOLVED));
        stats.put("closedTickets", ticketRepository.countByStatus(TicketStatus.CLOSED));
        stats.put("urgentTickets", ticketRepository.countByPriority(
                edu.unidesk.model.enums.Priority.URGENT));
        stats.put("ticketsLast30Days", ticketRepository.countCreatedSince(
                LocalDateTime.now().minusDays(30)));
        stats.put("totalWelfareCases", welfareCaseRepository.count());
        stats.put("urgentWelfareCases", welfareCaseRepository.countByIsUrgentTrue());
        stats.put("totalUsers", userRepository.count());
        stats.put("avgResolutionMinutes", ticketRepository.avgResolutionMinutes());
        return stats;
    }

    public List<Map<String, Object>> getTicketsByDepartment(LocalDate from, LocalDate to) {
        LocalDateTime fromDt = from != null ? from.atStartOfDay() : null;
        LocalDateTime toDt = to != null ? to.plusDays(1).atStartOfDay() : null;
        return ticketRepository.countByDepartment(fromDt, toDt).stream()
                .map(row -> Map.of("department", row[0], "count", row[1]))
                .toList();
    }

    public List<Map<String, Object>> getTicketsByCategory(LocalDate from, LocalDate to) {
        LocalDateTime fromDt = from != null ? from.atStartOfDay() : null;
        LocalDateTime toDt = to != null ? to.plusDays(1).atStartOfDay() : null;
        return ticketRepository.countByCategory(fromDt, toDt).stream()
                .map(row -> Map.of("category", row[0], "count", row[1]))
                .toList();
    }

    public Map<String, Long> getOpenVsResolved() {
        return Map.of(
                "open", ticketRepository.countByStatus(TicketStatus.NEW)
                        + ticketRepository.countByStatus(TicketStatus.ASSIGNED)
                        + ticketRepository.countByStatus(TicketStatus.IN_PROGRESS),
                "resolved", ticketRepository.countByStatus(TicketStatus.RESOLVED),
                "closed", ticketRepository.countByStatus(TicketStatus.CLOSED)
        );
    }

    /** Complaint trends â€” tickets grouped by day within a date range. */
    public List<Map<String, Object>> getTicketTrends(LocalDate from, LocalDate to) {
        LocalDateTime fromDt = from.atStartOfDay();
        LocalDateTime toDt = to.plusDays(1).atStartOfDay();

        List<Ticket> tickets = ticketRepository.findAll().stream()
                .filter(t -> t.getCreatedAt() != null
                        && !t.getCreatedAt().isBefore(fromDt)
                        && t.getCreatedAt().isBefore(toDt))
                .toList();

        Map<LocalDate, Long> grouped = tickets.stream()
                .collect(Collectors.groupingBy(
                        t -> t.getCreatedAt().toLocalDate(),
                        TreeMap::new,
                        Collectors.counting()));

        // Fill in gaps for days with 0 tickets
        List<Map<String, Object>> result = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            result.add(Map.of(
                    "date", d.toString(),
                    "count", grouped.getOrDefault(d, 0L)
            ));
        }
        return result;
    }

    /** Export tickets as CSV within a date range. */
    public String exportTicketsCsv(LocalDate from, LocalDate to) {
        return exportTicketsCsv(from, to, null, null, null);
    }

    /** Export tickets as CSV within a date range, optionally further filtered
     *  by status/priority/department — this is a filtered report, distinct
     *  from the analytics dashboards, meant to be handed off/archived as-is. */
    public String exportTicketsCsv(LocalDate from, LocalDate to, TicketStatus status, Priority priority, Long departmentId) {
        LocalDateTime fromDt = from.atStartOfDay();
        LocalDateTime toDt = to.plusDays(1).atStartOfDay();

        List<Ticket> tickets = ticketRepository.findAll().stream()
                .filter(t -> t.getCreatedAt() != null
                        && !t.getCreatedAt().isBefore(fromDt)
                        && t.getCreatedAt().isBefore(toDt))
                .filter(t -> status == null || t.getStatus() == status)
                .filter(t -> priority == null || t.getPriority() == priority)
                .filter(t -> departmentId == null
                        || (t.getDepartment() != null && departmentId.equals(t.getDepartment().getId())))
                .sorted(Comparator.comparing(Ticket::getCreatedAt))
                .toList();

        byte[] csv = TicketExporterFactory.getInstance()
                .createExporter("CSV")
                .export(tickets, from, to);
        return new String(csv, StandardCharsets.UTF_8);
    }

    /** Export all user accounts (optionally filtered by role/search) as a CSV
     *  report — a plain filtered account listing, not an analytics summary. */
    public String exportUsersCsv(Role role, String search) {
        List<User> users = userRepository.findWithFilters(role, search, Pageable.unpaged()).getContent();

        StringBuilder sb = new StringBuilder();
        sb.append("Full Name,Email,Role,Department,Phone,Student ID,Active,Email Verified,Created\n");
        for (User u : users) {
            sb.append(csvEscape(u.getFullName())).append(",");
            sb.append(csvEscape(u.getEmail())).append(",");
            sb.append(u.getRole()).append(",");
            sb.append(csvEscape(u.getDepartment() != null ? u.getDepartment().getName() : "")).append(",");
            sb.append(csvEscape(u.getPhone())).append(",");
            sb.append(csvEscape(u.getStudentId())).append(",");
            sb.append(Boolean.TRUE.equals(u.getActive()) ? "Yes" : "No").append(",");
            sb.append(Boolean.TRUE.equals(u.getEmailVerified()) ? "Yes" : "No").append(",");
            sb.append(u.getCreatedAt()).append("\n");
        }
        return sb.toString();
    }

    private String csvEscape(String val) {
        return CsvTicketExporter.escape(val);
    }

    /** Export tickets as PDF within a date range. */
    public byte[] exportTicketsPdf(LocalDate from, LocalDate to) {
        return TicketExporterFactory.getInstance()
                .createExporter("PDF")
                .export(findTicketsInRange(from, to), from, to);
    }

    /** Export tickets as Excel (.xlsx) within a date range. */
    public byte[] exportTicketsExcel(LocalDate from, LocalDate to) {
        return TicketExporterFactory.getInstance()
                .createExporter("EXCEL")
                .export(findTicketsInRange(from, to), from, to);
    }

    /** Tickets created within [from, to], oldest first. */
    private List<Ticket> findTicketsInRange(LocalDate from, LocalDate to) {
        LocalDateTime fromDt = from.atStartOfDay();
        LocalDateTime toDt = to.plusDays(1).atStartOfDay();
        return ticketRepository.findAll().stream()
                .filter(t -> t.getCreatedAt() != null
                        && !t.getCreatedAt().isBefore(fromDt)
                        && t.getCreatedAt().isBefore(toDt))
                .sorted(Comparator.comparing(Ticket::getCreatedAt))
                .toList();
    }

    /** Staff Performance Matrix */
    public List<Map<String, Object>> getStaffPerformance(LocalDate from, LocalDate to) {
        LocalDateTime fromDt = from != null ? from.atStartOfDay() : null;
        LocalDateTime toDt = to != null ? to.plusDays(1).atStartOfDay() : null;

        List<Ticket> tickets = ticketRepository.findAll().stream()
                .filter(t -> t.getCreatedAt() != null
                        && (fromDt == null || !t.getCreatedAt().isBefore(fromDt))
                        && (toDt == null || t.getCreatedAt().isBefore(toDt)))
                .toList();

        List<User> staffUsers = userRepository.findAll().stream()
                .filter(u -> u.getRole() != Role.STUDENT && Boolean.TRUE.equals(u.getActive()))
                .toList();

        List<Map<String, Object>> result = new ArrayList<>();

        for (User staff : staffUsers) {
            List<Ticket> assignedTickets = tickets.stream()
                    .filter(t -> t.getAssignedTo() != null && t.getAssignedTo().getId().equals(staff.getId()))
                    .toList();

            long totalAssigned = assignedTickets.size();
            long totalResolved = assignedTickets.stream()
                    .filter(t -> t.getStatus() == TicketStatus.RESOLVED || t.getStatus() == TicketStatus.CLOSED)
                    .count();
            long inProgress = assignedTickets.stream()
                    .filter(t -> t.getStatus() == TicketStatus.IN_PROGRESS)
                    .count();

            // Average resolution hours
            double totalResolutionHours = 0.0;
            int resolvedCount = 0;
            int slaMetCount = 0;

            for (Ticket t : assignedTickets) {
                if (t.getResolvedAt() != null && t.getCreatedAt() != null) {
                    long minutes = Duration.between(t.getCreatedAt(), t.getResolvedAt()).toMinutes();
                    totalResolutionHours += (minutes / 60.0);
                    resolvedCount++;

                    if (t.getDueDate() == null || !t.getResolvedAt().isAfter(t.getDueDate())) {
                        slaMetCount++;
                    }
                }
            }

            double avgResolutionHours = resolvedCount > 0 ? (totalResolutionHours / resolvedCount) : 0.0;
            double slaCompliancePct = resolvedCount > 0 ? ((slaMetCount * 100.0) / resolvedCount) : 100.0;

            // Student CSAT Rating
            List<Integer> ratings = assignedTickets.stream()
                    .map(Ticket::getFeedbackRating)
                    .filter(Objects::nonNull)
                    .toList();
            double avgRating = ratings.isEmpty() ? 0.0 : ratings.stream().mapToInt(Integer::intValue).average().orElse(0.0);

            // First Response Time: average duration between ticket creation and first comment by this staff
            double totalResponseHours = 0.0;
            int responseCount = 0;
            for (Ticket t : assignedTickets) {
                List<TicketComment> comments = ticketCommentRepository.findByTicketIdOrderByCreatedAtAsc(t.getId());
                for (TicketComment c : comments) {
                    if (c.getAuthor() != null && c.getAuthor().getId().equals(staff.getId())) {
                        long mins = Duration.between(t.getCreatedAt(), c.getCreatedAt()).toMinutes();
                        totalResponseHours += Math.max(0.2, mins / 60.0);
                        responseCount++;
                        break;
                    }
                }
            }
            Double avgFirstResponseHours = responseCount > 0 ? (totalResponseHours / responseCount) : null;

            String badge = "🟢 On Track";
            if (avgRating >= 4.5 || (totalResolved >= 3 && slaCompliancePct >= 90.0)) {
                badge = "⭐ Top Performer";
            } else if (totalAssigned == 0) {
                badge = "💤 Ready for Queue";
            } else if (slaCompliancePct < 75.0) {
                badge = "⚠️ Needs Support";
            }

            Map<String, Object> staffMap = new LinkedHashMap<>();
            staffMap.put("staffId", staff.getId());
            staffMap.put("staffName", staff.getFullName());
            staffMap.put("email", staff.getEmail());
            staffMap.put("role", staff.getRole().name());
            staffMap.put("departmentName", staff.getDepartment() != null ? staff.getDepartment().getName() : "Central Administration");
            staffMap.put("totalAssigned", totalAssigned);
            staffMap.put("totalResolved", totalResolved);
            staffMap.put("inProgress", inProgress);
            staffMap.put("avgResolutionHours", Math.round(avgResolutionHours * 10.0) / 10.0);
            staffMap.put("avgFirstResponseHours", avgFirstResponseHours != null
                    ? Math.round(avgFirstResponseHours * 10.0) / 10.0 : null);
            staffMap.put("avgRating", Math.round(avgRating * 10.0) / 10.0);
            staffMap.put("ratingCount", ratings.size());
            staffMap.put("slaCompliancePct", Math.round(slaCompliancePct));
            staffMap.put("performanceBadge", badge);

            List<Map<String, Object>> ticketSummaries = assignedTickets.stream()
                    .map(t -> {
                        Map<String, Object> tm = new LinkedHashMap<>();
                        tm.put("id", t.getId());
                        tm.put("referenceNo", t.getReferenceNo());
                        tm.put("subject", t.getSubject());
                        tm.put("status", t.getStatus().name());
                        tm.put("priority", t.getPriority().name());
                        tm.put("categoryName", t.getCategory() != null ? t.getCategory().getName() : "");
                        tm.put("studentName", t.getStudent() != null ? t.getStudent().getFullName() : "");
                        tm.put("studentId", t.getStudent() != null ? t.getStudent().getStudentId() : "");
                        tm.put("createdAt", t.getCreatedAt());
                        tm.put("resolvedAt", t.getResolvedAt());
                        tm.put("feedbackRating", t.getFeedbackRating());
                        tm.put("dueDate", t.getDueDate());
                        return tm;
                    })
                    .toList();
            staffMap.put("tickets", ticketSummaries);

            result.add(staffMap);
        }

        result.sort((a, b) -> Long.compare((Long) b.get("totalAssigned"), (Long) a.get("totalAssigned")));
        return result;
    }

    /** Ticket Responding Speed & SLA Distribution Analytics */
    public Map<String, Object> getSpeedAnalytics(LocalDate from, LocalDate to) {
        LocalDateTime fromDt = from != null ? from.atStartOfDay() : null;
        LocalDateTime toDt = to != null ? to.plusDays(1).atStartOfDay() : null;

        List<Ticket> tickets = ticketRepository.findAll().stream()
                .filter(t -> t.getCreatedAt() != null
                        && (fromDt == null || !t.getCreatedAt().isBefore(fromDt))
                        && (toDt == null || t.getCreatedAt().isBefore(toDt)))
                .toList();

        int totalAnalyzed = tickets.size();
        int frtUnder1h = 0;
        int frt1to4h = 0;
        int frt4to24h = 0;
        int frt24to48h = 0;
        int frtOver48h = 0;

        int resUnder24h = 0;
        int res1to3d = 0;
        int res3to7d = 0;
        int resOver7d = 0;

        int slaMetCount = 0;
        int slaBreachedCount = 0;
        double totalFrtHours = 0.0;
        int frtCalculated = 0;

        double totalResHours = 0.0;
        int resCalculated = 0;

        for (Ticket t : tickets) {
            // First response time calculation
            List<TicketComment> comments = ticketCommentRepository.findByTicketIdOrderByCreatedAtAsc(t.getId());
            TicketComment firstStaffComment = comments.stream()
                    .filter(c -> c.getAuthor() != null && c.getAuthor().getRole() != Role.STUDENT)
                    .findFirst().orElse(null);

            // No staff comment yet means no real first-response time to measure — excluded from the average.
            double frtHours = firstStaffComment != null
                    ? Math.max(0.1, Duration.between(t.getCreatedAt(), firstStaffComment.getCreatedAt()).toMinutes() / 60.0)
                    : 0.0;

            if (frtHours > 0) {
                totalFrtHours += frtHours;
                frtCalculated++;

                if (frtHours < 1.0) frtUnder1h++;
                else if (frtHours <= 4.0) frt1to4h++;
                else if (frtHours <= 24.0) frt4to24h++;
                else if (frtHours <= 48.0) frt24to48h++;
                else frtOver48h++;
            }

            // Resolution speed calculation
            if (t.getResolvedAt() != null) {
                double resHours = Math.max(1.0, Duration.between(t.getCreatedAt(), t.getResolvedAt()).toMinutes() / 60.0);
                totalResHours += resHours;
                resCalculated++;

                if (resHours <= 24.0) resUnder24h++;
                else if (resHours <= 72.0) res1to3d++;
                else if (resHours <= 168.0) res3to7d++;
                else resOver7d++;

                if (t.getDueDate() == null || !t.getResolvedAt().isAfter(t.getDueDate())) {
                    slaMetCount++;
                } else {
                    slaBreachedCount++;
                }
            } else if (t.getDueDate() != null && LocalDateTime.now().isAfter(t.getDueDate()) && t.getStatus() != TicketStatus.CLOSED) {
                slaBreachedCount++;
            }
        }

        Double avgFrtHours = frtCalculated > 0 ? (totalFrtHours / frtCalculated) : null;
        Double avgResHours = resCalculated > 0 ? (totalResHours / resCalculated) : null;
        int totalSlaEvaluated = slaMetCount + slaBreachedCount;
        Double overallSlaCompliance = totalSlaEvaluated > 0 ? ((slaMetCount * 100.0) / totalSlaEvaluated) : null;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalAnalyzed", totalAnalyzed);
        result.put("avgFirstResponseHours", avgFrtHours != null ? Math.round(avgFrtHours * 10.0) / 10.0 : null);
        result.put("avgResolutionHours", avgResHours != null ? Math.round(avgResHours * 10.0) / 10.0 : null);
        result.put("overallSlaCompliancePct", overallSlaCompliance != null ? Math.round(overallSlaCompliance * 10.0) / 10.0 : null);
        result.put("slaMetCount", slaMetCount);
        result.put("slaBreachedCount", slaBreachedCount);

        List<Map<String, Object>> frtBuckets = List.of(
                Map.of("label", "< 1 Hour", "count", frtUnder1h, "percentage", frtCalculated > 0 ? Math.round((frtUnder1h * 100.0) / frtCalculated) : 0),
                Map.of("label", "1 – 4 Hours", "count", frt1to4h, "percentage", frtCalculated > 0 ? Math.round((frt1to4h * 100.0) / frtCalculated) : 0),
                Map.of("label", "4 – 24 Hours", "count", frt4to24h, "percentage", frtCalculated > 0 ? Math.round((frt4to24h * 100.0) / frtCalculated) : 0),
                Map.of("label", "24 – 48 Hours", "count", frt24to48h, "percentage", frtCalculated > 0 ? Math.round((frt24to48h * 100.0) / frtCalculated) : 0),
                Map.of("label", "> 48 Hours", "count", frtOver48h, "percentage", frtCalculated > 0 ? Math.round((frtOver48h * 100.0) / frtCalculated) : 0)
        );
        result.put("firstResponseBuckets", frtBuckets);

        List<Map<String, Object>> resBuckets = List.of(
                Map.of("label", "Same Day (< 24h)", "count", resUnder24h, "percentage", resCalculated > 0 ? Math.round((resUnder24h * 100.0) / resCalculated) : 0),
                Map.of("label", "1 – 3 Days", "count", res1to3d, "percentage", resCalculated > 0 ? Math.round((res1to3d * 100.0) / resCalculated) : 0),
                Map.of("label", "3 – 7 Days", "count", res3to7d, "percentage", resCalculated > 0 ? Math.round((res3to7d * 100.0) / resCalculated) : 0),
                Map.of("label", "> 7 Days", "count", resOver7d, "percentage", resCalculated > 0 ? Math.round((resOver7d * 100.0) / resCalculated) : 0)
        );
        result.put("resolutionSpeedBuckets", resBuckets);

        return result;
    }

    /** Department Response & Resolution Speed Benchmark */
    public List<Map<String, Object>> getDepartmentSpeedBenchmark(LocalDate from, LocalDate to) {
        LocalDateTime fromDt = from != null ? from.atStartOfDay() : null;
        LocalDateTime toDt = to != null ? to.plusDays(1).atStartOfDay() : null;

        List<Ticket> tickets = ticketRepository.findAll().stream()
                .filter(t -> t.getCreatedAt() != null
                        && (fromDt == null || !t.getCreatedAt().isBefore(fromDt))
                        && (toDt == null || t.getCreatedAt().isBefore(toDt)))
                .toList();

        Map<String, List<Ticket>> grouped = tickets.stream()
                .collect(Collectors.groupingBy(
                        t -> t.getDepartment() != null ? t.getDepartment().getName() : "Central Help Desk",
                        LinkedHashMap::new,
                        Collectors.toList()));

        List<Map<String, Object>> result = new ArrayList<>();

        for (Map.Entry<String, List<Ticket>> entry : grouped.entrySet()) {
            String deptName = entry.getKey();
            List<Ticket> deptTickets = entry.getValue();

            int total = deptTickets.size();
            long resolved = deptTickets.stream()
                    .filter(t -> t.getStatus() == TicketStatus.RESOLVED || t.getStatus() == TicketStatus.CLOSED)
                    .count();

            double totalResHours = 0.0;
            int resCount = 0;
            int slaMet = 0;
            double totalFrtHours = 0.0;
            int frtCount = 0;

            for (Ticket t : deptTickets) {
                if (t.getResolvedAt() != null) {
                    totalResHours += (Duration.between(t.getCreatedAt(), t.getResolvedAt()).toMinutes() / 60.0);
                    resCount++;
                    if (t.getDueDate() == null || !t.getResolvedAt().isAfter(t.getDueDate())) {
                        slaMet++;
                    }
                }

                TicketComment firstStaffComment = ticketCommentRepository.findByTicketIdOrderByCreatedAtAsc(t.getId())
                        .stream()
                        .filter(c -> c.getAuthor() != null && c.getAuthor().getRole() != Role.STUDENT)
                        .findFirst().orElse(null);
                if (firstStaffComment != null) {
                    totalFrtHours += Math.max(0.1, Duration.between(t.getCreatedAt(), firstStaffComment.getCreatedAt()).toMinutes() / 60.0);
                    frtCount++;
                }
            }

            Double avgResHours = resCount > 0 ? (totalResHours / resCount) : null;
            Double slaPct = resCount > 0 ? ((slaMet * 100.0) / resCount) : null;
            Double avgFrtHours = frtCount > 0 ? (totalFrtHours / frtCount) : null;

            String badge = avgResHours == null ? "— No data" : avgResHours < 24.0 ? "⚡ Fast" : (avgResHours < 48.0 ? "👍 Standard" : "⚠️ Backlog");

            Map<String, Object> map = new LinkedHashMap<>();
            map.put("departmentName", deptName);
            map.put("totalTickets", total);
            map.put("resolvedCount", resolved);
            map.put("avgFirstResponseHours", avgFrtHours != null ? Math.round(avgFrtHours * 10.0) / 10.0 : null);
            map.put("avgResolutionHours", avgResHours != null ? Math.round(avgResHours * 10.0) / 10.0 : null);
            map.put("slaCompliancePct", slaPct != null ? Math.round(slaPct) : null);
            map.put("speedBadge", badge);

            result.add(map);
        }

        return result;
    }

    /** Export staff performance matrix as CSV */
    public String exportStaffPerformanceCsv(LocalDate from, LocalDate to) {
        List<Map<String, Object>> staffList = getStaffPerformance(from, to);
        StringBuilder sb = new StringBuilder();
        sb.append("Staff Name,Email,Role,Department,Assigned Tickets,Resolved Tickets,In Progress,Avg Response (Hrs),Avg Resolution (Hrs),CSAT Rating,Rating Count,SLA Compliance (%),Badge\n");
        for (Map<String, Object> s : staffList) {
            sb.append(csvEscape((String) s.get("staffName"))).append(",");
            sb.append(csvEscape((String) s.get("email"))).append(",");
            sb.append(csvEscape((String) s.get("role"))).append(",");
            sb.append(csvEscape((String) s.get("departmentName"))).append(",");
            sb.append(s.get("totalAssigned")).append(",");
            sb.append(s.get("totalResolved")).append(",");
            sb.append(s.get("inProgress")).append(",");
            sb.append(s.get("avgFirstResponseHours") != null ? s.get("avgFirstResponseHours") : "No data").append(",");
            sb.append(s.get("avgResolutionHours") != null ? s.get("avgResolutionHours") : "No data").append(",");
            sb.append(s.get("avgRating")).append(",");
            sb.append(s.get("ratingCount")).append(",");
            sb.append(s.get("slaCompliancePct")).append("%,");
            sb.append(csvEscape((String) s.get("performanceBadge"))).append("\n");
        }
        return sb.toString();
    }
}


