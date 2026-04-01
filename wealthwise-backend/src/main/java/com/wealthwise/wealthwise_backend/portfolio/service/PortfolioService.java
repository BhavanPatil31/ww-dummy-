package com.wealthwise.wealthwise_backend.portfolio.service;

import com.wealthwise.wealthwise_backend.investment.entity.Investment;
import com.wealthwise.wealthwise_backend.investment.repository.InvestmentRepository;
import com.wealthwise.wealthwise_backend.portfolio.entity.Portfolio;
import com.wealthwise.wealthwise_backend.portfolio.repository.PortfolioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.wealthwise.wealthwise_backend.investment.service.NavService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Objects;

@Service
public class PortfolioService {

    @Autowired
    private PortfolioRepository portfolioRepository;

    @Autowired
    private InvestmentRepository investmentRepository;

    @Autowired
    private NavService navService;

    public Portfolio getPortfolioByUserId(Long userId) {
        Objects.requireNonNull(userId, "User ID cannot be null");
        return portfolioRepository.findByUserId(userId)
                .orElseGet(() -> updatePortfolio(userId));
    }

    @Transactional
    public Portfolio updatePortfolio(Long userId) {
        Objects.requireNonNull(userId, "User ID cannot be null");
        List<Investment> investments = Objects.requireNonNull(investmentRepository.findByUserId(userId), "Investment list cannot be null");
        
        BigDecimal totalInvested = BigDecimal.ZERO;
        BigDecimal totalUnits = BigDecimal.ZERO;
        BigDecimal currentValue = BigDecimal.ZERO;

        if (investments != null) {
            for (Investment inv : investments) {
                BigDecimal amount = BigDecimal.valueOf(inv.getAmount() != null ? inv.getAmount() : 0.0);
                BigDecimal units = BigDecimal.valueOf(inv.getUnits() != null ? inv.getUnits() : 0.0);
                
                totalInvested = totalInvested.add(amount);
                totalUnits = totalUnits.add(units);

                // Fetch real-time NAV
                Double liveNav = null;
                if (inv.getFundId() != null) {
                    liveNav = navService.getLatestNav(String.valueOf(inv.getFundId()));
                }

                double currentNav;
                if (liveNav != null) {
                    currentNav = liveNav;
                    // Update current_nav in database for this investment
                    inv.setCurrentNav(currentNav);
                    investmentRepository.save(inv);
                } else {
                    // Fallback to existing or simulated
                    double navAtBuy = inv.getNavAtBuy() != null ? inv.getNavAtBuy() : 1.0;
                    currentNav = inv.getCurrentNav() != null ? inv.getCurrentNav() : navAtBuy * 1.07;
                }
                
                currentValue = currentValue.add(units.multiply(BigDecimal.valueOf(currentNav)));
            }
        }

        BigDecimal returnPercentage = BigDecimal.ZERO;
        if (totalInvested.compareTo(BigDecimal.ZERO) > 0) {
            returnPercentage = currentValue.subtract(totalInvested)
                    .divide(totalInvested, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        Portfolio portfolio = portfolioRepository.findByUserId(userId).orElse(new Portfolio());
        portfolio.setUserId(userId);
        portfolio.setTotal_invested(totalInvested);
        portfolio.setTotal_units(totalUnits);
        portfolio.setCurrent_value(currentValue);
        portfolio.setReturn_percentage(returnPercentage);
        
        // Mock XIRR and CAGR for now
        portfolio.setXirr(returnPercentage.multiply(BigDecimal.valueOf(0.8))); 
        portfolio.setCagr(returnPercentage.multiply(BigDecimal.valueOf(0.9)));

        return Objects.requireNonNull(portfolioRepository.save(portfolio), "Saved portfolio cannot be null");
    }

    @Transactional(readOnly = true)
    public String generateCsvExport(Long userId) {
        Objects.requireNonNull(userId, "User ID cannot be null");
        List<Investment> investments = investmentRepository.findByUserId(userId);
        
        StringBuilder csv = new StringBuilder();
        csv.append("Scheme Name,Investment Type,Amount,Units,Buy Date,NAV at Buy,Current NAV,Current Value\n");
        
        if (investments != null) {
            for (Investment inv : investments) {
                String scheme = inv.getSchemeName() != null ? inv.getSchemeName().replace(",", " ") : "N/A";
                String type = inv.getInvestmentType() != null ? inv.getInvestmentType() : "N/A";
                double amount = inv.getAmount() != null ? inv.getAmount() : 0.0;
                double units = inv.getUnits() != null ? inv.getUnits() : 0.0;
                String buyDate = inv.getBuyDate() != null ? inv.getBuyDate().toString() : "N/A";
                double navAtBuy = inv.getNavAtBuy() != null ? inv.getNavAtBuy() : 0.0;
                double currentNav = inv.getCurrentNav() != null ? inv.getCurrentNav() : 0.0;
                double currentValue = units * currentNav;

                csv.append(String.format("%s,%s,%.2f,%.4f,%s,%.4f,%.4f,%.2f\n", 
                    scheme, type, amount, units, buyDate, navAtBuy, currentNav, currentValue));
            }
        }
        return csv.toString();
    }
}
