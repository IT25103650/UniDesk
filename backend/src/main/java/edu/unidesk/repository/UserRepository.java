package edu.unidesk.repository;

import edu.unidesk.model.User;
import edu.unidesk.model.enums.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByRole(Role role);
    List<User> findByDepartmentId(Long departmentId);
    long countByDepartmentId(Long departmentId);

    /**
     * Eagerly fetches department so it's fully populated before the entity
     * leaves the persistence context — without this, serializing a
     * DEPARTMENT_STAFF user's lazy department proxy outside an active
     * session throws "could not initialize proxy - no Session".
     */
    @Query("SELECT u FROM User u LEFT JOIN FETCH u.department WHERE u.id = :id")
    Optional<User> findByIdWithDepartment(@Param("id") Long id);

    @Query("""
        SELECT u FROM User u
        WHERE (:role IS NULL OR u.role = :role)
          AND (:search IS NULL OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(u.studentId) LIKE LOWER(CONCAT('%', :search, '%')))
        """)
    Page<User> findWithFilters(@Param("role") Role role, @Param("search") String search, Pageable pageable);
}