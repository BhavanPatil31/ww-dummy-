package com.wealthwise.wealthwise_backend.portfolio.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "portfolio")
public class Portfolio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer portfolio_id;

    @Column(name = "user_id")
    private Long userId;

    @Column(precision = 12, scale = 4)
    private BigDecimal total_units;

    @Column(precision = 12, scale = 2)
    private BigDecimal total_invested;

    @Column(precision = 12, scale = 2)
    private BigDecimal current_value;

    @Column(precision = 8, scale = 2)
    private BigDecimal return_percentage;

    @Column(precision = 8, scale = 2)
    private BigDecimal xirr;

    @Column(precision = 8, scale = 2)
    private BigDecimal cagr;

    public Portfolio() {}

    public Integer getPortfolio_id() {
        return portfolio_id;
    }

    public void setPortfolio_id(Integer portfolio_id) {
        this.portfolio_id = portfolio_id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public BigDecimal getTotal_units() {
        return total_units;
    }

    public void setTotal_units(BigDecimal total_units) {
        this.total_units = total_units;
    }

    public BigDecimal getTotal_invested() {
        return total_invested;
    }

    public void setTotal_invested(BigDecimal total_invested) {
        this.total_invested = total_invested;
    }

    public BigDecimal getCurrent_value() {
        return current_value;
    }

    public void setCurrent_value(BigDecimal current_value) {
        this.current_value = current_value;
    }

    public BigDecimal getReturn_percentage() {
        return return_percentage;
    }

    public void setReturn_percentage(BigDecimal return_percentage) {
        this.return_percentage = return_percentage;
    }

    public BigDecimal getXirr() {
        return xirr;
    }

    public void setXirr(BigDecimal xirr) {
        this.xirr = xirr;
    }

    public BigDecimal getCagr() {
        return cagr;
    }

    public void setCagr(BigDecimal cagr) {
        this.cagr = cagr;
    }
}
