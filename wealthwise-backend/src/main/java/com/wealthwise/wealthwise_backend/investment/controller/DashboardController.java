package com.wealthwise.wealthwise_backend.investment.controller;

import com.wealthwise.wealthwise_backend.investment.entity.Investment;
import com.wealthwise.wealthwise_backend.investment.service.InvestmentService;
import com.wealthwise.wealthwise_backend.portfolio.service.InvestmentValuationService;
import com.wealthwise.wealthwise_backend.investment.dto.PortfolioDTO;
import com.wealthwise.wealthwise_backend.portfolio.service.PortfolioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    @Autowired
    private PortfolioService portfolioService;

    @Autowired
    private InvestmentValuationService investmentValuationService;

    @GetMapping("/{userId}")
    public Map<String, Object> getDashboardData(@PathVariable Long userId) {
        List<Investment> investments = investmentService.getUserActiveInvestments(userId);

        double totalInvested = 0.0;
        double portfolioValue = 0.0;
        Map<String, Double> assetAllocationMap = new HashMap<>();

        for (Investment inv : investments) {
            String type = inv.getInvestmentType();
            if (type == null || type.trim().isEmpty()) {
                type = "Other";
            }

            InvestmentValuationService.Valuation valuation = investmentValuationService.value(inv, java.time.LocalDate.now());
            double currentInvested = valuation.getInvestedAmount().doubleValue();
            double currentVal = valuation.getCurrentValue().doubleValue();

            totalInvested += currentInvested;
            portfolioValue += currentVal;

            assetAllocationMap.put(type, assetAllocationMap.getOrDefault(type, 0.0) + currentVal);
        }

        double returnPercentage = totalInvested > 0 ? ((portfolioValue - totalInvested) / totalInvested) * 100 : 0.0;

        // Convert map to list of maps for Recharts
        List<Map<String, Object>> assetAllocation = assetAllocationMap.entrySet().stream().map(entry -> {
            Map<String, Object> map = new HashMap<>();
            map.put("name", entry.getKey());
            map.put("value", entry.getValue());
            return map;
        }).collect(Collectors.toList());

        double profitLoss = portfolioValue - totalInvested;

        Map<String, Object> response = new HashMap<>();
        response.put("totalInvested", totalInvested);
        response.put("portfolioValue", portfolioValue);
        response.put("profitLoss", profitLoss);
        response.put("returnPercentage", returnPercentage);
        response.put("assetAllocation", assetAllocation);
    public PortfolioDTO getDashboardData(@PathVariable Long userId) {
        return portfolioService.computeDetailedPortfolio(userId);
    }

    @GetMapping("/{userId}/history")
    public List<Map<String, Object>> getPortfolioHistory(@PathVariable Long userId, @RequestParam(defaultValue = "30") int days) {
        return portfolioService.computePortfolioHistory(userId, days);
    }
}
