package com.wealthwise.wealthwise_backend.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class AIChatRequest {

    @NotBlank(message = "Message is required")
    private String message;

    @NotNull(message = "User ID is required")
    private Long userId;

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }
}
