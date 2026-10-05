package edu.unidesk.service;

import edu.unidesk.exception.BadRequestException;
import edu.unidesk.exception.ResourceNotFoundException;
import edu.unidesk.model.Department;
import edu.unidesk.model.User;
import edu.unidesk.repository.CategoryRepository;
import edu.unidesk.repository.DepartmentRepository;
import edu.unidesk.repository.TicketRepository;
import edu.unidesk.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final CategoryRepository categoryRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    public List<Department> getAll() {
        return departmentRepository.findAll();
    }

    public List<Department> getActiveOnly() {
        return departmentRepository.findByActiveTrue();
    }

    public Department getById(Long id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found."));
    }

    @Transactional
    public Department create(String name, String description, User admin, String ip) {
        if (name == null || name.isBlank()) {
            throw new BadRequestException("Department name is required.");
        }
        Department d = Department.builder().name(name.trim()).description(description).build();
        d = departmentRepository.save(d);
        auditLogService.log(admin, "DEPARTMENT_CREATED", "DEPARTMENT", d.getId(),
                "Created: " + d.getName(), ip);
        return d;
    }

    @Transactional
    public Department update(Long id, String name, String description, Boolean active, User admin, String ip) {
        Department d = getById(id);
        if (name != null) {
            if (name.isBlank()) throw new BadRequestException("Department name cannot be blank.");
            d.setName(name.trim());
        }
        if (description != null) d.setDescription(description);
        if (active != null) d.setActive(active);
        d = departmentRepository.save(d);
        auditLogService.log(admin, "DEPARTMENT_UPDATED", "DEPARTMENT", d.getId(),
                "Updated: " + d.getName() + (active != null ? " (active=" + active + ")" : ""), ip);
        return d;
    }

    /** Safe delete a department by unlinking linked categories, staff, and tickets first. */
    @Transactional
    public void delete(Long id, User admin, String ip) {
        Department d = getById(id);
        String name = d.getName();

        // 1. Unlink categories
        List<edu.unidesk.model.Category> categories = categoryRepository.findByDepartmentId(id);
        for (edu.unidesk.model.Category c : categories) {
            c.setDepartment(null);
            categoryRepository.save(c);
        }

        // 2. Unlink staff
        List<edu.unidesk.model.User> staff = userRepository.findByDepartmentId(id);
        for (edu.unidesk.model.User u : staff) {
            u.setDepartment(null);
            userRepository.save(u);
        }

        // 3. Unlink tickets
        List<edu.unidesk.model.Ticket> tickets = ticketRepository.findAllByDepartmentId(id);
        for (edu.unidesk.model.Ticket t : tickets) {
            t.setDepartment(null);
            ticketRepository.save(t);
        }

        departmentRepository.delete(d);
        auditLogService.log(admin, "DEPARTMENT_DELETED", "DEPARTMENT", id, "Deleted: " + name, ip);
    }
}
