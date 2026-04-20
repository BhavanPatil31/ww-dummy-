package com.wealthwise.wealthwise_backend.ai.controller;

import com.wealthwise.wealthwise_backend.ai.dto.AIChatRequest;
import com.wealthwise.wealthwise_backend.ai.dto.AIChatResponse;
import com.wealthwise.wealthwise_backend.ai.service.AIChatService;
import com.wealthwise.wealthwise_backend.auth.entity.User;
import com.wealthwise.wealthwise_backend.auth.repository.UserRepository;
import com.wealthwise.wealthwise_backend.auth.util.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AIChatController {

    private final AIChatService aiChatService;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public AIChatController(AIChatService aiChatService, JwtUtil jwtUtil, UserRepository userRepository) {
        this.aiChatService = aiChatService;
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @PostMapping("/chat")
    public AIChatResponse chat(
            @Valid @RequestBody AIChatRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        String token = extractBearerToken(authorizationHeader);
        String email;
        try {
            email = jwtUtil.extractEmail(token);
        } catch (Exception e) {
            throw new ResponseStatusException((org.springframework.http.HttpStatusCode) HttpStatus.UNAUTHORIZED, "Your session has expired or is invalid. Please log out and log in again.");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException((org.springframework.http.HttpStatusCode) HttpStatus.UNAUTHORIZED, "Invalid token user"));

        try {
            if (!jwtUtil.validateToken(token, user.getEmail())) {
                throw new ResponseStatusException((org.springframework.http.HttpStatusCode) HttpStatus.UNAUTHORIZED, "Invalid or expired token");
            }
        } catch (Exception e) {
            throw new ResponseStatusException((org.springframework.http.HttpStatusCode) HttpStatus.UNAUTHORIZED, "Your session has expired. Please log out and log in again.");
        }

        if (!user.getUser_id().equals(request.getUserId())) {
            throw new ResponseStatusException((org.springframework.http.HttpStatusCode) HttpStatus.FORBIDDEN, "You can only access your own AI insights");
        }

        return new AIChatResponse(aiChatService.chat(user, request.getMessage()));
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            throw new ResponseStatusException((org.springframework.http.HttpStatusCode) HttpStatus.UNAUTHORIZED, "Missing Authorization header");
        }
        if (!authorizationHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException((org.springframework.http.HttpStatusCode) HttpStatus.UNAUTHORIZED, "Authorization header must use Bearer token");
        }
        String token = authorizationHeader.substring(7).trim();
        if (token.isBlank()) {
            throw new ResponseStatusException((org.springframework.http.HttpStatusCode) HttpStatus.UNAUTHORIZED, "Bearer token is empty");
        }
        return token;
    }
}
