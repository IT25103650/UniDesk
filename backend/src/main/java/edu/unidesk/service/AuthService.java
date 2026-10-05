package edu.unidesk.service;

import edu.unidesk.config.JwtUtil;
import edu.unidesk.dto.auth.*;
import edu.unidesk.exception.BadRequestException;
import edu.unidesk.exception.ConflictException;
import edu.unidesk.exception.ResourceNotFoundException;
import edu.unidesk.model.EmailVerificationToken;
import edu.unidesk.model.PasswordResetToken;
import edu.unidesk.model.User;
import edu.unidesk.model.ValidStudentId;
import edu.unidesk.model.enums.Role;
import edu.unidesk.repository.EmailVerificationTokenRepository;
import edu.unidesk.repository.PasswordResetTokenRepository;
import edu.unidesk.repository.UserRepository;
import edu.unidesk.repository.ValidStudentIdRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Handles registration, login, logout, and password reset.
 * Passwords are hashed with BCrypt before persistence — never stored or returned in plaintext.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final ValidStudentIdRepository validStudentIdRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final AuditLogService auditLogService;
    private final RateLimiterService rateLimiterService;

    /**
     * Self-registration is gated on two checks that don't apply to
     * admin-provisioned accounts (see UserService.adminCreateUser):
     * 1. The student ID must already exist in the university's pre-provisioned
     *    roster and not already be claimed by another account.
     * 2. The new account starts unverified and can't log in until the emailed
     *    verification link is used — see {@link #verifyEmail(String)}.
     */
    @Transactional
    public String register(RegisterRequest request, String ipAddress) {
        String email = request.email().toLowerCase().trim();
        String studentId = request.studentId().trim();

        User existingByEmail = userRepository.findByEmail(email).orElse(null);
        if (existingByEmail != null && Boolean.TRUE.equals(existingByEmail.getEmailVerified())) {
            throw new ConflictException("An account with this email address already exists.");
        }

        ValidStudentId validId = validStudentIdRepository.findByStudentId(studentId)
                .orElseThrow(() -> new BadRequestException(
                        "This Student ID is not recognized. Please contact your department if you believe this is an error."));

        User existingByStudentId = Boolean.TRUE.equals(validId.getIsRegistered())
                ? validId.getRegisteredUser() : null;
        if (existingByStudentId != null && Boolean.TRUE.equals(existingByStudentId.getEmailVerified())) {
            throw new ConflictException("This Student ID has already been registered.");
        }

        // Neither match (if any) is a completed account — they're unverified,
        // abandoned attempts (expired code, mistyped email, gave up, etc.).
        // Release them so the real student isn't permanently locked out of
        // their own ID by someone else's incomplete registration.
        if (existingByEmail != null) {
            releaseAbandonedRegistration(existingByEmail);
        }
        if (existingByStudentId != null
                && !existingByStudentId.getId().equals(existingByEmail != null ? existingByEmail.getId() : null)) {
            releaseAbandonedRegistration(existingByStudentId);
        }

        User user = User.builder()
                .fullName(request.fullName().trim())
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(Role.STUDENT)
                .studentId(studentId)
                .phone(request.phone())
                .securityQuestion(request.securityQuestion())
                .securityAnswerHash(passwordEncoder.encode(
                        request.securityAnswer().trim().toLowerCase()))
                .active(true)
                .emailVerified(false)
                .build();

        user = userRepository.save(user);

        validId.setIsRegistered(true);
        validId.setRegisteredUser(user);
        validStudentIdRepository.save(validId);

        auditLogService.log(user, "USER_CREATED", "USER", user.getId(),
                "Self-registration as STUDENT", ipAddress);

        // A typed-in OTP (rather than an emailed link) works regardless of which
        // device the student opens their email on — no cross-device redirect needed.
        String code = generateOtp();
        EmailVerificationToken verificationToken = EmailVerificationToken.builder()
                .user(user)
                .token(code)
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .build();
        emailVerificationTokenRepository.save(verificationToken);
        emailService.sendVerificationCode(user.getEmail(), user.getFullName(), code);

        return "Registration successful! We've sent a 6-digit verification code to your email.";
    }

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private String generateOtp() {
        return String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
    }

    /**
     * Deletes an unverified self-registration that was never completed and
     * frees whatever student ID it had claimed. Only ever called on accounts
     * that failed the emailVerified check above — a verified account is never
     * touched here.
     */
    private void releaseAbandonedRegistration(User abandoned) {
        emailVerificationTokenRepository.deleteByUserId(abandoned.getId());
        auditLogService.detachActor(abandoned.getId());
        if (abandoned.getStudentId() != null) {
            validStudentIdRepository.findByStudentId(abandoned.getStudentId()).ifPresent(claim -> {
                claim.setIsRegistered(false);
                claim.setRegisteredUser(null);
                validStudentIdRepository.save(claim);
            });
        }
        userRepository.delete(abandoned);
    }

    /** Verifying also logs the student straight in — one less step right after registration. */
    @Transactional
    public AuthResponse verifyEmail(String code) {
        EmailVerificationToken verificationToken = emailVerificationTokenRepository
                .findByTokenAndUsedFalse(code)
                .orElseThrow(() -> new BadRequestException("Invalid or incorrect verification code."));

        if (verificationToken.isExpired()) {
            throw new BadRequestException("This verification code has expired. Please register again to get a new one.");
        }

        User user = verificationToken.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);

        verificationToken.setUsed(true);
        emailVerificationTokenRepository.save(verificationToken);

        auditLogService.log(user, "EMAIL_VERIFIED", "USER", user.getId(),
                "Email address verified", "SYSTEM");

        String accessToken = jwtUtil.generateAccessToken(user);
        return toAuthResponse(accessToken, user);
    }

    public AuthResponse login(LoginRequest request, String ipAddress) {
        String rateLimitKey = "login:" + request.email().toLowerCase();
        rateLimiterService.checkNotLocked(rateLimitKey);

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.email().toLowerCase(), request.password()));
        } catch (Exception e) {
            // Generic message — don't reveal whether email or password was wrong
            rateLimiterService.recordFailure(rateLimitKey);
            auditLogService.logUnauthenticated(request.email(), "LOGIN_FAILED",
                    "Failed login attempt", ipAddress);
            throw new BadRequestException("Invalid email or password.");
        }

        User user = userRepository.findByEmail(request.email().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));

        if (!user.isEnabled()) {
            throw new BadRequestException("Your account has been disabled. Please contact support.");
        }

        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new BadRequestException(
                    "Please verify your email before logging in. Check your inbox for the verification link.");
        }

        rateLimiterService.recordSuccess(rateLimitKey);
        auditLogService.log(user, "USER_LOGIN", "USER", user.getId(), "Successful login", ipAddress);
        String token = jwtUtil.generateAccessToken(user);
        return toAuthResponse(token, user);
    }

    /**
     * Generates a password reset token if the email exists. The token is never
     * returned to the caller — this project has no outbound email integration
     * (by design; see scope notes), so this endpoint is currently a no-op from
     * the client's perspective. The security-question flow is the supported
     * self-service reset path.
     */
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request, String ipAddress) {
        // Always return the same message regardless of whether email exists
        // to prevent user enumeration (IEEE Code of Ethics §1 — privacy)
        userRepository.findByEmail(request.email().toLowerCase()).ifPresent(user -> {
            tokenRepository.deleteByUserId(user.getId());
            String tokenValue = UUID.randomUUID().toString();
            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .user(user)
                    .token(tokenValue)
                    .expiresAt(LocalDateTime.now().plusHours(1))
                    .build();
            tokenRepository.save(resetToken);
            auditLogService.log(user, "PASSWORD_RESET_REQUESTED", "USER", user.getId(),
                    "Password reset token generated", ipAddress);
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request, String ipAddress) {
        PasswordResetToken resetToken = tokenRepository
                .findByTokenAndUsedFalse(request.token())
                .orElseThrow(() -> new BadRequestException("Invalid or expired reset token."));

        if (resetToken.isExpired()) {
            throw new BadRequestException("This reset link has expired. Please request a new one.");
        }

        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        resetToken.setUsed(true);
        tokenRepository.save(resetToken);

        auditLogService.log(user, "PASSWORD_RESET", "USER", user.getId(),
                "Password successfully reset", ipAddress);
    }

    // ── Security Question Password Reset ───────────────────────────────────────

    /** Generic placeholder shown for unknown emails so response content can't be used to enumerate accounts. */
    private static final String GENERIC_SECURITY_QUESTION = "Please answer your registered security question.";

    /**
     * Returns the security question for a given email, or a generic
     * placeholder if the user doesn't exist — the response is always
     * non-empty so its content can't be used to enumerate accounts.
     */
    public String getSecurityQuestion(String email) {
        return userRepository.findByEmail(email.toLowerCase())
                .map(User::getSecurityQuestion)
                .orElse(GENERIC_SECURITY_QUESTION);
    }

    /**
     * Verifies the security answer and, if correct, generates and returns
     * a password reset token.
     */
    @Transactional
    public String verifySecurityAnswer(String email, String answer, String ipAddress) {
        String rateLimitKey = "security-answer:" + email.toLowerCase();
        rateLimiterService.checkNotLocked(rateLimitKey);

        User user = userRepository.findByEmail(email.toLowerCase()).orElse(null);

        if (user == null || user.getSecurityAnswerHash() == null
                || !passwordEncoder.matches(answer.trim().toLowerCase(),
                        user.getSecurityAnswerHash())) {
            rateLimiterService.recordFailure(rateLimitKey);
            auditLogService.logUnauthenticated(email, "SECURITY_ANSWER_FAILED",
                    "Failed security answer attempt", ipAddress);
            throw new BadRequestException("Invalid email or security answer.");
        }

        rateLimiterService.recordSuccess(rateLimitKey);
        // Answer correct — generate a reset token
        tokenRepository.deleteByUserId(user.getId());
        String tokenValue = UUID.randomUUID().toString();
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .user(user)
                .token(tokenValue)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();
        tokenRepository.save(resetToken);

        auditLogService.log(user, "SECURITY_ANSWER_VERIFIED", "USER", user.getId(),
                "Security answer verified — reset token generated", ipAddress);
        return tokenValue;
    }

    private AuthResponse toAuthResponse(String token, User user) {
        Long deptId = user.getDepartment() != null ? user.getDepartment().getId() : null;
        String deptName = user.getDepartment() != null ? user.getDepartment().getName() : null;
        return new AuthResponse(token, user.getId(), user.getFullName(),
                user.getEmail(), user.getRole(), deptId, deptName);
    }
}
