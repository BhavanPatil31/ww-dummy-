package com.wealthwise.wealthwise_backend.tax.dto;

import java.time.LocalDate;

public class TaxTransactionDTO {
    private String id;
    private String fundName;
    private LocalDate buyDate;
    private LocalDate sellDate;
    private Double units;
    private Double gain;
    private String type; // LTCG or STCG

    public TaxTransactionDTO() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

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

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
}
