package com.wealthwise.wealthwise_backend.investment.controller;

import com.wealthwise.wealthwise_backend.investment.entity.Investment;
import com.wealthwise.wealthwise_backend.investment.service.InvestmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    @Autowired
    private InvestmentService investmentService;

    @GetMapping("/{userId}")
    public Map<String, Object> getDashboardData(@PathVariable Long userId) {
        List<Investment> investments = investmentService.getUserInvestments(userId);

        double totalInvested = 0.0;
        double portfolioValue = 0.0;
        Map<String, Double> assetAllocationMap = new HashMap<>();

        for (Investment inv : investments) {
            // Check both amount and amount_invested for data robustness
            double amount = 0.0;
            if (inv.getAmount() != null) {
                amount = inv.getAmount();
            } else if (inv.getAmountInvested() != null) {
                amount = inv.getAmountInvested();
            }
            
            String type = inv.getInvestmentType();
            if (type == null || type.trim().isEmpty()) {
                type = "Other";
            }
            
            double currentInvested = amount;
            double currentVal = currentInvested;
            
            if (inv.getBuyDate() != null) {
                if ("SIP".equalsIgnoreCase(type)) {
                    long monthsPassed = java.time.temporal.ChronoUnit.MONTHS.between(inv.getBuyDate(), java.time.LocalDate.now());
                    if (monthsPassed < 0) monthsPassed = 0;
                    long n = monthsPassed + 1; 
                    currentInvested = amount * n;
                    
                    if (inv.getCurrentNav() != null && inv.getNavAtBuy() != null && inv.getNavAtBuy() > 0) {
                        currentVal = currentInvested * (inv.getCurrentNav() / inv.getNavAtBuy());
                    } else {
                        double i = 0.01; 
                        currentVal = amount * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
                    }
                } else {
                    long days = java.time.temporal.ChronoUnit.DAYS.between(inv.getBuyDate(), java.time.LocalDate.now());
                    if (days < 0) days = 0;
                    currentInvested = amount;
                    
                    if (inv.getCurrentNav() != null && inv.getNavAtBuy() != null && inv.getNavAtBuy() > 0) {
                        currentVal = currentInvested * (inv.getCurrentNav() / inv.getNavAtBuy());
                    } else {
                        double years = days / 365.25;
                        currentVal = currentInvested * Math.pow(1.12, years);
                    }
                }
            } else {
                if (inv.getCurrentNav() != null && inv.getNavAtBuy() != null && inv.getNavAtBuy() > 0) {
                    currentVal = currentInvested * (inv.getCurrentNav() / inv.getNavAtBuy());
                } else {
                    currentVal = currentInvested * 1.12;
                }
            }
            
            totalInvested += currentInvested;
            portfolioValue += currentVal;

            assetAllocationMap.put(type, assetAllocationMap.getOrDefault(type, 0.0) + currentInvested);
        }

        double profitLoss = portfolioValue - totalInvested;
        double returnPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0.0;

        List<Map<String, Object>> assetAllocation = assetAllocationMap.entrySet().stream().map(entry -> {
            Map<String, Object> map = new HashMap<>();
            map.put("name", entry.getKey());
            map.put("value", entry.getValue());
            return map;
        }).collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("totalInvested", totalInvested);
        response.put("portfolioValue", portfolioValue);
        response.put("profitLoss", profitLoss);
        response.put("returnPercentage", returnPercentage);
        response.put("assetAllocation", assetAllocation);

        return response;
    }
}
