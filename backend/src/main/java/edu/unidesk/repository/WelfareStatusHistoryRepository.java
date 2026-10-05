package edu.unidesk.repository;

import edu.unidesk.model.WelfareStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WelfareStatusHistoryRepository extends JpaRepository<WelfareStatusHistory, Long> {
    @Query("SELECT h FROM WelfareStatusHistory h WHERE h.welfareCase.id = :caseId ORDER BY h.changedAt ASC")
    List<WelfareStatusHistory> findByCaseIdOrderByChangedAtAsc(Long caseId);
}
