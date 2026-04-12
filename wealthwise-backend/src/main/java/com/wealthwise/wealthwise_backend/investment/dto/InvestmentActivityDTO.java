package com.wealthwise.wealthwise_backend.investment.dto;

public class InvestmentActivityDTO {
    private String schemeName;
    private String type;
    private String date;
    private double amount;

    public String getSchemeName() { return schemeName; }
    public void setSchemeName(String schemeName) { this.schemeName = schemeName; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }
}
