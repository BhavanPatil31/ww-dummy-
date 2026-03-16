package com.wealthwise.wealthwise_backend.userprofile.dto;



public class UpdatePasswordRequest {

    private String currentPassword;
    private String newPassword;
    private String confirmPassword;

    public UpdatePasswordRequest() {}

    // ✅ Getters
    public String getCurrentPassword()  { return currentPassword; }
    public String getNewPassword()      { return newPassword; }
    public String getConfirmPassword()  { return confirmPassword; }

    // ✅ Setters
    public void setCurrentPassword(String currentPassword)  { this.currentPassword = currentPassword; }
    public void setNewPassword(String newPassword)          { this.newPassword = newPassword; }
    public void setConfirmPassword(String confirmPassword)  { this.confirmPassword = confirmPassword; }
}