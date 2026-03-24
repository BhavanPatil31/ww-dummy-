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

    @Column(name = "gender", length = 10)
    private String gender;

    @Column(name = "tax_id", length = 50)
    private String taxId;

    @Column(name = "tax_country", length = 50)
    private String taxCountry;

    @Column(name = "residential_address", columnDefinition = "TEXT")
    private String residentialAddress;

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

    public String getGender() {
        return gender;
    }

    public String getTaxId() {
        return taxId;
    }

    public String getTaxCountry() {
        return taxCountry;
    }

    public String getResidentialAddress() {
        return residentialAddress;
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

    public void setGender(String gender) {
        this.gender = gender;
    }

    public void setTaxId(String taxId) {
        this.taxId = taxId;
    }

    public void setTaxCountry(String taxCountry) {
        this.taxCountry = taxCountry;
    }

    public void setResidentialAddress(String residentialAddress) {
        this.residentialAddress = residentialAddress;
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
        private String gender, taxId, taxCountry, residentialAddress;

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

        public Builder gender(String gender) {
            this.gender = gender;
            return this;
        }

        public Builder taxId(String taxId) {
            this.taxId = taxId;
            return this;
        }

        public Builder taxCountry(String taxCountry) {
            this.taxCountry = taxCountry;
            return this;
        }

        public Builder residentialAddress(String residentialAddress) {
            this.residentialAddress = residentialAddress;
            return this;
        }

        public UserProfileDetails build() {
            UserProfileDetails p = new UserProfileDetails();
            p.userId = this.userId;
            p.name = this.name;
            p.email = this.email;
            p.phone = this.phone;
            p.password = this.password;
            p.gender = this.gender;
            p.taxId = this.taxId;
            p.taxCountry = this.taxCountry;
            p.residentialAddress = this.residentialAddress;
            return p;
        }
    }
}