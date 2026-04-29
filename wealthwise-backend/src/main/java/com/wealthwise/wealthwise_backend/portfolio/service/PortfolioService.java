package com.wealthwise.wealthwise_backend.portfolio.service;

import com.wealthwise.wealthwise_backend.auth.repository.UserRepository;
import com.wealthwise.wealthwise_backend.investment.dto.HoldingDTO;
import com.wealthwise.wealthwise_backend.investment.dto.InvestmentActivityDTO;
import com.wealthwise.wealthwise_backend.investment.dto.PortfolioDTO;
import com.wealthwise.wealthwise_backend.investment.entity.Investment;
import com.wealthwise.wealthwise_backend.investment.repository.InvestmentRepository;
import com.wealthwise.wealthwise_backend.investment.service.NavService;
import com.wealthwise.wealthwise_backend.portfolio.entity.Portfolio;
import com.wealthwise.wealthwise_backend.portfolio.repository.PortfolioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PortfolioService {

    @Autowired
    private PortfolioRepository portfolioRepository;

    @Autowired
    private InvestmentRepository investmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NavService navService;


    public PortfolioDTO computeDetailedPortfolio(Long userId) {
        List<Investment> allInvestments = investmentRepository.findByUserId(userId);
        LocalDate today = LocalDate.now();

        // Strict Separation Logic
        // Active = endDate is NULL OR endDate > today (only if not invalid)
        // Closed = endDate is NOT NULL AND endDate <= today AND endDate >= startDate
        // Invalid = endDate != null AND endDate < startDate (Ignore these)
        List<Investment> activeInvestments = allInvestments.stream()
            .filter(inv -> {
                // EXCLUSIVE RULE: Any end date means it goes to Tax Report only.
                if (inv.getEndDate() != null) return false;
                
                String status = inv.getStatus();
                if (status != null) {
                    String s = status.trim().toUpperCase();
                    if ("SOLD".equals(s) || "CLOSED".equals(s) || "DELETED".equals(s)) return false;
                }
                
                return true; 
            })
            .collect(Collectors.toList());

        List<Investment> investments = activeInvestments; 

        Map<Long, HoldingDTO> holdingsMap = new HashMap<>();
        double totalInvested = 0.0;
        List<CashFlow> cashFlows = new ArrayList<>();
        
        // Sort investments by date to ensure SIPs are processed correctly
        investments.sort(Comparator.comparing(inv -> inv.getBuyDate() != null ? inv.getBuyDate() : (inv.getStartDate() != null ? inv.getStartDate() : LocalDate.MIN)));

        for (Investment inv : investments) {
            String type = inv.getInvestmentType();
            Long fundId = inv.getFundId();
            if (fundId == null) continue;

            HoldingDTO holding = holdingsMap.getOrDefault(fundId, new HoldingDTO());
            holding.setFundId(fundId);
            holding.setFundName(inv.getSchemeName());

            if ("BUY".equalsIgnoreCase(type) || "Lumpsum".equalsIgnoreCase(type)) {
                double amount = inv.getAmount() != null ? inv.getAmount() : (inv.getAmountInvested() != null ? inv.getAmountInvested() : 0.0);
                double nav = inv.getNavAtBuy() != null ? inv.getNavAtBuy() : 1.0;
                double units = inv.getUnits() != null ? inv.getUnits() : 0.0;

                if (units <= 0 || (amount > 0 && nav > 0 && units > amount / nav * 1000.0)) {
                    units = amount / nav;
                    inv.setUnits(units);
                }

                holding.setTotalUnits(holding.getTotalUnits() + units);
                holding.setInvestedAmount(holding.getInvestedAmount() + amount);
                totalInvested += amount;
                LocalDate flowDate = inv.getBuyDate() != null ? inv.getBuyDate()
                        : (inv.getStartDate() != null ? inv.getStartDate() : today);
                if (amount > 0) {
                    cashFlows.add(new CashFlow(flowDate, -amount));
                }
                
            } else if ("SIP".equalsIgnoreCase(type)) {
                LocalDate start = inv.getStartDate() != null ? inv.getStartDate() : inv.getBuyDate();
                LocalDate end = inv.getEndDate();
                // If it's an active SIP with a future end date, we only calculate up to today for current value
                LocalDate calcEnd = (end != null && end.isBefore(today)) ? end : today;
                
                String freq = inv.getFrequency() != null ? inv.getFrequency() : "Monthly";
                double amountPerInst = inv.getAmount() != null && inv.getAmount() > 0
                        ? inv.getAmount()
                        : (inv.getAmountInvested() != null ? inv.getAmountInvested() : 0.0);

                double sipTotalUnits = 0.0;
                double sipTotalInvested = 0.0;

                LocalDate currentInstDate = start;
                while (currentInstDate != null && !currentInstDate.isAfter(calcEnd)) {
                    Double navOnDate = navService.getNavForDate(String.valueOf(fundId), currentInstDate.toString());
                    double navOnDateValue = isUsableNav(navOnDate, inv)
                            ? navOnDate
                            : fallbackNav(inv);
                    double unitsOnDate = navOnDateValue > 0 ? amountPerInst / navOnDateValue : 0.0;
                    
                    sipTotalUnits += unitsOnDate;
                    sipTotalInvested += amountPerInst;
                    if (amountPerInst > 0) {
                        cashFlows.add(new CashFlow(currentInstDate, -amountPerInst));
                    }

                    if ("Weekly".equalsIgnoreCase(freq)) currentInstDate = currentInstDate.plusWeeks(1);
                    else if ("Monthly".equalsIgnoreCase(freq)) currentInstDate = currentInstDate.plusMonths(1);
                    else if ("Quarterly".equalsIgnoreCase(freq)) currentInstDate = currentInstDate.plusMonths(3);
                    else if ("Yearly".equalsIgnoreCase(freq)) currentInstDate = currentInstDate.plusYears(1);
                    else break;
                }
                
                // Do not persist cumulative SIP totals back to the original investment row.
                // The investment should keep the periodic SIP amount and the original units state.
                holding.setTotalUnits(holding.getTotalUnits() + sipTotalUnits);
                holding.setInvestedAmount(holding.getInvestedAmount() + sipTotalInvested);
                totalInvested += sipTotalInvested;
            }
            holdingsMap.put(fundId, holding);
        }

        // Finalize active holdings
        List<HoldingDTO> activeHoldings = new ArrayList<>();
        double totalCurrentValue = 0.0;
        Map<String, Double> allocationMap = new HashMap<>();
        Map<Long, Double> fundNavMap = new HashMap<>();

        for (HoldingDTO holding : holdingsMap.values()) {
            if (holding.getTotalUnits() > 0.0001) {
                Double latestNav = navService.getLatestNav(String.valueOf(holding.getFundId()));
                if (!isUsableNav(latestNav, findFirstInvestmentByFund(investments, holding.getFundId()))) {
                    // Bug fix: fallbackNavForFund returns 0.0 when no usable nav is found.
                    // Store null in that case so we don't misleadingly set latestNav=0.
                    double fallback = fallbackNavForFund(investments, holding.getFundId());
                    latestNav = fallback > 0 ? fallback : null;
                }
                holding.setLatestNav(latestNav);
                holding.setCurrentValue(holding.getTotalUnits() * (latestNav != null ? latestNav : 0.0));
                holding.setProfitLoss(holding.getCurrentValue() - holding.getInvestedAmount());
                holding.setReturnPercentage(holding.getInvestedAmount() > 0 ? (holding.getProfitLoss() / holding.getInvestedAmount()) * 100 : 0);
                
                totalCurrentValue += holding.getCurrentValue();
                activeHoldings.add(holding);
                // Bug fix: only store nav in map if non-null, to avoid overwriting
                // a valid currentNav on the investment entity with null.
                if (latestNav != null) {
                    fundNavMap.put(holding.getFundId(), latestNav);
                }
                
                String cat = "Mutual Funds";
                allocationMap.put(cat, allocationMap.getOrDefault(cat, 0.0) + holding.getCurrentValue());
            }
        }

        for (Investment inv : investments) {
            if (inv.getFundId() != null && fundNavMap.containsKey(inv.getFundId())) {
                inv.setCurrentNav(fundNavMap.get(inv.getFundId()));
            }
        }
        investmentRepository.saveAll(investments);

        PortfolioDTO dto = new PortfolioDTO();
        dto.setTotalInvested(totalInvested);
        dto.setPortfolioValue(totalCurrentValue);
        dto.setRealizedProfitLoss(0.0); // Realized P&L from closed inv is excluded from Dashboard
        dto.setProfitLoss(totalCurrentValue - totalInvested);
        dto.setReturnPercentage(totalInvested > 0 ? (dto.getProfitLoss() / totalInvested) * 100 : 0);
        if (totalCurrentValue > 0) {
            cashFlows.add(new CashFlow(today, totalCurrentValue));
        }
        dto.setXirr(calculateXirr(cashFlows));
        dto.setCagr(calculateCagr(totalInvested, totalCurrentValue, cashFlows, today));
        dto.setActiveHoldings(activeHoldings);
        
        if (userId != null) {
            userRepository.findById(userId).ifPresent(u -> dto.setUserName(u.getName()));
        }
        
        // Populate Recent Activity (Only from Active Investments)
        List<InvestmentActivityDTO> activities = new ArrayList<>();
        activeInvestments.stream()
            // Bug fix: null-safe comparator — if both buyDate and startDate are null,
            // fall back to LocalDate.MIN so the comparator never throws NPE.
            .sorted(Comparator.comparing((Investment i) -> {
                LocalDate d = i.getBuyDate() != null ? i.getBuyDate()
                        : (i.getStartDate() != null ? i.getStartDate() : LocalDate.MIN);
                return d;
            }).reversed())
            .limit(10)
            .forEach(inv -> {
                InvestmentActivityDTO a = new InvestmentActivityDTO();
                a.setSchemeName(inv.getSchemeName());
                a.setType(inv.getInvestmentType());
                // Bug fix: null-safe date — guard against both buyDate and startDate being null.
                LocalDate actDate = inv.getBuyDate() != null ? inv.getBuyDate()
                        : (inv.getStartDate() != null ? inv.getStartDate() : LocalDate.now());
                a.setDate(actDate.toString());
                a.setAmount(inv.getAmount() != null ? inv.getAmount() : 0.0);
                activities.add(a);
            });
        dto.setRecentActivity(activities);

        dto.setAssetAllocation(allocationMap.entrySet().stream().map(e -> {
            Map<String, Object> m = new HashMap<>();
            m.put("name", e.getKey());
            m.put("value", e.getValue());
            return m;
        }).collect(Collectors.toList()));

        return dto;
    }

    @Transactional
    public Portfolio updatePortfolio(Long userId) {
        Objects.requireNonNull(userId, "User ID cannot be null");
        PortfolioDTO dto = computeDetailedPortfolio(userId);
        double totalUnits = dto.getActiveHoldings() == null
                ? 0.0
                : dto.getActiveHoldings().stream().mapToDouble(HoldingDTO::getTotalUnits).sum();

        Portfolio portfolio = portfolioRepository.findByUserId(userId).orElse(new Portfolio());
        portfolio.setUserId(userId);
        portfolio.setTotal_invested(toSafeBigDecimal(dto.getTotalInvested(), 2));
        portfolio.setTotal_units(toSafeBigDecimal(totalUnits, 4));
        portfolio.setCurrent_value(toSafeBigDecimal(dto.getPortfolioValue(), 2));
        portfolio.setReturn_percentage(toSafeBigDecimal(dto.getReturnPercentage(), 2));
        portfolio.setXirr(toSafeBigDecimal(dto.getXirr(), 2));
        portfolio.setCagr(toSafeBigDecimal(dto.getCagr(), 2));
        // Bug fix: profit_loss field existed in the entity but was never persisted.
        portfolio.setProfit_loss(toSafeBigDecimal(dto.getProfitLoss(), 2));
        
        return portfolioRepository.save(portfolio);
    }

    public List<Map<String, Object>> computePortfolioHistory(Long userId, int days) {
        List<Investment> allInv = investmentRepository.findByUserId(userId);
        LocalDate today = LocalDate.now();

        // Consistent filtering: ONLY active investments for dashboard graphs
        // Rule: If it has an end date, it belongs ONLY in Tax Reports.
        List<Investment> investments = allInv.stream()
            .filter(inv -> {
                // Same strict rule as computeDetailedPortfolio
                if (inv.getEndDate() != null) return false;
                String status = inv.getStatus();
                if (status != null) {
                    String s = status.trim().toUpperCase();
                    if ("SOLD".equals(s) || "CLOSED".equals(s) || "DELETED".equals(s)) return false;
                }
                return true; 
            })
            .collect(Collectors.toList());
            
        if (investments.isEmpty()) return Collections.emptyList();

        // Find earliest transaction date to start the graph
        LocalDate earliestTransDate = investments.stream()
                .map(inv -> {
                    LocalDate d = inv.getBuyDate() != null ? inv.getBuyDate() : inv.getStartDate();
                    return d != null ? d : today;
                })
                .min(LocalDate::compareTo)
                .orElse(today);

        // Start from earliestTransDate as required, or today-days if days > 0 and earlier than earliest
        LocalDate startPoint = (days > 0) ? today.minusDays(days) : earliestTransDate;
        if (startPoint.isAfter(today)) startPoint = today;

        // Ensure we handle the "Graph starts from earliest investment date" requirement
        // If the user wants the full view, we start from the beginning.
        if (days >= 365 * 10) { // Practical "all" trigger
             startPoint = earliestTransDate;
        }

        // 1. Map out all unit changes for each fund
        Map<Long, List<UnitChange>> unitChangesByFund = new HashMap<>();
        for (Investment inv : investments) {
            Long fundId = inv.getFundId();
            if (fundId == null) continue;
            
            unitChangesByFund.computeIfAbsent(fundId, k -> new ArrayList<>());
            String type = inv.getInvestmentType();
            
            if ("BUY".equalsIgnoreCase(type) || "Lumpsum".equalsIgnoreCase(type)) {
                double units = (inv.getUnits() != null && inv.getUnits() > 0) ? inv.getUnits() : 
                              (inv.getNavAtBuy() != null && inv.getNavAtBuy() > 0 ? (inv.getAmount() != null ? inv.getAmount() : inv.getAmountInvested()) / inv.getNavAtBuy() : 0.0);
                unitChangesByFund.get(fundId).add(new UnitChange(inv.getBuyDate() != null ? inv.getBuyDate() : inv.getStartDate(), units));
                
            } else if ("SELL".equalsIgnoreCase(type)) {
                double units = inv.getUnits() != null ? inv.getUnits() : 0.0;
                // Bug fix: getBuyDate() can be null for SELL entries; fall back to startDate or today.
                LocalDate sellDate = inv.getBuyDate() != null ? inv.getBuyDate()
                        : (inv.getStartDate() != null ? inv.getStartDate() : today);
                unitChangesByFund.get(fundId).add(new UnitChange(sellDate, -units));
                
            } else if ("SIP".equalsIgnoreCase(type)) {
                LocalDate start = inv.getStartDate() != null ? inv.getStartDate() : inv.getBuyDate();
                LocalDate end = inv.getEndDate() != null ? inv.getEndDate() : today;
                if (end.isAfter(today)) end = today;
                
                String freq = inv.getFrequency() != null ? inv.getFrequency() : "Monthly";
                double amount = inv.getAmount() != null ? inv.getAmount() : (inv.getAmountInvested() != null ? inv.getAmountInvested() : 0.0);
                
                LocalDate current = start;
                while (!current.isAfter(end)) {
                    Double nav = navService.getNavForDate(String.valueOf(fundId), current.toString());
                    double navValue = isUsableNav(nav, inv)
                            ? nav
                            : fallbackNav(inv);
                    if (navValue > 0) {
                        unitChangesByFund.get(fundId).add(new UnitChange(current, amount / navValue));
                    }
                    
                    if ("Weekly".equalsIgnoreCase(freq)) current = current.plusWeeks(1);
                    else if ("Monthly".equalsIgnoreCase(freq)) current = current.plusMonths(1);
                    else if ("Quarterly".equalsIgnoreCase(freq)) current = current.plusMonths(3);
                    else if ("Yearly".equalsIgnoreCase(freq)) current = current.plusYears(1);
                    else break;
                }
            }
        }
        
        // Sort changes by date for each fund
        for (List<UnitChange> changes : unitChangesByFund.values()) {
            changes.sort(Comparator.comparing(c -> c.date));
        }

        // 2. Aggregate portfolio value for each date
        List<Map<String, Object>> history = new ArrayList<>();
        Map<Long, Double> currentUnitsByFund = new HashMap<>();
        Map<Long, Integer> changeIndexByFund = new HashMap<>();
        
        for (Long fundId : unitChangesByFund.keySet()) {
            currentUnitsByFund.put(fundId, 0.0);
            changeIndexByFund.put(fundId, 0);
            
            // Calculate units accumulated BEFORE startPoint
            List<UnitChange> changes = unitChangesByFund.get(fundId);
            int idx = 0;
            double unitsBefore = 0.0;
            while (idx < changes.size() && changes.get(idx).date.isBefore(startPoint)) {
                unitsBefore += changes.get(idx).units;
                idx++;
            }
            currentUnitsByFund.put(fundId, unitsBefore);
            changeIndexByFund.put(fundId, idx);
        }

        for (LocalDate date = startPoint; !date.isAfter(today); date = date.plusDays(1)) {
            double totalPortfolioValueOnDate = 0.0;
            
            for (Long fundId : unitChangesByFund.keySet()) {
                List<UnitChange> changes = unitChangesByFund.get(fundId);
                int idx = changeIndexByFund.get(fundId);
                
                // Add units from transactions happening ON this date
                while (idx < changes.size() && !changes.get(idx).date.isAfter(date)) {
                    currentUnitsByFund.put(fundId, currentUnitsByFund.get(fundId) + changes.get(idx).units);
                    idx++;
                }
                changeIndexByFund.put(fundId, idx);
                
                double unitsHeld = currentUnitsByFund.get(fundId);
                if (unitsHeld > 0.0001) {
                    Double navOnDate = navService.getNavForDate(String.valueOf(fundId), date.toString());
                    double navValue = isUsableNav(navOnDate, findFirstInvestmentByFund(investments, fundId))
                            ? navOnDate
                            : fallbackNavForFund(investments, fundId);
                    totalPortfolioValueOnDate += unitsHeld * navValue;
                }
            }
            
            Map<String, Object> point = new HashMap<>();
            point.put("date", date.toString()); // YYYY-MM-DD
            point.put("value", Math.round(totalPortfolioValueOnDate * 100.0) / 100.0);
            history.add(point);
        }
        
        return history;
    }

    private double calculateCagr(double totalInvested, double totalCurrentValue, List<CashFlow> cashFlows, LocalDate today) {
        if (totalInvested <= 0 || totalCurrentValue <= 0 || cashFlows == null || cashFlows.isEmpty()) {
            return 0.0;
        }
        LocalDate startDate = cashFlows.stream()
                .map(CashFlow::getDate)
                .min(LocalDate::compareTo)
                .orElse(today);
        long days = Math.max(1, ChronoUnit.DAYS.between(startDate, today));
        double years = days / 365.25;
        if (years <= 0.0) return 0.0;
        return (Math.pow(totalCurrentValue / totalInvested, 1.0 / years) - 1.0) * 100.0;
    }

    private double calculateXirr(List<CashFlow> cashFlows) {
        if (cashFlows == null || cashFlows.size() < 2) return 0.0;

        LocalDate start = cashFlows.stream().map(CashFlow::getDate).min(LocalDate::compareTo).orElse(LocalDate.now());
        boolean hasPositive = cashFlows.stream().anyMatch(cf -> cf.getAmount() > 0);
        boolean hasNegative = cashFlows.stream().anyMatch(cf -> cf.getAmount() < 0);
        if (!hasPositive || !hasNegative) return 0.0;

        double rate = 0.10;
        for (int i = 0; i < 100; i++) {
            double f = xnpv(rate, cashFlows, start);
            double df = xnpvDerivative(rate, cashFlows, start);
            if (Math.abs(df) < 1e-12) break;
            double next = rate - f / df;
            if (Double.isNaN(next) || Double.isInfinite(next) || next <= -0.999999) break;
            if (Math.abs(next - rate) < 1e-7) {
                rate = next;
                break;
            }
            rate = next;
        }
        return rate * 100.0;
    }

    private double xnpv(double rate, List<CashFlow> cashFlows, LocalDate start) {
        double total = 0.0;
        for (CashFlow cf : cashFlows) {
            long days = ChronoUnit.DAYS.between(start, cf.getDate());
            double yearFrac = days / 365.25;
            total += cf.getAmount() / Math.pow(1.0 + rate, yearFrac);
        }
        return total;
    }

    private double xnpvDerivative(double rate, List<CashFlow> cashFlows, LocalDate start) {
        double total = 0.0;
        for (CashFlow cf : cashFlows) {
            long days = ChronoUnit.DAYS.between(start, cf.getDate());
            double yearFrac = days / 365.25;
            total += -yearFrac * cf.getAmount() / Math.pow(1.0 + rate, yearFrac + 1.0);
        }
        return total;
    }

    private static class CashFlow {
        private final LocalDate date;
        private final double amount;

        CashFlow(LocalDate date, double amount) {
            this.date = date;
            this.amount = amount;
        }

        LocalDate getDate() {
            return date;
        }

        double getAmount() {
            return amount;
        }
    }

    private static class UnitChange {
        LocalDate date;
        double units;
        UnitChange(LocalDate date, double units) {
            this.date = date;
            this.units = units;
        }
    }

    public Portfolio getPortfolioByUserId(Long userId) {
        return portfolioRepository.findByUserId(userId).orElseGet(() -> updatePortfolio(userId));
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

    private BigDecimal toSafeBigDecimal(double value, int scale) {
        if (Double.isNaN(value) || Double.isInfinite(value)) {
            return BigDecimal.ZERO.setScale(scale, RoundingMode.HALF_UP);
        }
        try {
            return BigDecimal.valueOf(value).setScale(scale, RoundingMode.HALF_UP);
        } catch (Exception e) {
            return BigDecimal.ZERO.setScale(scale, RoundingMode.HALF_UP);
        }
    }

    private double fallbackNav(Investment inv) {
        if (inv == null) return 0.0;
        if (inv.getNavAtBuy() != null && inv.getNavAtBuy() > 0) return inv.getNavAtBuy();
        if (isUsableNav(inv.getCurrentNav(), inv)) return inv.getCurrentNav();
        return 0.0;
    }

    private double fallbackNavForFund(List<Investment> investments, Long fundId) {
        if (investments == null || fundId == null) return 0.0;
        for (Investment inv : investments) {
            if (fundId.equals(inv.getFundId())) {
                double nav = fallbackNav(inv);
                if (nav > 0) return nav;
            }
        }
        return 0.0;
    }

    private boolean isUsableNav(Double nav, Investment inv) {
        if (nav == null || nav <= 0) return false;
        double navAtBuy = inv != null && inv.getNavAtBuy() != null ? inv.getNavAtBuy() : 0.0;
        // Protect against fallback sentinel NAV=1 from external API failures.
        return !(nav <= 1.000001 && navAtBuy > 1.5);
    }

    private Investment findFirstInvestmentByFund(List<Investment> investments, Long fundId) {
        if (investments == null || fundId == null) return null;
        for (Investment inv : investments) {
            if (fundId.equals(inv.getFundId())) return inv;
        }
        return null;
    }
}

