package edu.unidesk.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import edu.unidesk.exception.GlobalExceptionHandler.ErrorResponse;
import edu.unidesk.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Extracts and validates the JWT Bearer token on every request.
 * Stateless — no session is created or used.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        if (!jwtUtil.isTokenValid(token)) {
            // A Bearer token WAS supplied but is invalid/expired — this is an authentication
            // failure (401), distinct from an authenticated user lacking permission (403).
            // Falling through to anonymous here previously meant @PreAuthorize checks always
            // rejected with 403 "no permission", so the frontend's session-expiry handling
            // (which only listens for 401) never fired and users saw a confusing permission
            // error instead of being prompted to log in again.
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write(objectMapper.writeValueAsString(
                    new ErrorResponse(HttpServletResponse.SC_UNAUTHORIZED,
                            "Your session has expired. Please log in again.")));
            return;
        }

        String email = jwtUtil.extractEmail(token);
        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = userRepository.findByEmail(email).orElse(null);
            if (userDetails == null || !userDetails.isEnabled()) {
                // The token is cryptographically valid but the account behind it is gone or
                // deactivated (e.g. deleted after the token was issued). Leaving the request
                // unauthenticated here used to fall through silently, so @PreAuthorize later
                // rejected with 403 "no permission" instead of a clear session-expiry signal —
                // the same confusing failure mode the invalid-token branch above already fixes.
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write(objectMapper.writeValueAsString(
                        new ErrorResponse(HttpServletResponse.SC_UNAUTHORIZED,
                                "Your session has expired. Please log in again.")));
                return;
            }
            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        filterChain.doFilter(request, response);
    }
}
