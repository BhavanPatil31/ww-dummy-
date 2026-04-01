package com.wealthwise.wealthwise_backend.goal.entity;

import javax.persistence.*;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "goal_investments")
public class GoalInvestment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "goal_investment_id")
    @JsonProperty("goal_investment_id")
    private Integer id;

    @Column(name = "goal_id")
    @JsonProperty("goal_id")
    private Integer goalId;

    @Column(name = "investment_id")
    @JsonProperty("investment_id")
    private Integer investmentId;

    @Column(name = "linked_amount")
    @JsonProperty("linked_amount")
    private Double linkedAmount;

    public GoalInvestment() {}

    public GoalInvestment(Integer investmentId, Double linkedAmount) {
        this.investmentId = investmentId;
        this.linkedAmount = linkedAmount;
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getGoalId() { return goalId; }
    public void setGoalId(Integer goalId) { this.goalId = goalId; }

    public Integer getInvestmentId() { return investmentId; }
    public void setInvestmentId(Integer investmentId) { this.investmentId = investmentId; }

    public Double getLinkedAmount() { return linkedAmount; }
    public void setLinkedAmount(Double linkedAmount) { this.linkedAmount = linkedAmount; }
}
