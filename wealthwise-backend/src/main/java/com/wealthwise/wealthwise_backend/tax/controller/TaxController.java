package com.wealthwise.wealthwise_backend.tax.controller;

import com.wealthwise.wealthwise_backend.tax.dto.TaxTransactionDTO;
import com.wealthwise.wealthwise_backend.tax.service.TaxService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/taxes")
@CrossOrigin(origins = "*")
public class TaxController {

    @Autowired
    private TaxService taxService;

    @GetMapping("/user/{userId}")
    public List<TaxTransactionDTO> getTaxes(@PathVariable Long userId, @RequestParam(required = false) String financialYear) {
        return taxService.getTaxSummary(userId, financialYear);
    }
}
