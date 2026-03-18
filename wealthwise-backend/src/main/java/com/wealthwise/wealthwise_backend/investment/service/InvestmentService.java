package com.wealthwise.wealthwise_backend.investment.service;

import com.wealthwise.wealthwise_backend.investment.entity.Investment;
import com.wealthwise.wealthwise_backend.investment.repository.InvestmentRepository;
import com.wealthwise.wealthwise_backend.notification.NotificationService;
import com.wealthwise.wealthwise_backend.portfolio.service.PortfolioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class InvestmentService {

    @Autowired
    private InvestmentRepository investmentRepository;

    @Autowired
    @Lazy
    private PortfolioService portfolioService;

    @Autowired
    private NotificationService notificationService;

    public Investment addInvestment(Investment investment) {
        Investment saved = investmentRepository.save(investment);
        if (saved.getUserId() != null) {
            portfolioService.updatePortfolio(saved.getUserId());
            
            // Create notification
            String msg = "New " + saved.getInvestmentType() + " investment of ₹" + saved.getAmount() + " in " + saved.getSchemeName() + " added successfully.";
            notificationService.createNotification(saved.getUserId(), msg, "INVESTMENT");

            // Check if end_date is approaching or reached today
            if (saved.getEndDate() != null) {
                LocalDate today = LocalDate.now();
                if (saved.getEndDate().isEqual(today)) {
                    notificationService.createNotification(saved.getUserId(), "Important: Today is the end date of your investment in " + saved.getSchemeName() + ".", "INVESTMENT_DUE");
                } else if (saved.getEndDate().isEqual(today.plusDays(7))) {
                    notificationService.createNotification(saved.getUserId(), "Notice: Your investment in " + saved.getSchemeName() + " will end in 7 days.", "INVESTMENT_DUE");
                }
            }
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
            existing.setSchemeName(investment.getSchemeName());
            existing.setAmount(investment.getAmount());
            
            // Explicitly sync amount_invested if it's null or we want to ensure it matches amount
            // Adjusting based on user report: "amount invested still stores the previous value"
            if (investment.getAmountInvested() != null) {
                existing.setAmountInvested(investment.getAmountInvested());
            } else {
                existing.setAmountInvested(investment.getAmount());
            }

            existing.setNavAtBuy(investment.getNavAtBuy());
            
            // Sync current_nav if not provided
            if (investment.getCurrentNav() != null) {
                existing.setCurrentNav(investment.getCurrentNav());
            } else if (existing.getCurrentNav() == null) {
                existing.setCurrentNav(investment.getNavAtBuy());
            }

            existing.setUnits(investment.getUnits());
            existing.setBuyDate(investment.getBuyDate() != null ? investment.getBuyDate() : investment.getStartDate());
            existing.setStartDate(investment.getStartDate() != null ? investment.getStartDate() : investment.getBuyDate());
            existing.setEndDate(investment.getEndDate());
            existing.setFrequency(investment.getFrequency());
            
            // Update additional metadata if available
            if (investment.getAssetCategory() != null) existing.setAssetCategory(investment.getAssetCategory());
            if (investment.getPlatform() != null) existing.setPlatform(investment.getPlatform());
            if (investment.getNotes() != null) existing.setNotes(investment.getNotes());
            if (investment.getExpectedReturn() != null) existing.setExpectedReturn(investment.getExpectedReturn());
            if (investment.getInvestmentDuration() != null) existing.setInvestmentDuration(investment.getInvestmentDuration());
            if (investment.getInvestmentGoal() != null) existing.setInvestmentGoal(investment.getInvestmentGoal());
            if (investment.getRiskLevel() != null) existing.setRiskLevel(investment.getRiskLevel());
            
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
