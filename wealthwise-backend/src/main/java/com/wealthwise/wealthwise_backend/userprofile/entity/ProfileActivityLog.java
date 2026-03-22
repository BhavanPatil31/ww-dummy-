package com.wealthwise.wealthwise_backend.userprofile.entity;

import javax.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "profile_activity_log")
public class ProfileActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long logId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "changed_field")
    private String changedField;

    @Column(name = "old_value")
    private String oldValue;

    @Column(name = "new_value")
    private String newValue;

    @CreationTimestamp
    @Column(name = "changed_at", updatable = false)
    private LocalDateTime changedAt;

    public ProfileActivityLog() {
    }

    public ProfileActivityLog(Long userId, String changedField, String oldValue, String newValue) {
        this.userId = userId;
        this.changedField = changedField;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }

    // Getters
    public Long getLogId() {
        return logId;
    }

    public Long getUserId() {
        return userId;
    }

    public String getChangedField() {
        return changedField;
    }

    public String getOldValue() {
        return oldValue;
    }

    public String getNewValue() {
        return newValue;
    }

    public LocalDateTime getChangedAt() {
        return changedAt;
    }

    // Setters
    public void setLogId(Long logId) {
        this.logId = logId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public void setChangedField(String f) {
        this.changedField = f;
    }

    public void setOldValue(String oldValue) {
        this.oldValue = oldValue;
    }

    public void setNewValue(String newValue) {
        this.newValue = newValue;
    }

    public void setChangedAt(LocalDateTime date) {
        this.changedAt = date;
    }
}
