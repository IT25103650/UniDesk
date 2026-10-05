package edu.unidesk.repository;

import edu.unidesk.model.DepartmentReplyTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DepartmentReplyTemplateRepository extends JpaRepository<DepartmentReplyTemplate, Long> {
    List<DepartmentReplyTemplate> findByDepartmentIdOrderByTitleAsc(Long departmentId);
    List<DepartmentReplyTemplate> findAllByOrderByTitleAsc();
    boolean existsByDepartmentIdAndTitleIgnoreCase(Long departmentId, String title);
}
