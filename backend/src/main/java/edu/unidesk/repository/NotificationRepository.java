package edu.unidesk.repository;

import edu.unidesk.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);
    long countByUserIdAndIsReadFalse(Long userId);
    List<Notification> findByUserIdAndIsReadFalse(Long userId);
    /** Deduplication — prevent sending the same title+link to the same user within a time window. */
    boolean existsByUserIdAndTitleAndLinkAndCreatedAtAfter(Long userId, String title, String link, java.time.LocalDateTime after);
}
