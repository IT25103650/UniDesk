package edu.unidesk.repository;

import edu.unidesk.model.ValidStudentId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ValidStudentIdRepository extends JpaRepository<ValidStudentId, Long> {
    Optional<ValidStudentId> findByStudentId(String studentId);
}
