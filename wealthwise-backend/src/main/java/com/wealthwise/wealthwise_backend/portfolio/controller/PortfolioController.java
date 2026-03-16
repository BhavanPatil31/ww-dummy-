package com.wealthwise.wealthwise_backend.portfolio.controller;

import com.wealthwise.wealthwise_backend.portfolio.entity.Portfolio;
import com.wealthwise.wealthwise_backend.portfolio.service.PortfolioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/portfolio")
@CrossOrigin(origins = "*")
public class PortfolioController {

    @Autowired
    private PortfolioService portfolioService;

    @GetMapping("/user/{userId}")
    public Portfolio getPortfolio(@PathVariable Long userId) {
        return portfolioService.getPortfolioByUserId(userId);
    }

    @PostMapping("/refresh/{userId}")
    public Portfolio refreshPortfolio(@PathVariable Long userId) {
        return portfolioService.updatePortfolio(userId);
    }
}
