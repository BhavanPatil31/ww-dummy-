package com.wealthwise.wealthwise_backend.investment.dto;

public class HoldingDTO {
    private Long fundId;
    private String fundName;
    private double totalUnits;
    private double investedAmount;
    private double currentValue;
    private double latestNav;
    private double returnPercentage;
    private double profitLoss;

    // Getters and Setters
    public Long getFundId() { return fundId; }
    public void setFundId(Long fundId) { this.fundId = fundId; }

    public String getFundName() { return fundName; }
    public void setFundName(String fundName) { this.fundName = fundName; }

    public double getTotalUnits() { return totalUnits; }
    public void setTotalUnits(double totalUnits) { this.totalUnits = totalUnits; }

    public double getInvestedAmount() { return investedAmount; }
    public void setInvestedAmount(double investedAmount) { this.investedAmount = investedAmount; }

    public double getCurrentValue() { return currentValue; }
    public void setCurrentValue(double currentValue) { this.currentValue = currentValue; }

    public double getLatestNav() { return latestNav; }
    public void setLatestNav(double latestNav) { this.latestNav = latestNav; }

    public double getReturnPercentage() { return returnPercentage; }
    public void setReturnPercentage(double returnPercentage) { this.returnPercentage = returnPercentage; }

    public double getProfitLoss() { return profitLoss; }
    public void setProfitLoss(double profitLoss) { this.profitLoss = profitLoss; }
}
