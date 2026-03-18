package com.wealthwise.wealthwise_backend.userprofile.entity;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_profile")
public class UserProfileDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "profile_id")
    private Long profileId; // ✅ Long not long

    @Column(name = "user_id", updatable = false, nullable = false)
    private Long userId; // ✅ Long not long

    @Column(name = "name", length = 100)
    private String name;

    @Column(name = "email", length = 100, unique = true)
    private String email;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "password")
    private String password;

    @CreationTimestamp
    @Column(name = "created_date", updatable = false)
    private LocalDateTime createdDate;

    public UserProfileDetails() {
    }

    // ✅ Getters
    public Long getProfileId() {
        return profileId;
    }

    public Long getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getPassword() {
        return password;
    }

    public LocalDateTime getCreatedDate() {
        return createdDate;
    }

    // ✅ Setters
    public void setProfileId(Long profileId) {
        this.profileId = profileId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public void setCreatedDate(LocalDateTime d) {
        this.createdDate = d;
    }

    // ✅ Builder
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long userId;
        private String name, email, phone, password;

        public Builder userId(Long userId) {
            this.userId = userId;
            return this;
        }

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder email(String email) {
            this.email = email;
            return this;
        }

        public Builder phone(String phone) {
            this.phone = phone;
            return this;
        }

        public Builder password(String password) {
            this.password = password;
            return this;
        }

        public UserProfileDetails build() {
            UserProfileDetails p = new UserProfileDetails();
            p.userId = this.userId;
            p.name = this.name;
            p.email = this.email;
            p.phone = this.phone;
            p.password = this.password;
            return p;
        }
    }
}