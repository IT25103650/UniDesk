package edu.unidesk.repository;

import edu.unidesk.model.WelfareComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WelfareCommentRepository extends JpaRepository<WelfareComment, Long> {
    @Query("SELECT c FROM WelfareComment c WHERE c.welfareCase.id = :caseId ORDER BY c.createdAt ASC")
    List<WelfareComment> findByCaseIdOrderByCreatedAtAsc(Long caseId);

    @Query("SELECT c FROM WelfareComment c WHERE c.welfareCase.id = :caseId AND (c.isInternal IS NULL OR c.isInternal = false) ORDER BY c.createdAt ASC")
    List<WelfareComment> findByCaseIdAndIsInternalFalseOrderByCreatedAtAsc(Long caseId);
}
