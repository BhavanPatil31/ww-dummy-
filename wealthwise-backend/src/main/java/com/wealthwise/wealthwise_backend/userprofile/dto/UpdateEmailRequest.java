package com.wealthwise.wealthwise_backend.userprofile.dto;

public class UpdateEmailRequest {
    private String newEmail;
    public UpdateEmailRequest() {}
    public String getNewEmail() { return newEmail; }
    public void setNewEmail(String newEmail) { this.newEmail = newEmail; }
}