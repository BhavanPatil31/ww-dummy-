package com.wealthwise.wealthwise_backend.investment.dto;

import java.util.List;
import java.util.Map;

public class PortfolioDTO {
    private double totalInvested;
    private double portfolioValue;
    private double profitLoss;
    private double returnPercentage;
    private double xirr;
    private double cagr;
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

    public double getXirr() { return xirr; }
    public void setXirr(double xirr) { this.xirr = xirr; }

    public double getCagr() { return cagr; }
    public void setCagr(double cagr) { this.cagr = cagr; }

    public double getRealizedProfitLoss() { return realizedProfitLoss; }
    public void setRealizedProfitLoss(double realizedProfitLoss) { this.realizedProfitLoss = realizedProfitLoss; }

    public List<HoldingDTO> getActiveHoldings() { return activeHoldings; }
    public void setActiveHoldings(List<HoldingDTO> activeHoldings) { this.activeHoldings = activeHoldings; }

    public List<Map<String, Object>> getAssetAllocation() { return assetAllocation; }
    public void setAssetAllocation(List<Map<String, Object>> assetAllocation) { this.assetAllocation = assetAllocation; }

    public List<InvestmentActivityDTO> getRecentActivity() { return recentActivity; }
    public void setRecentActivity(List<InvestmentActivityDTO> recentActivity) { this.recentActivity = recentActivity; }
}

