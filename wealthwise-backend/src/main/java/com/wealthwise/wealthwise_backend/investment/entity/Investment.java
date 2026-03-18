package com.wealthwise.wealthwise_backend.investment.entity;

import javax.persistence.*;
import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "investments")
public class Investment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @JsonProperty("investment_id")
    private Long investmentId;

    @Column(name = "user_id")
    @JsonProperty("user_id")
    private Long userId;

    @Column(name = "fund_id")
    @JsonProperty("fund_id")
    private Long fundId;

    @Column(name = "scheme_name")
    @JsonProperty("scheme_name")
    private String schemeName;

    @Column(name = "investment_type")
    @JsonProperty("investment_type")
    private String investmentType;

    @JsonProperty("amount")
    private Double amount;
    
    @Column(name = "amount_invested")
    @JsonProperty("amount_invested")
    private Double amountInvested;

    @JsonProperty("units")
    private Double units;

    @Column(name = "buy_date")
    @JsonProperty("buy_date")
    private LocalDate buyDate;
    
    @Column(name = "start_date")
    @JsonProperty("start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    @JsonProperty("end_date")
    private LocalDate endDate;

    @Column(name = "nav_at_buy")
    @JsonProperty("nav_at_buy")
    private Double navAtBuy;
    
    @Column(name = "current_nav")
    @JsonProperty("current_nav")
    private Double currentNav;

    @JsonProperty("frequency")
    private String frequency;

    @Column(name = "created_date")
    @JsonProperty("created_date")
    private LocalDate createdDate;

    @Column(name = "asset_category")
    @JsonProperty("asset_category")
    private String assetCategory;

    @Column(name = "risk_level")
    @JsonProperty("risk_level")
    private String riskLevel;

    @Column(name = "investment_goal")
    @JsonProperty("investment_goal")
    private String investmentGoal;

    @JsonProperty("platform")
    private String platform;

    @Column(columnDefinition = "TEXT")
    @JsonProperty("notes")
    private String notes;

    @Column(name = "expected_return")
    @JsonProperty("expected_return")
    private Double expectedReturn;

    @Column(name = "investment_duration")
    @JsonProperty("investment_duration")
    private Integer investmentDuration;

    public Investment() {
    }

    @PrePersist
    public void onCreate() {
        this.createdDate = LocalDate.now();
    }

    public Long getInvestmentId() {
        return investmentId;
    }

    public void setInvestmentId(Long investmentId) {
        this.investmentId = investmentId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getFundId() {
        return fundId;
    }

    public void setFundId(Long fundId) {
        this.fundId = fundId;
    }

    public String getSchemeName() {
        return schemeName;
    }

    public void setSchemeName(String schemeName) {
        this.schemeName = schemeName;
    }

    public String getInvestmentType() {
        return investmentType;
    }

    public void setInvestmentType(String investmentType) {
        this.investmentType = investmentType;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public Double getAmountInvested() {
        return amountInvested;
    }

    public void setAmountInvested(Double amountInvested) {
        this.amountInvested = amountInvested;
    }

    public Double getUnits() {
        return units;
    }

    public void setUnits(Double units) {
        this.units = units;
    }

    public LocalDate getBuyDate() {
        return buyDate;
    }

    public void setBuyDate(LocalDate buyDate) {
        this.buyDate = buyDate;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public Double getNavAtBuy() {
        return navAtBuy;
    }

    public void setNavAtBuy(Double navAtBuy) {
        this.navAtBuy = navAtBuy;
    }

    public Double getCurrentNav() {
        return currentNav;
    }

    public void setCurrentNav(Double currentNav) {
        this.currentNav = currentNav;
    }

    public String getFrequency() {
        return frequency;
    }

    public void setFrequency(String frequency) {
        this.frequency = frequency;
    }

    public LocalDate getCreatedDate() {
        return createdDate;
    }

    public void setCreatedDate(LocalDate createdDate) {
        this.createdDate = createdDate;
    }

    public String getAssetCategory() {
        return assetCategory;
    }

    public void setAssetCategory(String assetCategory) {
        this.assetCategory = assetCategory;
    }

    public String getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(String riskLevel) {
        this.riskLevel = riskLevel;
    }

    public String getInvestmentGoal() {
        return investmentGoal;
    }

    public void setInvestmentGoal(String investmentGoal) {
        this.investmentGoal = investmentGoal;
    }

    public String getPlatform() {
        return platform;
    }

    public void setPlatform(String platform) {
        this.platform = platform;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Double getExpectedReturn() {
        return expectedReturn;
    }

    public void setExpectedReturn(Double expectedReturn) {
        this.expectedReturn = expectedReturn;
    }

    public Integer getInvestmentDuration() {
        return investmentDuration;
    }

    public void setInvestmentDuration(Integer investmentDuration) {
        this.investmentDuration = investmentDuration;
    }
}