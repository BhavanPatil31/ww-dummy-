package com.wealthwise.wealthwise_backend.portfolio.service;

import com.wealthwise.wealthwise_backend.investment.entity.Investment;
import com.wealthwise.wealthwise_backend.investment.repository.InvestmentRepository;
import com.wealthwise.wealthwise_backend.investment.service.NavService;
import com.wealthwise.wealthwise_backend.investment.dto.PortfolioDTO;
import com.wealthwise.wealthwise_backend.investment.dto.HoldingDTO;
import com.wealthwise.wealthwise_backend.investment.dto.InvestmentActivityDTO;
import com.wealthwise.wealthwise_backend.portfolio.entity.Portfolio;
import com.wealthwise.wealthwise_backend.portfolio.repository.PortfolioRepository;
import com.wealthwise.wealthwise_backend.auth.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PortfolioService {

    @Autowired
    private PortfolioRepository portfolioRepository;

    @Autowired
    private InvestmentRepository investmentRepository;

    @Autowired
    private InvestmentValuationService investmentValuationService;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public Portfolio updatePortfolio(Long userId) {
        Objects.requireNonNull(userId, "User ID cannot be null");
        List<Investment> investments = Objects.requireNonNull(investmentRepository.findActiveByUserId(userId, java.time.LocalDate.now()), "Active investment list cannot be null");
        
        BigDecimal totalInvested = BigDecimal.ZERO;
        BigDecimal totalUnits = BigDecimal.ZERO;
        BigDecimal currentValue = BigDecimal.ZERO;

        if (investments != null) {
            for (Investment inv : investments) {
                InvestmentValuationService.Valuation valuation = investmentValuationService.value(inv, LocalDate.now());

                totalInvested = totalInvested.add(valuation.getInvestedAmount());
                totalUnits = totalUnits.add(valuation.getUnits());
                currentValue = currentValue.add(valuation.getCurrentValue());

                // Persist refreshed current NAV so other screens can reuse it.
                if (valuation.getCurrentNav() != null) {
                    inv.setCurrentNav(valuation.getCurrentNav().doubleValue());
                }
                // Persist normalized invested amount and units so list endpoints remain consistent.
                inv.setAmountInvested(valuation.getInvestedAmount().doubleValue());
                inv.setUnits(valuation.getUnits().doubleValue());
                investmentRepository.save(inv);
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
                    if ("SOLD".equals(s) || "CLOSED".equals(s)) return false;
                }
                
                return true; 
            })
            .collect(Collectors.toList());

        List<Investment> investments = activeInvestments; 

        Map<Long, HoldingDTO> holdingsMap = new HashMap<>();
        double totalInvested = 0.0;
        
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
                if (inv.getUnits() == null || inv.getUnits() <= 0) {
                   double nav = inv.getNavAtBuy() != null ? inv.getNavAtBuy() : 1.0;
                   double amt = inv.getAmountInvested() != null ? inv.getAmountInvested() : (inv.getAmount() != null ? inv.getAmount() : 0.0);
                   inv.setUnits(amt / nav);
                }
                
                double units = inv.getUnits() != null ? inv.getUnits() : 0.0;
                double amount = inv.getAmountInvested() != null ? inv.getAmountInvested() : (inv.getAmount() != null ? inv.getAmount() : 0.0);
                
                holding.setTotalUnits(holding.getTotalUnits() + units);
                holding.setInvestedAmount(holding.getInvestedAmount() + amount);
                totalInvested += amount;
                
            } else if ("SIP".equalsIgnoreCase(type)) {
                LocalDate start = inv.getStartDate() != null ? inv.getStartDate() : inv.getBuyDate();
                LocalDate end = inv.getEndDate();
                // If it's an active SIP with a future end date, we only calculate up to today for current value
                LocalDate calcEnd = (end != null && end.isBefore(today)) ? end : today;
                
                String freq = inv.getFrequency() != null ? inv.getFrequency() : "Monthly";
                double amountPerInst = inv.getAmountInvested() != null ? inv.getAmountInvested() : (inv.getAmount() != null ? inv.getAmount() : 0.0);

                double sipTotalUnits = 0.0;
                double sipTotalInvested = 0.0;

                LocalDate currentInstDate = start;
                while (currentInstDate != null && !currentInstDate.isAfter(calcEnd)) {
                    Double navOnDate = navService.getNavForDate(String.valueOf(fundId), currentInstDate.toString());
                    double navOnDateValue = (navOnDate != null) ? navOnDate : 0.0;
                    double unitsOnDate = navOnDateValue > 0 ? amountPerInst / navOnDateValue : 0.0;
                    
                    sipTotalUnits += unitsOnDate;
                    sipTotalInvested += amountPerInst;

                    if ("Weekly".equalsIgnoreCase(freq)) currentInstDate = currentInstDate.plusWeeks(1);
                    else if ("Monthly".equalsIgnoreCase(freq)) currentInstDate = currentInstDate.plusMonths(1);
                    else if ("Quarterly".equalsIgnoreCase(freq)) currentInstDate = currentInstDate.plusMonths(3);
                    else if ("Yearly".equalsIgnoreCase(freq)) currentInstDate = currentInstDate.plusYears(1);
                    else break;
                }
                
                inv.setUnits(sipTotalUnits);
                inv.setAmountInvested(sipTotalInvested);
                
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
                holding.setLatestNav(latestNav);
                holding.setCurrentValue(holding.getTotalUnits() * (latestNav != null ? latestNav : 0.0));
                holding.setProfitLoss(holding.getCurrentValue() - holding.getInvestedAmount());
                holding.setReturnPercentage(holding.getInvestedAmount() > 0 ? (holding.getProfitLoss() / holding.getInvestedAmount()) * 100 : 0);
                
                totalCurrentValue += holding.getCurrentValue();
                activeHoldings.add(holding);
                fundNavMap.put(holding.getFundId(), latestNav);
                
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
        dto.setActiveHoldings(activeHoldings);
        
        if (userId != null) {
            userRepository.findById(userId).ifPresent(u -> dto.setUserName(u.getName()));
        }
        
        // Populate Recent Activity (Only from Active Investments)
        List<InvestmentActivityDTO> activities = new ArrayList<>();
        activeInvestments.stream()
            .sorted(Comparator.comparing((Investment i) -> i.getBuyDate() != null ? i.getBuyDate() : i.getStartDate()).reversed())
            .limit(10)
            .forEach(inv -> {
                InvestmentActivityDTO a = new InvestmentActivityDTO();
                a.setSchemeName(inv.getSchemeName());
                a.setType(inv.getInvestmentType());
                a.setDate((inv.getBuyDate() != null ? inv.getBuyDate() : inv.getStartDate()).toString());
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
        PortfolioDTO dto = computeDetailedPortfolio(userId);
        
        Portfolio portfolio = portfolioRepository.findByUserId(userId).orElse(new Portfolio());
        portfolio.setUserId(userId);
        portfolio.setTotal_invested(toSafeBigDecimal(dto.getTotalInvested(), 2));
        portfolio.setTotal_units(toSafeBigDecimal(dto.getActiveHoldings().stream().mapToDouble(HoldingDTO::getTotalUnits).sum(), 4));
        portfolio.setCurrent_value(toSafeBigDecimal(dto.getPortfolioValue(), 2));
        portfolio.setProfit_loss(toSafeBigDecimal(dto.getProfitLoss(), 2));
        portfolio.setReturn_percentage(toSafeBigDecimal(dto.getReturnPercentage(), 2));
        portfolio.setXirr(toSafeBigDecimal(0.0, 2)); 
        portfolio.setCagr(toSafeBigDecimal(0.0, 2));
        
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
                    if ("SOLD".equals(s) || "CLOSED".equals(s)) return false;
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
                              (inv.getNavAtBuy() != null && inv.getNavAtBuy() > 0 ? (inv.getAmountInvested() != null ? inv.getAmountInvested() : inv.getAmount()) / inv.getNavAtBuy() : 0.0);
                unitChangesByFund.get(fundId).add(new UnitChange(inv.getBuyDate() != null ? inv.getBuyDate() : inv.getStartDate(), units));
                
            } else if ("SELL".equalsIgnoreCase(type)) {
                double units = inv.getUnits() != null ? inv.getUnits() : 0.0;
                unitChangesByFund.get(fundId).add(new UnitChange(inv.getBuyDate(), -units));
                
            } else if ("SIP".equalsIgnoreCase(type)) {
                LocalDate start = inv.getStartDate() != null ? inv.getStartDate() : inv.getBuyDate();
                LocalDate end = inv.getEndDate() != null ? inv.getEndDate() : today;
                if (end.isAfter(today)) end = today;
                
                String freq = inv.getFrequency() != null ? inv.getFrequency() : "Monthly";
                double amount = inv.getAmountInvested() != null ? inv.getAmountInvested() : (inv.getAmount() != null ? inv.getAmount() : 0.0);
                
                LocalDate current = start;
                while (!current.isAfter(end)) {
                    Double nav = navService.getNavForDate(String.valueOf(fundId), current.toString());
                    if (nav != null && nav > 0) {
                        unitChangesByFund.get(fundId).add(new UnitChange(current, amount / nav));
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
                    totalPortfolioValueOnDate += unitsHeld * (navOnDate != null ? navOnDate : 0.0);
                }
            }
            
            Map<String, Object> point = new HashMap<>();
            point.put("date", date.toString()); // YYYY-MM-DD
            point.put("value", Math.round(totalPortfolioValueOnDate * 100.0) / 100.0);
            history.add(point);
        }
        
        return history;
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

    public String generateCsvExport(Long userId) {
        PortfolioDTO dto = computeDetailedPortfolio(userId);
        StringBuilder csv = new StringBuilder();
        
        // Header
        csv.append("Fund Name,Total Units,Invested Amount,Current Value,Latest NAV,Return %,Profit/Loss\n");
        
        // Rows
        for (HoldingDTO holding : dto.getActiveHoldings()) {
            csv.append(String.format("\"%s\",%.4f,%.2f,%.2f,%.2f,%.2f,%.2f\n",
                    holding.getFundName(),
                    holding.getTotalUnits(),
                    holding.getInvestedAmount(),
                    holding.getCurrentValue(),
                    holding.getLatestNav(),
                    holding.getReturnPercentage(),
                    holding.getProfitLoss()));
        }
        
        // Summary Footer
        csv.append(String.format("\nSummary,,%.2f,%.2f,,%.2f,%.2f\n",
                dto.getTotalInvested(),
                dto.getPortfolioValue(),
                dto.getReturnPercentage(),
                dto.getProfitLoss()));
        
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
}
