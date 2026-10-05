package edu.unidesk.repository;

import edu.unidesk.model.Ticket;
import edu.unidesk.model.enums.Priority;
import edu.unidesk.model.enums.TicketStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {

    Optional<Ticket> findByReferenceNo(String referenceNo);

    Page<Ticket> findByStudentId(Long studentId, Pageable pageable);

    /** Full (non-paged) ticket history for a student — used by the staff-facing student profile view. */
    List<Ticket> findByStudentIdOrderByCreatedAtDesc(Long studentId);

    @Query("SELECT t FROM Ticket t WHERE t.department.id = :deptId AND (t.isDraft IS NULL OR t.isDraft = false)")
    Page<Ticket> findByDepartmentId(@Param("deptId") Long deptId, Pageable pageable);

    @Query("""
        SELECT t FROM Ticket t
        WHERE (t.isDraft IS NULL OR t.isDraft = false)
          AND (:status IS NULL OR t.status = :status)
          AND (:priority IS NULL OR t.priority = :priority)
          AND (:deptId IS NULL OR t.department.id = :deptId)
          AND (:catId IS NULL OR t.category.id = :catId)
          AND (:dateFrom IS NULL OR t.createdAt >= :dateFrom)
          AND (:dateTo IS NULL OR t.createdAt <= :dateTo)
          AND (:search IS NULL OR LOWER(t.subject) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(t.referenceNo) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(t.student.fullName) LIKE LOWER(CONCAT('%', :search, '%')))
        """)
    Page<Ticket> findAllWithFilters(
            @Param("status") TicketStatus status,
            @Param("priority") Priority priority,
            @Param("deptId") Long deptId,
            @Param("catId") Long catId,
            @Param("dateFrom") LocalDateTime dateFrom,
            @Param("dateTo") LocalDateTime dateTo,
            @Param("search") String search,
            Pageable pageable);

    long countByStatus(TicketStatus status);
    long countByDepartmentId(Long departmentId);
    long countByCategoryId(Long categoryId);
    long countByPriority(Priority priority);

    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.createdAt >= :since")
    long countCreatedSince(@Param("since") LocalDateTime since);

    @Query("SELECT AVG(DATEDIFF(MINUTE, t.createdAt, t.resolvedAt)) FROM Ticket t WHERE t.resolvedAt IS NOT NULL")
    Double avgResolutionMinutes();

    @Query("SELECT COALESCE(t.department.name, 'Unassigned') AS dept, COUNT(t) AS cnt FROM Ticket t " +
           "WHERE (:dateFrom IS NULL OR t.createdAt >= :dateFrom) AND (:dateTo IS NULL OR t.createdAt <= :dateTo) " +
           "GROUP BY t.department.name")
    List<Object[]> countByDepartment(@Param("dateFrom") LocalDateTime dateFrom, @Param("dateTo") LocalDateTime dateTo);

    @Query("SELECT t.category.name AS cat, COUNT(t) AS cnt FROM Ticket t " +
           "WHERE (:dateFrom IS NULL OR t.createdAt >= :dateFrom) AND (:dateTo IS NULL OR t.createdAt <= :dateTo) " +
           "GROUP BY t.category.name")
    List<Object[]> countByCategory(@Param("dateFrom") LocalDateTime dateFrom, @Param("dateTo") LocalDateTime dateTo);

    /** Find overdue tickets: past due date and not resolved/closed. */
    @Query("SELECT t FROM Ticket t WHERE t.dueDate IS NOT NULL AND t.dueDate < :now AND t.status NOT IN ('RESOLVED', 'CLOSED') AND (t.isDraft IS NULL OR t.isDraft = false)")
    List<Ticket> findOverdueTickets(@Param("now") LocalDateTime now);

    /** Find stale tickets: no update for X days. */
    @Query("SELECT t FROM Ticket t WHERE t.updatedAt < :threshold AND t.status NOT IN ('RESOLVED', 'CLOSED') AND (t.isDraft IS NULL OR t.isDraft = false)")
    List<Ticket> findStaleTickets(@Param("threshold") LocalDateTime threshold);

    /**
     * Records that the overdue reminder was just sent for this ticket, via a direct
     * bulk update rather than entity save() — so it does NOT touch updatedAt (which
     * would otherwise reset the staleness clock used by findStaleTickets every time
     * an overdue reminder fires).
     */
    @Modifying
    @Query("UPDATE Ticket t SET t.overdueNotifiedAt = :notifiedAt WHERE t.id = :id")
    void markOverdueNotified(@Param("id") Long id, @Param("notifiedAt") LocalDateTime notifiedAt);

    /** Student My Tickets with status filter. */
    @Query("SELECT t FROM Ticket t WHERE t.student.id = :studentId AND (:status IS NULL OR t.status = :status)")
    Page<Ticket> findByStudentIdWithStatus(@Param("studentId") Long studentId, @Param("status") TicketStatus status, Pageable pageable);

    /** Department tickets with status filter. */
    @Query("SELECT t FROM Ticket t WHERE t.department.id = :deptId AND (:status IS NULL OR t.status = :status) AND (t.isDraft IS NULL OR t.isDraft = false)")
    Page<Ticket> findByDepartmentIdWithStatus(@Param("deptId") Long deptId, @Param("status") TicketStatus status, Pageable pageable);

    @Query("SELECT t FROM Ticket t WHERE t.department.id = :deptId")
    List<Ticket> findAllByDepartmentId(@Param("deptId") Long deptId);

    @Query("SELECT t FROM Ticket t WHERE t.category.id = :catId")
    List<Ticket> findAllByCategoryId(@Param("catId") Long catId);

    /**
     * Department-level Resolved/Closed archive: tickets previously handled by this
     * department only — never another department's tickets.
     */
    @Query("""
        SELECT t FROM Ticket t
        WHERE t.department.id = :deptId
          AND t.status IN (edu.unidesk.model.enums.TicketStatus.RESOLVED, edu.unidesk.model.enums.TicketStatus.CLOSED)
          AND (t.isDraft IS NULL OR t.isDraft = false)
          AND (:search IS NULL OR LOWER(t.subject) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(t.referenceNo) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(t.student.fullName) LIKE LOWER(CONCAT('%', :search, '%')))
        """)
    Page<Ticket> findDeptArchive(@Param("deptId") Long deptId, @Param("search") String search, Pageable pageable);
}

