package edu.unidesk.repository;

import edu.unidesk.model.WelfareCase;
import edu.unidesk.model.enums.WelfareStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WelfareCaseRepository extends JpaRepository<WelfareCase, Long> {

    Optional<WelfareCase> findByReferenceNo(String referenceNo);

    Page<WelfareCase> findByStudentId(Long studentId, Pageable pageable);

    @Query("""
        SELECT w FROM WelfareCase w
        WHERE (:status IS NULL OR w.status = :status)
          AND (:isUrgent IS NULL OR w.isUrgent = :isUrgent)
        """)
    Page<WelfareCase> findAllWithFilters(
            @Param("status") WelfareStatus status,
            @Param("isUrgent") Boolean isUrgent,
            Pageable pageable);

    long countByIsUrgentTrue();
}
