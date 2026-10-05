package edu.unidesk.repository;

import edu.unidesk.model.TicketTriageNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TicketTriageNoteRepository extends JpaRepository<TicketTriageNote, Long> {
    List<TicketTriageNote> findByTicketIdOrderByCreatedAtDesc(Long ticketId);
}
