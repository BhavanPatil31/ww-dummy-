package com.wealthwise.wealthwise_backend.goal.entity;

import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.List;
import org.hibernate.annotations.CreationTimestamp;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "goals")
public class Goal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "goal_id")
    @JsonProperty("goal_id")
    private Integer id;

    @Column(name = "user_id")
    @JsonProperty("user_id")
    private Integer userId;

    @Column(name = "goal_name")
    @JsonProperty("goal_name")
    private String goalName;

    @Column(name = "target_amount")
    @JsonProperty("target_amount")
    private Double targetAmount;

    @Column(name = "target_year")
    @JsonProperty("target_year")
    private Integer targetYear;

    private Double progress;

    @CreationTimestamp
    @Column(name = "created_date", updatable = false)
    @JsonProperty("created_date")
    private LocalDateTime createdDate;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "goal_id")
    @JsonProperty("linkedInvestments")
    private List<GoalInvestment> linkedInvestments;

    public Goal() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }

    public String getGoalName() { return goalName; }
    public void setGoalName(String goalName) { this.goalName = goalName; }

    public Double getTargetAmount() { return targetAmount; }
    public void setTargetAmount(Double targetAmount) { this.targetAmount = targetAmount; }

    public Integer getTargetYear() { return targetYear; }
    public void setTargetYear(Integer targetYear) { this.targetYear = targetYear; }

    public Double getProgress() { return progress; }
    public void setProgress(Double progress) { this.progress = progress; }

    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }

    public List<GoalInvestment> getLinkedInvestments() { return linkedInvestments; }
    public void setLinkedInvestments(List<GoalInvestment> linkedInvestments) { this.linkedInvestments = linkedInvestments; }
}
