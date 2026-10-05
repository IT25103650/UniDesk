package edu.unidesk.controller;

import edu.unidesk.dto.auth.*;
import edu.unidesk.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {
        String message = authService.register(request, getIp(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", message));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<AuthResponse> verifyEmail(
            @Valid @RequestBody VerifyEmailRequest request) {
        return ResponseEntity.ok(authService.verifyEmail(request.code()));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.login(request, getIp(httpRequest)));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest httpRequest) {
        authService.forgotPassword(request, getIp(httpRequest));
        return ResponseEntity.ok(Map.of(
                "message", "If an account exists with this email, a reset link has been sent."
        ));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest httpRequest) {
        authService.resetPassword(request, getIp(httpRequest));
        return ResponseEntity.ok(Map.of("message", "Password has been successfully reset."));
    }

    /** Get the security question for a given email (step 1 of security-question reset). */
    @PostMapping("/security-question")
    public ResponseEntity<Map<String, String>> getSecurityQuestion(
            @Valid @RequestBody SecurityQuestionRequest request) {
        // Always returns 200 with a non-empty question, real or generic, to prevent user enumeration
        return ResponseEntity.ok(Map.of(
                "question", authService.getSecurityQuestion(request.email())
        ));
    }

    /** Verify the security answer and return a reset token (step 2). */
    @PostMapping("/verify-security-answer")
    public ResponseEntity<Map<String, String>> verifySecurityAnswer(
            @Valid @RequestBody VerifySecurityAnswerRequest request,
            HttpServletRequest httpRequest) {
        String token = authService.verifySecurityAnswer(
                request.email(), request.securityAnswer(), getIp(httpRequest));
        return ResponseEntity.ok(Map.of(
                "resetToken", token,
                "message", "Security answer verified. You may now reset your password."
        ));
    }

    private String getIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return forwarded != null ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }
}
