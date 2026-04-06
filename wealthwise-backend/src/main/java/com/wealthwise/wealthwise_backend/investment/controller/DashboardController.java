package com.wealthwise.wealthwise_backend.investment.controller;

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

    @GetMapping("/{userId}")
    public PortfolioDTO getDashboardData(@PathVariable Long userId) {
        return portfolioService.computeDetailedPortfolio(userId);
    }

    @GetMapping("/{userId}/history")
    public List<Map<String, Object>> getPortfolioHistory(@PathVariable Long userId, @RequestParam(defaultValue = "30") int days) {
        return portfolioService.computePortfolioHistory(userId, days);
    }
}
