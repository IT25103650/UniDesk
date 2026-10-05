package edu.unidesk.repository;

import edu.unidesk.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByActiveTrue();
    List<Category> findByDepartmentId(Long departmentId);

    /** Active categories that aren't routed to a disabled department — safe to offer for new tickets. */
    @Query("SELECT c FROM Category c WHERE c.active = true AND (c.department IS NULL OR c.department.active = true)")
    List<Category> findSelectableForNewTickets();
}
