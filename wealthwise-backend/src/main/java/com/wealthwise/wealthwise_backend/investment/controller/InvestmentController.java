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

    @GetMapping("/user/{userId}/active")
    public List<Investment> getUserActiveInvestments(@PathVariable Long userId){
        return investmentService.getUserActiveInvestments(userId);
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
        Double sellNav = null;
        if (payload != null) {
            if (payload.containsKey("sellDate") && payload.get("sellDate") != null) {
                sellDate = java.time.LocalDate.parse(payload.get("sellDate"));
            }
            if (payload.containsKey("sellNav") && payload.get("sellNav") != null) {
                try {
                    sellNav = Double.parseDouble(payload.get("sellNav"));
                } catch (NumberFormatException e) {
                    sellNav = null;
                }
            }
        }
        return investmentService.sellInvestment(id, sellDate, sellNav);
    }
    @DeleteMapping("/user/{userId}/all")
    public void deleteAllInvestments(@PathVariable("userId") Long userId) {
        investmentService.deleteAllInvestments(userId);
    }
}
