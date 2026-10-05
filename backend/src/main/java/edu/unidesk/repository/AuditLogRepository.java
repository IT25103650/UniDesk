package edu.unidesk.repository;

import edu.unidesk.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findByActionContainingIgnoreCase(String action, Pageable pageable);

    /**
     * Detaches a user's audit trail from their (about-to-be-deleted) account
     * without losing the history — actor_email/action/detail are already a
     * denormalized snapshot, so nulling actor_id just clears the now-dangling FK.
     */
    @Modifying
    @Query("UPDATE AuditLog a SET a.actor = null WHERE a.actor.id = :userId")
    void detachActor(@Param("userId") Long userId);

    @Query("""
        SELECT a FROM AuditLog a
        WHERE (:action IS NULL OR LOWER(a.action) LIKE LOWER(CONCAT('%', :action, '%')))
          AND (:actor IS NULL OR LOWER(a.actorEmail) LIKE LOWER(CONCAT('%', :actor, '%')))
          AND (:dateFrom IS NULL OR a.createdAt >= :dateFrom)
          AND (:dateTo IS NULL OR a.createdAt <= :dateTo)
        """)
    Page<AuditLog> findWithFilters(
            @Param("action") String action,
            @Param("actor") String actor,
            @Param("dateFrom") LocalDateTime dateFrom,
            @Param("dateTo") LocalDateTime dateTo,
            Pageable pageable);
}
