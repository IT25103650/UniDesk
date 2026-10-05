package edu.unidesk.service;

import edu.unidesk.exception.TooManyRequestsException;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Simple in-memory brute-force guard for low-entropy credentials
 * (login passwords, security-question answers).
 * Single-instance only — a multi-node deployment would need a shared store (e.g. Redis).
 */
@Service
public class RateLimiterService {

    private static final int MAX_ATTEMPTS = 5;
    private static final Duration LOCKOUT_DURATION = Duration.ofMinutes(15);

    private record Attempt(AtomicInteger failures, java.util.concurrent.atomic.AtomicReference<Instant> lockedUntil) {}

    private final ConcurrentHashMap<String, Attempt> attempts = new ConcurrentHashMap<>();

    private Attempt attemptFor(String key) {
        return attempts.computeIfAbsent(key, k ->
                new Attempt(new AtomicInteger(0), new java.util.concurrent.atomic.AtomicReference<>(null)));
    }

    /** Throws if the key is currently locked out. Call before attempting the credential check. */
    public void checkNotLocked(String key) {
        Attempt a = attempts.get(key);
        if (a == null) return;
        Instant lockedUntil = a.lockedUntil().get();
        if (lockedUntil != null) {
            if (Instant.now().isBefore(lockedUntil)) {
                throw new TooManyRequestsException(
                        "Too many failed attempts. Please try again in a few minutes.");
            }
            // Lockout expired — reset
            a.failures().set(0);
            a.lockedUntil().set(null);
        }
    }

    /** Record a failed attempt; locks the key out once the threshold is reached. */
    public void recordFailure(String key) {
        Attempt a = attemptFor(key);
        int count = a.failures().incrementAndGet();
        if (count >= MAX_ATTEMPTS) {
            a.lockedUntil().set(Instant.now().plus(LOCKOUT_DURATION));
        }
    }

    /** Reset the failure count on a successful attempt. */
    public void recordSuccess(String key) {
        attempts.remove(key);
    }
}
