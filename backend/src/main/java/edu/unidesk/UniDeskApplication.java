package edu.unidesk;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * UniDesk — Student Help Desk Application
 *
 * Built in accordance with:
 *  - IEEE Code of Ethics (privacy, welfare, honest representation)
 *  - IEEE 730  Software Quality Assurance
 *  - IEEE 12207 Software Lifecycle processes
 *  - WCAG 2.1 AA accessibility (enforced on the frontend layer)
 */
@SpringBootApplication
@EnableScheduling
@EnableAsync
public class UniDeskApplication {
    public static void main(String[] args) {
        SpringApplication.run(UniDeskApplication.class, args);
    }
}
