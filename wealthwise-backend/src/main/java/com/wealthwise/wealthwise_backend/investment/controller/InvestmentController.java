package com.wealthwise.wealthwise_backend.investment.controller;

import com.wealthwise.wealthwise_backend.investment.entity.Investment;
import com.wealthwise.wealthwise_backend.investment.service.InvestmentService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/investments")
@CrossOrigin(origins = "*")
public class InvestmentController {

    @Autowired
    private InvestmentService investmentService;

    @PostMapping("/add")
    public Investment addInvestment(@RequestBody Investment investment){

        return investmentService.addInvestment(investment);
    }

    @GetMapping("/user/{userId}")
    public List<Investment> getUserInvestments(@PathVariable Long userId){

        return investmentService.getUserInvestments(userId);
    }

    @PutMapping("/{id}")
    public Investment updateInvestment(@PathVariable("id") Long id, @RequestBody Investment investment) {
        return investmentService.updateInvestment(id, investment);
    }

    @DeleteMapping("/{id}")
    public void deleteInvestment(@PathVariable("id") Long id) {
        investmentService.deleteInvestment(id);
    }

    @PostMapping("/{id}/sell")
    public Investment sellInvestment(@PathVariable("id") Long id, @RequestBody(required = false) java.util.Map<String, String> payload) {
        java.time.LocalDate sellDate = java.time.LocalDate.now();
        if (payload != null && payload.containsKey("sellDate") && payload.get("sellDate") != null) {
            sellDate = java.time.LocalDate.parse(payload.get("sellDate"));
        }
        return investmentService.sellInvestment(id, sellDate);
    }
}