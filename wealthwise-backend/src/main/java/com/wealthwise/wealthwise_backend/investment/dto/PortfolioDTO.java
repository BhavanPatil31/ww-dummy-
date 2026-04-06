package com.wealthwise.wealthwise_backend.investment.dto;

import java.util.List;
import java.util.Map;

public class PortfolioDTO {
    private double totalInvested;
    private double portfolioValue;
    private double profitLoss;
    private double returnPercentage;
    private double realizedProfitLoss;
    private String userName;
    private List<HoldingDTO> activeHoldings;
    private List<Map<String, Object>> assetAllocation;
    private List<InvestmentActivityDTO> recentActivity;

    // Getters and Setters
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public double getTotalInvested() { return totalInvested; }
    public void setTotalInvested(double totalInvested) { this.totalInvested = totalInvested; }

    public double getPortfolioValue() { return portfolioValue; }
    public void setPortfolioValue(double portfolioValue) { this.portfolioValue = portfolioValue; }

    public double getProfitLoss() { return profitLoss; }
    public void setProfitLoss(double profitLoss) { this.profitLoss = profitLoss; }

    public double getReturnPercentage() { return returnPercentage; }
    public void setReturnPercentage(double returnPercentage) { this.returnPercentage = returnPercentage; }

    public double getRealizedProfitLoss() { return realizedProfitLoss; }
    public void setRealizedProfitLoss(double realizedProfitLoss) { this.realizedProfitLoss = realizedProfitLoss; }

    public List<HoldingDTO> getActiveHoldings() { return activeHoldings; }
    public void setActiveHoldings(List<HoldingDTO> activeHoldings) { this.activeHoldings = activeHoldings; }

    public List<Map<String, Object>> getAssetAllocation() { return assetAllocation; }
    public void setAssetAllocation(List<Map<String, Object>> assetAllocation) { this.assetAllocation = assetAllocation; }

    public List<InvestmentActivityDTO> getRecentActivity() { return recentActivity; }
    public void setRecentActivity(List<InvestmentActivityDTO> recentActivity) { this.recentActivity = recentActivity; }
}

class InvestmentActivityDTO {
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
