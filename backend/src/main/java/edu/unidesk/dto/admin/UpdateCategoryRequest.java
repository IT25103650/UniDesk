package edu.unidesk.dto.admin;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Partial update: null fields are left unchanged, but a supplied name must not be blank. */
public record UpdateCategoryRequest(
        @Pattern(regexp = "(?s).*\\S.*", message = "Category name cannot be blank.")
        @Size(max = 100, message = "Category name must be at most 100 characters.")
        String name,

        @Size(max = 500, message = "Description must be at most 500 characters.")
        String description,

        Long departmentId,

        Boolean active
) {}
