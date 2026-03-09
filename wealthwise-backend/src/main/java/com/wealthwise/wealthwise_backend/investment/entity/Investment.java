package com.wealthwise.wealthwise_backend.investment.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "investments")
public class Investment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long investment_id;

    private Long userId;

    private Long fund_id;

    private String investment_type;

    private Double amount;

    private Double units;

    private LocalDate buy_date;

    private Double nav_at_buy;

    private String frequency;

    private LocalDate created_date;

    public Investment(){}

    @PrePersist
    public void onCreate(){
        this.created_date = LocalDate.now();
    }

    public Long getInvestment_id() {
        return investment_id;
    }

    public void setInvestment_id(Long investment_id) {
        this.investment_id = investment_id;
    }

    public Long getUser_id() {
        return userId;
    }

    public void setUser_id(Long userId) {
        this.userId = userId;
    }

    public Long getFund_id() {
        return fund_id;
    }

    public void setFund_id(Long fund_id) {
        this.fund_id = fund_id;
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

    public Double getNav_at_buy() {
        return nav_at_buy;
    }

    public void setNav_at_buy(Double nav_at_buy) {
        this.nav_at_buy = nav_at_buy;
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
}