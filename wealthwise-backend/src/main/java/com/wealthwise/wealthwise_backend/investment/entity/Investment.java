package com.wealthwise.wealthwise_backend.investment.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "investments")
public class Investment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long investment_id;

    @Column(name = "user_id")
    private Long userId;

    private Long fund_id;

    private String scheme_name;

    private String investment_type;

    private Double amount;
    
    private Double amount_invested;

    private Double units;

    private LocalDate buy_date;
    
    private LocalDate start_date;

    private Double nav_at_buy;
    
    private Double current_nav;

    private String frequency;

    private LocalDate created_date;

    private String asset_category;

    private String risk_level;

    private String investment_goal;

    private String platform;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private Double expected_return;

    private Integer investment_duration;

    public Investment() {
    }

    @PrePersist
    public void onCreate() {
        this.created_date = LocalDate.now();
    }

    public Long getInvestment_id() {
        return investment_id;
    }

    public void setInvestment_id(Long investment_id) {
        this.investment_id = investment_id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getFund_id() {
        return fund_id;
    }

    public void setFund_id(Long fund_id) {
        this.fund_id = fund_id;
    }

    public String getScheme_name() {
        return scheme_name;
    }

    public void setScheme_name(String scheme_name) {
        this.scheme_name = scheme_name;
    }

    public String getInvestment_type() {
        return investment_type;
    }

    public void setInvestment_type(String investment_type) {
        this.investment_type = investment_type;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public Double getAmount_invested() {
        return amount_invested;
    }

    public void setAmount_invested(Double amount_invested) {
        this.amount_invested = amount_invested;
    }

    public Double getUnits() {
        return units;
    }

    public void setUnits(Double units) {
        this.units = units;
    }

    public LocalDate getBuy_date() {
        return buy_date;
    }

    public void setBuy_date(LocalDate buy_date) {
        this.buy_date = buy_date;
    }

    public LocalDate getStart_date() {
        return start_date;
    }

    public void setStart_date(LocalDate start_date) {
        this.start_date = start_date;
    }

    public Double getNav_at_buy() {
        return nav_at_buy;
    }

    public void setNav_at_buy(Double nav_at_buy) {
        this.nav_at_buy = nav_at_buy;
    }

    public Double getCurrent_nav() {
        return current_nav;
    }

    public void setCurrent_nav(Double current_nav) {
        this.current_nav = current_nav;
    }

    public String getFrequency() {
        return frequency;
    }

    public void setFrequency(String frequency) {
        this.frequency = frequency;
    }

    public LocalDate getCreated_date() {
        return created_date;
    }

    public void setCreated_date(LocalDate created_date) {
        this.created_date = created_date;
    }

    public String getAsset_category() {
        return asset_category;
    }

    public void setAsset_category(String asset_category) {
        this.asset_category = asset_category;
    }

    public String getRisk_level() {
        return risk_level;
    }

    public void setRisk_level(String risk_level) {
        this.risk_level = risk_level;
    }

    public String getInvestment_goal() {
        return investment_goal;
    }

    public void setInvestment_goal(String investment_goal) {
        this.investment_goal = investment_goal;
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

    public Double getExpected_return() {
        return expected_return;
    }

    public void setExpected_return(Double expected_return) {
        this.expected_return = expected_return;
    }

    public Integer getInvestment_duration() {
        return investment_duration;
    }

    public void setInvestment_duration(Integer investment_duration) {
        this.investment_duration = investment_duration;
    }
}