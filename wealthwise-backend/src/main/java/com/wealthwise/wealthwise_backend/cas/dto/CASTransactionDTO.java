package com.wealthwise.wealthwise_backend.cas.dto;

public class CASTransactionDTO {
    private String fundName;
    private String buyDate;
    private String sellDate;
    private Double units;
    private Double gain;
    private String type;

    public CASTransactionDTO() {}

    public CASTransactionDTO(String fundName, String buyDate, String sellDate, Double units, Double gain, String type) {
        this.fundName = fundName;
        this.buyDate = buyDate;
        this.sellDate = sellDate;
        this.units = units;
        this.gain = gain;
        this.type = type;
    }

    public String getFundName() { return fundName; }
    public void setFundName(String fundName) { this.fundName = fundName; }

    public String getBuyDate() { return buyDate; }
    public void setBuyDate(String buyDate) { this.buyDate = buyDate; }

    public String getSellDate() { return sellDate; }
    public void setSellDate(String sellDate) { this.sellDate = sellDate; }

    public Double getUnits() { return units; }
    public void setUnits(Double units) { this.units = units; }

    public Double getGain() { return gain; }
    public void setGain(Double gain) { this.gain = gain; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
}
