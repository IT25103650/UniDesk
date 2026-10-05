package edu.unidesk.dto.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

/** Partial update: null or blank fields are left unchanged. */
public record UpdateUserRequest(
        @Size(max = 150, message = "Full name must be at most 150 characters.")
        String fullName,

        @Size(max = 20, message = "Phone must be at most 20 characters.")
        String phone,

        @Email(message = "Please provide a valid email address.")
        @Size(max = 255)
        String email
) {}
