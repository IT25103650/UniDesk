package edu.unidesk.repository;

import edu.unidesk.model.StudentExam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentExamRepository extends JpaRepository<StudentExam, Long> {
    List<StudentExam> findByUserIdOrderByAcademicYearDescSemesterAscModuleCodeAsc(Long userId);
}
