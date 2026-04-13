package com.wealthwise.wealthwise_backend.investment.controller;

import com.wealthwise.wealthwise_backend.investment.service.NavService;
import com.wealthwise.wealthwise_backend.investment.dto.MfApiResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/nav")
@CrossOrigin(origins = "*")
public class NavController {

    @Autowired
    private NavService navService;

    @GetMapping("/{fundId}")
    public Double getNav(@PathVariable Long fundId, @RequestParam(required = false) String date) {
        if (date != null && !date.trim().isEmpty()) {
            return navService.getNavForDate(String.valueOf(fundId), date);
        }
        return navService.getLatestNav(String.valueOf(fundId));
    }

    @GetMapping("/search")
    public List<Map<String, Object>> search(@RequestParam(required = false, defaultValue = "") String q) {
        return navService.searchFunds(q);
    }

    @GetMapping("/history/{fundId}")
    public MfApiResponse history(@PathVariable Long fundId) {
        return navService.getFundHistory(String.valueOf(fundId));
    }
}
