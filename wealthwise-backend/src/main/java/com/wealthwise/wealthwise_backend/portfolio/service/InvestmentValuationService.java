package com.wealthwise.wealthwise_backend.portfolio.service;

import com.wealthwise.wealthwise_backend.investment.entity.Investment;
import com.wealthwise.wealthwise_backend.investment.service.NavService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Locale;

@Service
public class InvestmentValuationService {

    @Autowired
    private NavService navService;

    public static class Valuation {
        private final BigDecimal investedAmount;
        private final BigDecimal units;
        private final BigDecimal currentNav;
        private final BigDecimal currentValue;

        public Valuation(BigDecimal investedAmount, BigDecimal units, BigDecimal currentNav, BigDecimal currentValue) {
            this.investedAmount = investedAmount;
            this.units = units;
            this.currentNav = currentNav;
            this.currentValue = currentValue;
        }

        public BigDecimal getInvestedAmount() {
            return investedAmount;
        }

        public BigDecimal getUnits() {
            return units;
        }

        public BigDecimal getCurrentNav() {
            return currentNav;
        }

        public BigDecimal getCurrentValue() {
            return currentValue;
        }
    }

    public Valuation value(Investment inv, LocalDate valuationDate) {
        if (inv == null) {
            return new Valuation(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        }

        BigDecimal amount = bd(inv.getAmount());
        BigDecimal amountInvested = bd(inv.getAmountInvested());
        BigDecimal navAtBuy = bd(inv.getNavAtBuy());
        BigDecimal storedUnits = bd(inv.getUnits());
        BigDecimal currentNav = resolveCurrentNav(inv, valuationDate, navAtBuy);
        String type = inv.getInvestmentType() != null ? inv.getInvestmentType().trim() : "";

        if ("SIP".equalsIgnoreCase(type)) {
            return valueSip(inv, valuationDate, amount, amountInvested, navAtBuy, storedUnits, currentNav);
        }
        return valueLumpsum(amount, amountInvested, navAtBuy, storedUnits, currentNav);
    }

    private Valuation valueLumpsum(BigDecimal amount, BigDecimal amountInvested, BigDecimal navAtBuy, BigDecimal storedUnits, BigDecimal currentNav) {
        BigDecimal invested = amountInvested.compareTo(BigDecimal.ZERO) > 0 ? amountInvested : amount;
        BigDecimal units = storedUnits;

        if (units.compareTo(BigDecimal.ZERO) <= 0 && navAtBuy.compareTo(BigDecimal.ZERO) > 0) {
            units = safeDivide(invested, navAtBuy, 6);
        }

        BigDecimal currentValue = units.compareTo(BigDecimal.ZERO) > 0
                ? units.multiply(currentNav)
                : invested;

        return new Valuation(invested, units, currentNav, currentValue);
    }

    private Valuation valueSip(
            Investment inv,
            LocalDate valuationDate,
            BigDecimal installmentAmount,
            BigDecimal amountInvested,
            BigDecimal navAtBuy,
            BigDecimal storedUnits,
            BigDecimal currentNav
    ) {
        if (installmentAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return new Valuation(BigDecimal.ZERO, BigDecimal.ZERO, currentNav, BigDecimal.ZERO);
        }

        // If backend already has accumulated SIP units + invested amount, trust persisted data.
        if (amountInvested.compareTo(installmentAmount) > 0 && storedUnits.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal currentValue = storedUnits.multiply(currentNav);
            return new Valuation(amountInvested, storedUnits, currentNav, currentValue);
        }

        LocalDate start = inv.getStartDate() != null
                ? inv.getStartDate()
                : (inv.getBuyDate() != null ? inv.getBuyDate() : valuationDate);
        LocalDate end = inv.getEndDate() != null && inv.getEndDate().isBefore(valuationDate)
                ? inv.getEndDate()
                : valuationDate;

        if (start.isAfter(end)) {
            return new Valuation(BigDecimal.ZERO, BigDecimal.ZERO, currentNav, BigDecimal.ZERO);
        }

        BigDecimal simulatedInvested = BigDecimal.ZERO;
        BigDecimal simulatedUnits = BigDecimal.ZERO;
        LocalDate installmentDate = start;
        String fundId = inv.getFundId() != null ? String.valueOf(inv.getFundId()) : null;

        while (!installmentDate.isAfter(end)) {
            BigDecimal installmentNav = resolveInstallmentNav(fundId, installmentDate, navAtBuy, currentNav);
            simulatedInvested = simulatedInvested.add(installmentAmount);
            if (installmentNav.compareTo(BigDecimal.ZERO) > 0) {
                simulatedUnits = simulatedUnits.add(safeDivide(installmentAmount, installmentNav, 8));
            }
            installmentDate = nextInstallmentDate(installmentDate, inv.getFrequency());
        }

        BigDecimal currentValue = simulatedUnits.multiply(currentNav);
        return new Valuation(simulatedInvested, simulatedUnits, currentNav, currentValue);
    }

    private BigDecimal resolveCurrentNav(Investment inv, LocalDate valuationDate, BigDecimal navAtBuy) {
        if (inv.getFundId() != null) {
            try {
                Double liveNav = navService.getLatestNav(String.valueOf(inv.getFundId()));
                if (liveNav != null && liveNav > 0) {
                    return bd(liveNav);
                }
            } catch (Exception ignored) {
            }
        }

        BigDecimal existingCurrentNav = bd(inv.getCurrentNav());
        if (existingCurrentNav.compareTo(BigDecimal.ZERO) > 0) {
            return existingCurrentNav;
        }
        if (navAtBuy.compareTo(BigDecimal.ZERO) > 0) {
            return navAtBuy;
        }
        return BigDecimal.ONE;
    }

    private BigDecimal resolveInstallmentNav(String fundId, LocalDate installmentDate, BigDecimal navAtBuy, BigDecimal currentNav) {
        if (fundId != null && !fundId.trim().isEmpty()) {
            try {
                Double nav = navService.getNavForDate(fundId, installmentDate.toString());
                if (nav != null && nav > 0) {
                    return bd(nav);
                }
            } catch (Exception ignored) {
            }
        }
        if (navAtBuy.compareTo(BigDecimal.ZERO) > 0) {
            return navAtBuy;
        }
        if (currentNav.compareTo(BigDecimal.ZERO) > 0) {
            return currentNav;
        }
        return BigDecimal.ONE;
    }

    private LocalDate nextInstallmentDate(LocalDate current, String frequency) {
        String f = frequency == null ? "monthly" : frequency.trim().toLowerCase(Locale.ROOT);
        if ("weekly".equals(f)) {
            return current.plusWeeks(1);
        }
        if ("quarterly".equals(f)) {
            return current.plusMonths(3);
        }
        if ("yearly".equals(f) || "annual".equals(f) || "annually".equals(f)) {
            return current.plusYears(1);
        }
        if ("daily".equals(f)) {
            return current.plusDays(1);
        }
        return current.plusMonths(1);
    }

    private BigDecimal bd(Double value) {
        if (value == null) return BigDecimal.ZERO;
        return BigDecimal.valueOf(value);
    }

    private BigDecimal safeDivide(BigDecimal numerator, BigDecimal denominator, int scale) {
        if (denominator == null || denominator.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return numerator.divide(denominator, scale, RoundingMode.HALF_UP);
    }
}

