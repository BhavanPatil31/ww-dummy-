package com.wealthwise.wealthwise_backend.userprofile.dto;

import java.time.LocalDateTime;

public class UserProfileDTO {

    private Long profileId;
    private Long userId;
    private String name;
    private String email;
    private String phone;
    private String password;
    private String gender;
    private String taxId;
    private String taxCountry;
    private String residentialAddress;
    private String occupation;
    private String dob;
    private String bio;
    private LocalDateTime createdDate;

    public UserProfileDTO() {}

    // Getters
    public Long getProfileId()             { return profileId; }
    public Long getUserId()                { return userId; }
    public String getName()                { return name; }
    public String getEmail()               { return email; }
    public String getPhone()               { return phone; }
    public String getPassword()            { return password; }
    public String getGender()              { return gender; }
    public String getTaxId()               { return taxId; }
    public String getTaxCountry()          { return taxCountry; }
    public String getResidentialAddress()  { return residentialAddress; }
    public String getOccupation()          { return occupation; }
    public String getDob()                 { return dob; }
    public String getBio()                 { return bio; }
    public LocalDateTime getCreatedDate()  { return createdDate; }

    // Setters
    public void setProfileId(Long profileId)          { this.profileId = profileId; }
    public void setUserId(Long userId)                { this.userId = userId; }
    public void setName(String name)                  { this.name = name; }
    public void setEmail(String email)                { this.email = email; }
    public void setPhone(String phone)                { this.phone = phone; }
    public void setPassword(String password)          { this.password = password; }
    public void setGender(String gender)              { this.gender = gender; }
    public void setTaxId(String taxId)                { this.taxId = taxId; }
    public void setTaxCountry(String taxCountry)      { this.taxCountry = taxCountry; }
    public void setResidentialAddress(String addr)    { this.residentialAddress = addr; }
    public void setOccupation(String occ)             { this.occupation = occ; }
    public void setDob(String d)                      { this.dob = d; }
    public void setBio(String b)                      { this.bio = b; }
    public void setCreatedDate(LocalDateTime date)    { this.createdDate = date; }

    // Builder
    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long profileId;
        private Long userId;
        private String name, email, phone, password;
        private String gender, taxId, taxCountry, residentialAddress;
        private String occupation, dob, bio;
        private LocalDateTime createdDate;

        public Builder profileId(Long profileId)       { this.profileId = profileId; return this; }
        public Builder userId(Long userId)             { this.userId = userId; return this; }
        public Builder name(String name)               { this.name = name; return this; }
        public Builder email(String email)             { this.email = email; return this; }
        public Builder phone(String phone)             { this.phone = phone; return this; }
        public Builder password(String password)       { this.password = password; return this; }
        public Builder gender(String gender)           { this.gender = gender; return this; }
        public Builder taxId(String taxId)             { this.taxId = taxId; return this; }
        public Builder taxCountry(String taxCountry)   { this.taxCountry = taxCountry; return this; }
        public Builder residentialAddress(String addr) { this.residentialAddress = addr; return this; }
        public Builder occupation(String occ)          { this.occupation = occ; return this; }
        public Builder dob(String d)                   { this.dob = d; return this; }
        public Builder bio(String b)                   { this.bio = b; return this; }
        public Builder createdDate(LocalDateTime date) { this.createdDate = date; return this; }

        public UserProfileDTO build() {
            UserProfileDTO dto = new UserProfileDTO();
            dto.profileId   = this.profileId;
            dto.userId      = this.userId;
            dto.name        = this.name;
            dto.email       = this.email;
            dto.phone       = this.phone;
            dto.password    = this.password;
            dto.gender      = this.gender;
            dto.taxId       = this.taxId;
            dto.taxCountry  = this.taxCountry;
            dto.residentialAddress = this.residentialAddress;
            dto.occupation  = this.occupation;
            dto.dob         = this.dob;
            dto.bio         = this.bio;
            dto.createdDate = this.createdDate;
            return dto;
        }
    }
}