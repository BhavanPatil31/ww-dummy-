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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PortfolioService {

    private final PortfolioRepository portfolioRepository;
    private final InvestmentRepository investmentRepository;
    private final InvestmentValuationService investmentValuationService;
    private final UserRepository userRepository;
    private final NavService navService;

    public PortfolioService(PortfolioRepository portfolioRepository,
            InvestmentRepository investmentRepository,
            InvestmentValuationService investmentValuationService,
            UserRepository userRepository,
            NavService navService) {
        this.portfolioRepository = portfolioRepository;
        this.investmentRepository = investmentRepository;
        this.investmentValuationService = investmentValuationService;
        this.userRepository = userRepository;
        this.navService = navService;
    }

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
        List<Investment> investments = investmentRepository.findByUserId(userId);
        
        Map<Long, HoldingDTO> holdingsMap = new HashMap<>();
        double totalInvested = 0.0;
        
        // Sort investments by date to ensure SIPs and sells are processed correctly
        investments.sort(Comparator.comparing(inv -> inv.getBuyDate() != null ? inv.getBuyDate() : (inv.getStartDate() != null ? inv.getStartDate() : LocalDate.MIN)));

        for (Investment inv : investments) {
            String type = inv.getInvestmentType();
            Long fundId = inv.getFundId();
            if (fundId == null)
                continue;

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
                double amount = inv.getAmountInvested() != null ? inv.getAmountInvested()
                        : (inv.getAmount() != null ? inv.getAmount() : 0.0);

                holding.setTotalUnits(holding.getTotalUnits() + units);
                holding.setInvestedAmount(holding.getInvestedAmount() + amount);
                totalInvested += amount;

            } else if ("SIP".equalsIgnoreCase(type)) {
                LocalDate start = inv.getStartDate() != null ? inv.getStartDate() : inv.getBuyDate();
                LocalDate end = inv.getEndDate() != null ? inv.getEndDate() : LocalDate.now();
                if (end.isAfter(LocalDate.now())) end = LocalDate.now();
                
                String freq = inv.getFrequency() != null ? inv.getFrequency() : "Monthly";
                double amountPerInst = inv.getAmountInvested() != null ? inv.getAmountInvested() : (inv.getAmount() != null ? inv.getAmount() : 0.0);

                LocalDate currentInstDate = start;
                while (currentInstDate != null && !currentInstDate.isAfter(calcEnd)) {
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
        Map<Long, Double> fundNavMap = new HashMap<>();

        for (HoldingDTO holding : holdingsMap.values()) {
            if (holding.getTotalUnits() > 0.0001) { // Floating point check
                Double latestNav = navService.getLatestNav(String.valueOf(holding.getFundId()));
                holding.setLatestNav(latestNav);
                holding.setCurrentValue(holding.getTotalUnits() * latestNav);
                holding.setProfitLoss(holding.getCurrentValue() - holding.getInvestedAmount());
                holding.setReturnPercentage(
                        holding.getInvestedAmount() > 0 ? (holding.getProfitLoss() / holding.getInvestedAmount()) * 100
                                : 0);

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
                if (h != null && h.getLatestNav() > 0.0) {
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

        // days <= 0 or very large window => full history from first transaction
        LocalDate startPoint;
        if (days <= 0 || days >= 3650) {
            startPoint = earliestTransDate;
        } else {
            startPoint = today.minusDays(days);
        }
        if (startPoint.isAfter(today))
            startPoint = today;

        // 1. Map out all unit changes AND invested amount changes for each fund
        Map<Long, List<UnitChange>> unitChangesByFund = new HashMap<>();
        Map<Long, List<InvestedChange>> investedChangesByFund = new HashMap<>();

        for (Investment inv : investments) {
            Long fundId = inv.getFundId();
            if (fundId == null)
                continue;

            unitChangesByFund.computeIfAbsent(fundId, k -> new ArrayList<>());
            investedChangesByFund.computeIfAbsent(fundId, k -> new ArrayList<>());
            String type = inv.getInvestmentType();

            if ("BUY".equalsIgnoreCase(type) || "Lumpsum".equalsIgnoreCase(type)) {
                double amount = inv.getAmountInvested() != null ? inv.getAmountInvested()
                        : (inv.getAmount() != null ? inv.getAmount() : 0.0);
                double units = (inv.getUnits() != null && inv.getUnits() > 0) ? inv.getUnits()
                        : (inv.getNavAtBuy() != null && inv.getNavAtBuy() > 0
                                ? (amount / inv.getNavAtBuy())
                                : 0.0);
                LocalDate buyDate = inv.getBuyDate() != null ? inv.getBuyDate()
                        : (inv.getStartDate() != null ? inv.getStartDate() : LocalDate.now());
                unitChangesByFund.get(fundId).add(new UnitChange(buyDate, units));
                investedChangesByFund.get(fundId).add(new InvestedChange(buyDate, amount));

            } else if ("SELL".equalsIgnoreCase(type)) {
                double units = inv.getUnits() != null ? inv.getUnits() : 0.0;
                LocalDate sellDate = inv.getBuyDate() != null ? inv.getBuyDate() : LocalDate.now();
                unitChangesByFund.get(fundId).add(new UnitChange(sellDate, -units));
                // On sell, reduce invested proportionally (approximate)
                double sellAmount = inv.getAmountInvested() != null ? inv.getAmountInvested()
                        : (inv.getAmount() != null ? inv.getAmount() : 0.0);
                investedChangesByFund.get(fundId).add(new InvestedChange(sellDate, -sellAmount));

            } else if ("SIP".equalsIgnoreCase(type)) {
                LocalDate start = inv.getStartDate() != null ? inv.getStartDate() : inv.getBuyDate();
                LocalDate end = inv.getEndDate() != null ? inv.getEndDate() : today;
                if (end.isAfter(today))
                    end = today;

                String freq = inv.getFrequency() != null ? inv.getFrequency() : "Monthly";
                double amount = inv.getAmountInvested() != null ? inv.getAmountInvested()
                        : (inv.getAmount() != null ? inv.getAmount() : 0.0);

                LocalDate current = start;
                while (!current.isAfter(end)) {
                    Double nav = navService.getNavForDate(String.valueOf(fundId), current.toString());
                    if (nav != null && nav > 0) {
                        unitChangesByFund.get(fundId).add(new UnitChange(current, amount / nav));
                    }
                    investedChangesByFund.get(fundId).add(new InvestedChange(current, amount));

                    if ("Weekly".equalsIgnoreCase(freq))
                        current = current.plusWeeks(1);
                    else if ("Monthly".equalsIgnoreCase(freq))
                        current = current.plusMonths(1);
                    else if ("Quarterly".equalsIgnoreCase(freq))
                        current = current.plusMonths(3);
                    else if ("Yearly".equalsIgnoreCase(freq))
                        current = current.plusYears(1);
                    else
                        break;
                }
            }
        }

        // Sort changes by date for each fund
        for (List<UnitChange> changes : unitChangesByFund.values()) {
            changes.sort(Comparator.comparing(c -> c.date));
        }
        for (List<InvestedChange> changes : investedChangesByFund.values()) {
            changes.sort(Comparator.comparing(c -> c.date));
        }

        // 2. Aggregate portfolio value AND invested amount for each date
        List<Map<String, Object>> history = new ArrayList<>();
        Map<Long, Double> currentUnitsByFund = new HashMap<>();
        Map<Long, Integer> changeIndexByFund = new HashMap<>();
        Map<Long, Double> currentInvestedByFund = new HashMap<>();
        Map<Long, Integer> investedIndexByFund = new HashMap<>();

        for (Long fundId : unitChangesByFund.keySet()) {
            currentUnitsByFund.put(fundId, 0.0);
            changeIndexByFund.put(fundId, 0);
            currentInvestedByFund.put(fundId, 0.0);
            investedIndexByFund.put(fundId, 0);

            // Calculate units and invested accumulated BEFORE startPoint
            List<UnitChange> changes = unitChangesByFund.get(fundId);
            int idx = 0;
            double unitsBefore = 0.0;
            while (idx < changes.size() && changes.get(idx).date.isBefore(startPoint)) {
                unitsBefore += changes.get(idx).units;
                idx++;
            }
            currentUnitsByFund.put(fundId, unitsBefore);
            changeIndexByFund.put(fundId, idx);

            List<InvestedChange> invChanges = investedChangesByFund.getOrDefault(fundId, Collections.emptyList());
            int iIdx = 0;
            double investedBefore = 0.0;
            while (iIdx < invChanges.size() && invChanges.get(iIdx).date.isBefore(startPoint)) {
                investedBefore += invChanges.get(iIdx).amount;
                iIdx++;
            }
            currentInvestedByFund.put(fundId, investedBefore);
            investedIndexByFund.put(fundId, iIdx);
        }

        for (LocalDate date = startPoint; !date.isAfter(today); date = date.plusDays(1)) {
            double totalPortfolioValueOnDate = 0.0;
            double totalInvestedOnDate = 0.0;

            for (Long fundId : unitChangesByFund.keySet()) {
                List<UnitChange> changes = unitChangesByFund.get(fundId);
                int idx = changeIndexByFund.get(fundId);

                while (idx < changes.size() && !changes.get(idx).date.isAfter(date)) {
                    currentUnitsByFund.put(fundId, currentUnitsByFund.get(fundId) + changes.get(idx).units);
                    idx++;
                }
                changeIndexByFund.put(fundId, idx);

                // Process invested changes
                List<InvestedChange> invChanges = investedChangesByFund.getOrDefault(fundId, Collections.emptyList());
                int iIdx = investedIndexByFund.getOrDefault(fundId, 0);
                while (iIdx < invChanges.size() && !invChanges.get(iIdx).date.isAfter(date)) {
                    currentInvestedByFund.put(fundId, currentInvestedByFund.getOrDefault(fundId, 0.0) + invChanges.get(iIdx).amount);
                    iIdx++;
                }
                investedIndexByFund.put(fundId, iIdx);

                double unitsHeld = currentUnitsByFund.get(fundId);
                if (unitsHeld > 0.0001) {
                    Double navOnDate = navService.getNavForDate(String.valueOf(fundId), date.toString());
                    totalPortfolioValueOnDate += unitsHeld * (navOnDate != null ? navOnDate : 0.0);
                }
                totalInvestedOnDate += currentInvestedByFund.getOrDefault(fundId, 0.0);
            }

            Map<String, Object> point = new HashMap<>();
            point.put("date", date.toString());
            point.put("value", Math.round(totalPortfolioValueOnDate * 100.0) / 100.0);
            point.put("invested", Math.round(totalInvestedOnDate * 100.0) / 100.0);
            history.add(point);
        }

        // 3. Smart sampling for cleaner charts — reduce to ~60 data points max
        if (history.size() > 80) {
            List<Map<String, Object>> sampled = new ArrayList<>();
            int step = Math.max(1, history.size() / 60);
            for (int i = 0; i < history.size(); i += step) {
                sampled.add(history.get(i));
            }
            // Always include the last (today) point
            Map<String, Object> last = history.get(history.size() - 1);
            if (!sampled.get(sampled.size() - 1).equals(last)) {
                sampled.add(last);
            }
            return sampled;
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

    private static class InvestedChange {
        LocalDate date;
        double amount;

        InvestedChange(LocalDate date, double amount) {
            this.date = date;
            this.amount = amount;
        }
    }

    public Portfolio getPortfolioByUserId(Long userId) {
        return portfolioRepository.findFirstByUserId(userId).orElseGet(() -> updatePortfolio(userId));
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

}