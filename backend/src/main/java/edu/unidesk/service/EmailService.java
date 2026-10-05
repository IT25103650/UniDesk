package edu.unidesk.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Sends account-related emails via SMTP (configured for free use with Gmail —
 * see app.mail.* / spring.mail.* in application.properties).
 *
 * Sending failures are logged, not thrown: a misconfigured or unreachable
 * mail server must never block registration itself, only the subsequent
 * email-verification step.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromAddress;

    /**
     * A typed-in code works regardless of which device the recipient opens
     * the email on — a link would fail if the email is read on a phone while
     * the app runs on a different machine (e.g. "localhost" on a laptop).
     */
    public void sendVerificationCode(String toEmail, String fullName, String code) {
        String body = "Hi " + fullName + ",\n\n"
                + "Thanks for registering with UniDesk. Enter this code on the registration page to verify your email address:\n\n"
                + "    " + code + "\n\n"
                + "This code expires in 15 minutes. If you didn't create this account, you can safely ignore this email.\n\n"
                + "— UniDesk Support";

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(toEmail);
            message.setSubject("Your UniDesk verification code");
            message.setText(body);
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", toEmail, e.getMessage());
        }
    }
}
