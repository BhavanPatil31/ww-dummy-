package com.wealthwise.wealthwise_backend.userprofile.dto;

public class UpdateNameRequest {

    private String name;

    public UpdateNameRequest() {}

    // ✅ Getter
    public String getName() { return name; }

    // ✅ Setter
    public void setName(String name) { this.name = name; }
}