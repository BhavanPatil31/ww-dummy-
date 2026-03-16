package com.wealthwise.wealthwise_backend.investment.service;

import com.wealthwise.wealthwise_backend.investment.entity.Investment;
import com.wealthwise.wealthwise_backend.investment.repository.InvestmentRepository;
import com.wealthwise.wealthwise_backend.portfolio.service.PortfolioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class InvestmentService {

    @Autowired
    private InvestmentRepository investmentRepository;

    @Autowired
    @Lazy
    private PortfolioService portfolioService;

    public Investment addInvestment(Investment investment) {
        Investment saved = investmentRepository.save(investment);
        if (saved.getUserId() != null) {
            portfolioService.updatePortfolio(saved.getUserId());
        }
        return saved;
    }

    public List<Investment> getUserInvestments(Long userId) {
        return investmentRepository.findByUserId(userId);
    }

    @Transactional
    public Investment updateInvestment(Long id, Investment investment) {
        Investment existing = investmentRepository.findById(id).orElse(null);
        if (existing != null) {
            // Update core fields
            existing.setScheme_name(investment.getScheme_name());
            existing.setAmount(investment.getAmount());
            
            // Explicitly sync amount_invested if it's null or we want to ensure it matches amount
            // Adjusting based on user report: "amount invested still stores the previous value"
            if (investment.getAmount_invested() != null) {
                existing.setAmount_invested(investment.getAmount_invested());
            } else {
                existing.setAmount_invested(investment.getAmount());
            }

            existing.setNav_at_buy(investment.getNav_at_buy());
            
            // Sync current_nav if not provided
            if (investment.getCurrent_nav() != null) {
                existing.setCurrent_nav(investment.getCurrent_nav());
            } else if (existing.getCurrent_nav() == null) {
                existing.setCurrent_nav(investment.getNav_at_buy());
            }

            existing.setUnits(investment.getUnits());
            existing.setBuy_date(investment.getBuy_date() != null ? investment.getBuy_date() : investment.getStart_date());
            existing.setStart_date(investment.getStart_date() != null ? investment.getStart_date() : investment.getBuy_date());
            existing.setFrequency(investment.getFrequency());
            
            // Update additional metadata if available
            if (investment.getAsset_category() != null) existing.setAsset_category(investment.getAsset_category());
            if (investment.getPlatform() != null) existing.setPlatform(investment.getPlatform());
            if (investment.getNotes() != null) existing.setNotes(investment.getNotes());
            if (investment.getExpected_return() != null) existing.setExpected_return(investment.getExpected_return());
            if (investment.getInvestment_duration() != null) existing.setInvestment_duration(investment.getInvestment_duration());
            if (investment.getInvestment_goal() != null) existing.setInvestment_goal(investment.getInvestment_goal());
            if (investment.getRisk_level() != null) existing.setRisk_level(investment.getRisk_level());
            
            Investment saved = investmentRepository.save(existing);
            
            // Force portfolio recalculation
            if (saved.getUserId() != null) {
                portfolioService.updatePortfolio(saved.getUserId());
            }
            return saved;
        }
        return null;
    }

    @Transactional
    public void deleteInvestment(Long id) {
        Investment inv = investmentRepository.findById(id).orElse(null);
        if (inv != null) {
            Long userId = inv.getUserId();
            investmentRepository.deleteById(id);
            if (userId != null) {
                portfolioService.updatePortfolio(userId);
            }
        }
    }
}
