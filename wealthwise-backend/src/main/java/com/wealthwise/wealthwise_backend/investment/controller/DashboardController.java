package com.wealthwise.wealthwise_backend.investment.controller;

import com.wealthwise.wealthwise_backend.investment.entity.Investment;
import com.wealthwise.wealthwise_backend.investment.service.InvestmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
        Map<String, Double> assetAllocationMap = new HashMap<>();

        for (Investment inv : investments) {
            double amount = inv.getAmount() != null ? inv.getAmount() : 0.0;
            totalInvested += amount;

            String type = inv.getInvestment_type();
            if (type == null || type.trim().isEmpty()) {
                type = "Other";
            }
            assetAllocationMap.put(type, assetAllocationMap.getOrDefault(type, 0.0) + amount);
        }

        // Mock portfolio value (e.g., 12.5% return) for demonstration
        double portfolioValue = totalInvested * 1.125;
        double returnPercentage = totalInvested > 0 ? ((portfolioValue - totalInvested) / totalInvested) * 100 : 0.0;

        // Convert map to list of maps for Recharts
        List<Map<String, Object>> assetAllocation = assetAllocationMap.entrySet().stream().map(entry -> {
            Map<String, Object> map = new HashMap<>();
            map.put("name", entry.getKey());
            map.put("value", entry.getValue());
            return map;
        }).toList();

        Map<String, Object> response = new HashMap<>();
        response.put("totalInvested", totalInvested);
        response.put("portfolioValue", portfolioValue);
        response.put("returnPercentage", returnPercentage);
        response.put("assetAllocation", assetAllocation);

        return response;
    }
}
