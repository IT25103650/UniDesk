package edu.unidesk.repository;

import edu.unidesk.model.StudentSemesterFee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentSemesterFeeRepository extends JpaRepository<StudentSemesterFee, Long> {
    List<StudentSemesterFee> findByUserIdOrderByAcademicYearDescSemesterDesc(Long userId);
}
