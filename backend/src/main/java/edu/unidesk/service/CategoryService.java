package edu.unidesk.service;

import edu.unidesk.exception.BadRequestException;
import edu.unidesk.exception.ResourceNotFoundException;
import edu.unidesk.model.Category;
import edu.unidesk.model.Department;
import edu.unidesk.model.User;
import edu.unidesk.repository.CategoryRepository;
import edu.unidesk.repository.DepartmentRepository;
import edu.unidesk.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final DepartmentRepository departmentRepository;
    private final TicketRepository ticketRepository;
    private final AuditLogService auditLogService;

    public List<Category> getAll() {
        return categoryRepository.findAll();
    }

    public List<Category> getActiveOnly() {
        return categoryRepository.findSelectableForNewTickets();
    }

    public Category getById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found."));
    }

    @Transactional
    public Category create(String name, String description, Long departmentId, User admin, String ip) {
        if (name == null || name.isBlank()) {
            throw new BadRequestException("Category name is required.");
        }
        Department dept = departmentId != null
                ? departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found."))
                : null;
        Category c = Category.builder().name(name.trim()).description(description).department(dept).build();
        c = categoryRepository.save(c);
        auditLogService.log(admin, "CATEGORY_CREATED", "CATEGORY", c.getId(), "Created: " + c.getName(), ip);
        return c;
    }

    @Transactional
    public Category update(Long id, String name, String description, Long departmentId, Boolean active, User admin, String ip) {
        Category c = getById(id);
        if (name != null) {
            if (name.isBlank()) throw new BadRequestException("Category name cannot be blank.");
            c.setName(name.trim());
        }
        if (description != null) c.setDescription(description);
        if (active != null) c.setActive(active);
        if (departmentId != null) {
            Department dept = departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found."));
            c.setDepartment(dept);
        }
        c = categoryRepository.save(c);
        auditLogService.log(admin, "CATEGORY_UPDATED", "CATEGORY", c.getId(),
                "Updated: " + c.getName() + (active != null ? " (active=" + active + ")" : ""), ip);
        return c;
    }

    /** Safe delete a category by unlinking any tickets using it. */
    @Transactional
    public void delete(Long id, User admin, String ip) {
        Category c = getById(id);
        String name = c.getName();
        List<edu.unidesk.model.Ticket> tickets = ticketRepository.findAllByCategoryId(id);
        for (edu.unidesk.model.Ticket t : tickets) {
            t.setCategory(null);
            ticketRepository.save(t);
        }
        categoryRepository.delete(c);
        auditLogService.log(admin, "CATEGORY_DELETED", "CATEGORY", id, "Deleted: " + name, ip);
    }
}
