package com.wealthwise.wealthwise_backend.investment.service;

import com.wealthwise.wealthwise_backend.investment.entity.Investment;
import com.wealthwise.wealthwise_backend.investment.repository.InvestmentRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class InvestmentService {

    @Autowired
    private InvestmentRepository investmentRepository;

    public Investment addInvestment(Investment investment){
        return investmentRepository.save(investment);
    }

    public List<Investment> getUserInvestments(Long userId){
        return investmentRepository.findByUserId(userId);
    }
}
