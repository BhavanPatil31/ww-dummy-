package com.wealthwise.wealthwise_backend.tax.entity;

import javax.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "tax_transactions")
public class TaxTransaction {

    @Id
    @Column(name = "transaction_id", length = 50)
    private String transactionId;

    @Column(name = "user_id", length = 50, nullable = false)
    private String userId;

    @Column(name = "fund_name", length = 255, nullable = false)
    private String fundName;

    @Column(name = "buy_date", nullable = false)
    private LocalDate buyDate;

    @Column(name = "sell_date", nullable = false)
    private LocalDate sellDate;

    @Column(nullable = false)
    private Double units;

    @Column(nullable = false)
    private Double gain;

    @Column(name = "tax_type", length = 10, nullable = false)
    private String taxType;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public TaxTransaction() {}

    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getFundName() { return fundName; }
    public void setFundName(String fundName) { this.fundName = fundName; }

    public LocalDate getBuyDate() { return buyDate; }
    public void setBuyDate(LocalDate buyDate) { this.buyDate = buyDate; }

    public LocalDate getSellDate() { return sellDate; }
    public void setSellDate(LocalDate sellDate) { this.sellDate = sellDate; }

    public Double getUnits() { return units; }
    public void setUnits(Double units) { this.units = units; }

    public Double getGain() { return gain; }
    public void setGain(Double gain) { this.gain = gain; }

    public String getTaxType() { return taxType; }
    public void setTaxType(String taxType) { this.taxType = taxType; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
