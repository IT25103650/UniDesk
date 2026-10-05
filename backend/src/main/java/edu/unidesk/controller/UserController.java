package edu.unidesk.controller;

import edu.unidesk.dto.user.ChangePasswordRequest;
import edu.unidesk.dto.user.UpdateProfileRequest;
import edu.unidesk.model.User;
import edu.unidesk.service.ProfileService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Shared / Common — a signed-in user's own profile (any role). Uses ProfileService. */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final ProfileService profileService;

    @GetMapping("/me")
    public ResponseEntity<User> getProfile(@AuthenticationPrincipal User user) {
        // Re-fetch (rather than returning the principal directly) so department
        // is guaranteed loaded — the principal's lazy proxy has no active
        // session by this point and fails to serialize for DEPARTMENT_STAFF users.
        return ResponseEntity.ok(profileService.getOwnProfile(user.getId()));
    }

    @PutMapping("/me")
    public ResponseEntity<User> updateProfile(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(profileService.updateOwnProfile(user.getId(), request.fullName(), request.phone()));
    }

    @PutMapping("/me/password")
    public ResponseEntity<Map<String, String>> changePassword(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest httpRequest) {
        String ip = getIp(httpRequest);
        profileService.changeOwnPassword(user.getId(), request.currentPassword(), request.newPassword(), ip);
        return ResponseEntity.ok(Map.of("message", "Password successfully changed."));
    }

    private String getIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return forwarded != null ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }
}
