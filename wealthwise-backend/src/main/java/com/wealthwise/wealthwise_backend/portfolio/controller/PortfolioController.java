package com.wealthwise.wealthwise_backend.portfolio.controller;

import com.wealthwise.wealthwise_backend.portfolio.entity.Portfolio;
import com.wealthwise.wealthwise_backend.portfolio.service.PortfolioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

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

    @GetMapping("/export/{userId}")
    public ResponseEntity<byte[]> exportPortfolioToCsv(@PathVariable Long userId) {
        String csvData = portfolioService.generateCsvExport(userId);
        byte[] output = csvData.getBytes();
        
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=wealthwise_export.csv");
        headers.setContentType(MediaType.parseMediaType("text/csv"));
        
        return ResponseEntity.ok()
                .headers(headers)
                .body(output);
    }
}
