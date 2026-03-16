package com.wealthwise.wealthwise_backend.userprofile.dto;

public class UpdateEmailRequest {

    private String newEmail;

    public UpdateEmailRequest() {}

    // ✅ Getter
    public String getNewEmail() { return newEmail; }

    // ✅ Setter
    public void setNewEmail(String newEmail) { this.newEmail = newEmail; }
}