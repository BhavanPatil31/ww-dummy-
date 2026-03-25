package com.wealthwise.wealthwise_backend.investment.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.wealthwise.wealthwise_backend.investment.service.MutualFundService;

@RestController
@RequestMapping("/api/mf")
@CrossOrigin(origins = "*") // Allow frontend to call
public class MutualFundController {

    @Autowired
    private MutualFundService mutualFundService;

    @GetMapping("/list")
    public List<Map<String, Object>> getFundList() {
        return mutualFundService.getFundList();
    }

    @GetMapping("/{schemeCode}")
    public Map<String, Object> getFundDetails(@PathVariable String schemeCode) {
        return mutualFundService.getFundDetails(schemeCode);
    }

    @GetMapping("/search")
    public List<Map<String, Object>> searchFunds(String query) {
        return mutualFundService.searchFunds(query);
    }
}
