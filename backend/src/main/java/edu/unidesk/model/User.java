package edu.unidesk.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import edu.unidesk.model.enums.Role;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * Represents every user in the system regardless of role.
 * Personal data fields are minimal (IEEE Code of Ethics §1 — data minimisation).
 * Password is NEVER stored or logged in plaintext.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    /** BCrypt hash — plaintext password is NEVER persisted. */
    @JsonIgnore
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Role role;

    /** Only populated for DEPARTMENT_STAFF users. */
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @Column(length = 20)
    private String phone;

    @Column(name = "student_id", length = 50)
    private String studentId;

    /** Security question for password reset (NOT email-based). Never serialized — it's only
     *  ever needed write-side (registration) or via the dedicated forgot-password endpoints,
     *  which return it as a plain string, not through this entity. */
    @JsonIgnore
    @Column(name = "security_question", length = 300)
    private String securityQuestion;

    /** BCrypt hash of the security answer — never stored in plaintext. */
    @JsonIgnore
    @Column(name = "security_answer_hash", length = 255)
    private String securityAnswerHash;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    /** Self-registered students must verify their email before logging in.
     *  Admin-provisioned accounts (UserService.adminCreateUser) are trusted and
     *  set this true directly since the admin already vouches for the account. */
    @Column(name = "email_verified", nullable = false)
    @Builder.Default
    private Boolean emailVerified = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ── UserDetails implementation ────────────────────────────────────────────

    @JsonIgnore
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @JsonIgnore
    @Override
    public String getPassword() {
        return passwordHash;
    }

    @JsonIgnore
    @Override
    public String getUsername() {
        return email;
    }

    @JsonIgnore
    @Override
    public boolean isAccountNonExpired() { return true; }

    @JsonIgnore
    @Override
    public boolean isAccountNonLocked() { return active; }

    @JsonIgnore
    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return active; }
}
