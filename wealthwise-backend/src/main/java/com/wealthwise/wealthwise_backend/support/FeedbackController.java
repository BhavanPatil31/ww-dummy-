package com.wealthwise.wealthwise_backend.support;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import com.wealthwise.wealthwise_backend.auth.service.EmailService;

@RestController
@RequestMapping("/api/feedback")
@CrossOrigin(origins = "*")
public class FeedbackController {

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private EmailService emailService;

    @PostMapping("/submit")
    public ResponseEntity<Map<String, String>> submitFeedback(@RequestBody Feedback feedback) {
        Map<String, String> response = new HashMap<>();
        try {
            feedback.setSubmittedAt(LocalDateTime.now());
            feedbackRepository.save(feedback);
            response.put("message", "Feedback submitted successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("error", "Error submitting feedback: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/ticket")
    public ResponseEntity<Map<String, String>> submitTicket(@RequestBody Map<String, String> ticket) {
        Map<String, String> response = new HashMap<>();
        try {
            String title = ticket.get("title");
            String email = ticket.get("email");
            String type = ticket.get("type");
            String priority = ticket.get("priority");
            String description = ticket.get("description");

            String body = String.format("A new support ticket has been raised!\n\nUser: %s\nEmail: %s\nIssue Type: %s\nPriority: %s\n\nDescription:\n%s",
                    title, email, type, priority, description);

            emailService.sendEmail("shankarrao0420@gmail.com", "New Support Ticket: " + type, body);

            response.put("message", "Ticket submitted and email sent successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("error", "Error submitting ticket: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}
