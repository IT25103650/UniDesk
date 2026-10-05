package edu.unidesk.repository;

import edu.unidesk.model.Announcement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {

    Page<Announcement> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /** Active announcements: published, and within optional date range. */
    @Query("""
        SELECT a FROM Announcement a
        WHERE a.isPublished = true
          AND (a.startDate IS NULL OR a.startDate <= :now)
          AND (a.endDate IS NULL OR a.endDate >= :now)
        ORDER BY a.createdAt DESC
        """)
    List<Announcement> findActiveAnnouncements(@Param("now") LocalDateTime now);

    /**
     * Active announcements visible to a specific role: published, within date range, and
     * targeted at either this role specifically or at everyone (NULL/'ALL' target_role).
     * Filtering happens here — server-side — not left to the client to enforce.
     */
    @Query("""
        SELECT a FROM Announcement a
        WHERE a.isPublished = true
          AND (a.startDate IS NULL OR a.startDate <= :now)
          AND (a.endDate IS NULL OR a.endDate >= :now)
          AND (a.targetRole IS NULL OR a.targetRole = 'ALL' OR a.targetRole = :role)
        ORDER BY a.createdAt DESC
        """)
    List<Announcement> findActiveAnnouncementsForRole(@Param("now") LocalDateTime now, @Param("role") String role);

    /** Admin — paged announcement list with optional search/target/status filters. */
    @Query("""
        SELECT a FROM Announcement a
        WHERE (:search IS NULL OR LOWER(a.title) LIKE LOWER(CONCAT('%', :search, '%'))
                                OR LOWER(a.body) LIKE LOWER(CONCAT('%', :search, '%')))
          AND (:targetRole IS NULL OR a.targetRole = :targetRole
                OR (:targetRole = 'ALL' AND a.targetRole IS NULL))
          AND (:isPublished IS NULL OR a.isPublished = :isPublished)
        ORDER BY a.createdAt DESC
        """)
    Page<Announcement> findAllWithFilters(@Param("search") String search,
                                           @Param("targetRole") String targetRole,
                                           @Param("isPublished") Boolean isPublished,
                                           Pageable pageable);
}
