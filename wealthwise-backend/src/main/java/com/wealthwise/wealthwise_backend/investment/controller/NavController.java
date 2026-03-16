package com.wealthwise.wealthwise_backend.investment.controller;

import com.wealthwise.wealthwise_backend.investment.service.NavService;
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
    public Double getNav(@PathVariable Long fundId) {
        return navService.getLatestNav(String.valueOf(fundId));
    }

    @GetMapping("/search")
    public List<Map<String, Object>> search(@RequestParam String q) {
        return navService.searchFunds(q);
    }
}
