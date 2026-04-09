package com.wealthwise.wealthwise_backend.portfolio.service;

import com.wealthwise.wealthwise_backend.investment.entity.Investment;
import com.wealthwise.wealthwise_backend.investment.repository.InvestmentRepository;
import com.wealthwise.wealthwise_backend.investment.service.NavService;
import com.wealthwise.wealthwise_backend.investment.dto.PortfolioDTO;
import com.wealthwise.wealthwise_backend.investment.dto.HoldingDTO;
import com.wealthwise.wealthwise_backend.portfolio.entity.Portfolio;
import com.wealthwise.wealthwise_backend.portfolio.repository.PortfolioRepository;
import com.wealthwise.wealthwise_backend.auth.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private NavService navService;

    @Autowired
    private UserRepository userRepository;

    public PortfolioDTO computeDetailedPortfolio(Long userId) {
        List<Investment> investments = investmentRepository.findByUserId(userId);
        
        Map<Long, HoldingDTO> holdingsMap = new HashMap<>();
        double totalRealizedProfitLoss = 0.0;
        double totalInvested = 0.0;
        
        // Sort investments by date to ensure SIPs and sells are processed correctly
        investments.sort(Comparator.comparing(inv -> inv.getBuyDate() != null ? inv.getBuyDate() : (inv.getStartDate() != null ? inv.getStartDate() : LocalDate.MIN)));

        for (Investment inv : investments) {
            String type = inv.getInvestmentType();
            Long fundId = inv.getFundId();
            if (fundId == null) continue;

            HoldingDTO holding = holdingsMap.getOrDefault(fundId, new HoldingDTO());
            holding.setFundId(fundId);
            holding.setFundName(inv.getSchemeName());

            if ("BUY".equalsIgnoreCase(type) || "Lumpsum".equalsIgnoreCase(type)) {
                double units = inv.getUnits() != null ? inv.getUnits() : 0.0;
                double amount = inv.getAmountInvested() != null ? inv.getAmountInvested() : (inv.getAmount() != null ? inv.getAmount() : 0.0);
                
                holding.setTotalUnits(holding.getTotalUnits() + units);
                holding.setInvestedAmount(holding.getInvestedAmount() + amount);
                totalInvested += amount;
                
            } else if ("SIP".equalsIgnoreCase(type)) {
                // Calculate all installments for this SIP
                LocalDate start = inv.getStartDate() != null ? inv.getStartDate() : inv.getBuyDate();
                LocalDate end = inv.getEndDate() != null ? inv.getEndDate() : LocalDate.now();
                if (end.isAfter(LocalDate.now())) end = LocalDate.now();
                
                String freq = inv.getFrequency() != null ? inv.getFrequency() : "Monthly";
                double amountPerInst = inv.getAmountInvested() != null ? inv.getAmountInvested() : (inv.getAmount() != null ? inv.getAmount() : 0.0);

                LocalDate currentInstDate = start;
                while (!currentInstDate.isAfter(end)) {
                    Double navOnDate = navService.getNavForDate(String.valueOf(fundId), currentInstDate.toString());
                    double navOnDateValue = (navOnDate != null) ? navOnDate : 0.0;
                    double unitsOnDate = navOnDateValue > 0 ? amountPerInst / navOnDateValue : 0.0;
                    
                    holding.setTotalUnits(holding.getTotalUnits() + unitsOnDate);
                    holding.setInvestedAmount(holding.getInvestedAmount() + amountPerInst);
                    totalInvested += amountPerInst;

                    // Advance to next installment
                    if ("Weekly".equalsIgnoreCase(freq)) currentInstDate = currentInstDate.plusWeeks(1);
                    else if ("Monthly".equalsIgnoreCase(freq)) currentInstDate = currentInstDate.plusMonths(1);
                    else if ("Quarterly".equalsIgnoreCase(freq)) currentInstDate = currentInstDate.plusMonths(3);
                    else if ("Yearly".equalsIgnoreCase(freq)) currentInstDate = currentInstDate.plusYears(1);
                    else break;
                }
            } else if ("SELL".equalsIgnoreCase(type)) {
                double unitsSold = inv.getUnits() != null ? inv.getUnits() : 0.0;
                double sellNav = inv.getNavAtBuy() != null ? inv.getNavAtBuy() : 0.0; // navAtBuy is used for tx nav
                
                // Realized calculation based on average cost
                if (holding.getTotalUnits() > 0) {
                    double totalUnitsBefore = holding.getTotalUnits();
                    double avgCost = totalUnitsBefore > 0 ? holding.getInvestedAmount() / totalUnitsBefore : 0.0;
                    double costOfSoldUnits = unitsSold * avgCost;
                    double realizedAmount = unitsSold * sellNav;
                    
                    totalRealizedProfitLoss += (realizedAmount - costOfSoldUnits);
                    
                    holding.setTotalUnits(holding.getTotalUnits() - unitsSold);
                    holding.setInvestedAmount(holding.getInvestedAmount() - costOfSoldUnits);
                }
            }
            holdingsMap.put(fundId, holding);
        }

        // Finalize active holdings
        List<HoldingDTO> activeHoldings = new ArrayList<>();
        double totalCurrentValue = 0.0;
        Map<String, Double> allocationMap = new HashMap<>();

        for (HoldingDTO holding : holdingsMap.values()) {
            if (holding.getTotalUnits() > 0.0001) { // Floating point check
                Double latestNav = navService.getLatestNav(String.valueOf(holding.getFundId()));
                holding.setLatestNav(latestNav);
                holding.setCurrentValue(holding.getTotalUnits() * latestNav);
                holding.setProfitLoss(holding.getCurrentValue() - holding.getInvestedAmount());
                holding.setReturnPercentage(holding.getInvestedAmount() > 0 ? (holding.getProfitLoss() / holding.getInvestedAmount()) * 100 : 0);
                
                totalCurrentValue += holding.getCurrentValue();
                activeHoldings.add(holding);
                
                // For allocation, use currentValue
                // We'll just group everything under "Active Holdings" or try to find category if available
                // But current data doesn't have asset category easily accessible here
                // I'll use the fund name for now or just generic if category is missing
                String cat = "Mutual Funds";
                allocationMap.put(cat, allocationMap.getOrDefault(cat, 0.0) + holding.getCurrentValue());
            }
        }

        PortfolioDTO dto = new PortfolioDTO();
        dto.setTotalInvested(totalInvested);
        dto.setPortfolioValue(totalCurrentValue);
        dto.setRealizedProfitLoss(totalRealizedProfitLoss);
        dto.setProfitLoss((totalCurrentValue + totalRealizedProfitLoss) - totalInvested);
        dto.setReturnPercentage(totalInvested > 0 ? (dto.getProfitLoss() / totalInvested) * 100 : 0);
        dto.setActiveHoldings(activeHoldings);
        
        // Fetch user name
        if (userId != null) {
            userRepository.findById(userId).ifPresent(u -> dto.setUserName(u.getName()));
        }
        
        // Asset Allocation
        dto.setAssetAllocation(allocationMap.entrySet().stream().map(e -> {
            Map<String, Object> m = new HashMap<>();
            m.put("name", e.getKey());
            m.put("value", e.getValue());
            return m;
        }).collect(Collectors.toList()));

        // SYNC LATEST NAV TO INDIVIDUAL INVESTMENTS
        boolean needsUpdate = false;
        for (Investment inv : investments) {
            if (inv.getFundId() != null) {
                HoldingDTO h = holdingsMap.get(inv.getFundId());
                if (h != null && h.getLatestNav() != null && Double.compare(h.getLatestNav(), 0.0) > 0) {
                    if (inv.getCurrentNav() == null || Math.abs(inv.getCurrentNav() - h.getLatestNav()) > 0.0001) {
                        inv.setCurrentNav(h.getLatestNav());
                        needsUpdate = true;
                    }
                }
            }
        }
        if (needsUpdate) {
            investmentRepository.saveAll(investments);
        }

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
        portfolio.setXirr(toSafeBigDecimal(dto.getRealizedProfitLoss(), 2)); 
        portfolio.setCagr(toSafeBigDecimal(0.0, 2));
        
        return portfolioRepository.save(portfolio);
    }

    public List<Map<String, Object>> computePortfolioHistory(Long userId, int days) {
        List<Investment> investments = investmentRepository.findByUserId(userId);
        if (investments.isEmpty()) return Collections.emptyList();

        LocalDate today = LocalDate.now();
        
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
