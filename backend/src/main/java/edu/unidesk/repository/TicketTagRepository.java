package edu.unidesk.repository;

import edu.unidesk.model.TicketTag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TicketTagRepository extends JpaRepository<TicketTag, Long> {
    List<TicketTag> findByTicketIdOrderByCreatedAtAsc(Long ticketId);
    boolean existsByTicketIdAndLabelIgnoreCase(Long ticketId, String label);
    long countByTicketId(Long ticketId);
}
