package edu.unidesk.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCategoryRequest(
        @NotBlank(message = "Category name is required.")
        @Size(max = 100, message = "Category name must be at most 100 characters.")
        String name,

        @Size(max = 500, message = "Description must be at most 500 characters.")
        String description,

        Long departmentId
) {}
