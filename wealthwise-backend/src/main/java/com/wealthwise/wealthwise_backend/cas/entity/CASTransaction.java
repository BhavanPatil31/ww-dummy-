package com.wealthwise.wealthwise_backend.cas.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "cas_transactions")
public class CASTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "cas_id", nullable = false)
    private CASData casData;

    @Column(name = "fund_name", nullable = false)
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

    public CASTransaction() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public CASData getCasData() { return casData; }
    public void setCasData(CASData casData) { this.casData = casData; }

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
}
