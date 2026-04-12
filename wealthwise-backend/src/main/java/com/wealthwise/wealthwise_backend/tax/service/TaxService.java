package com.wealthwise.wealthwise_backend.tax.service;

import com.wealthwise.wealthwise_backend.investment.entity.Investment;

import com.wealthwise.wealthwise_backend.tax.dto.TaxTransactionDTO;
import com.wealthwise.wealthwise_backend.tax.entity.TaxTransaction;
import com.wealthwise.wealthwise_backend.tax.repository.TaxTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class TaxService {

    @Autowired
    private TaxTransactionRepository taxTransactionRepository;



    public List<TaxTransactionDTO> getTaxSummary(Long userId, String financialYear) {
        Objects.requireNonNull(userId, "User ID cannot be null");
        String userIdString = userId.toString();
        List<TaxTransactionDTO> result = new ArrayList<>();

        // Query tax_transactions only (from CAS uploads AND moved investments)
        if (financialYear != null && financialYear.contains("-")) {
            int startYear = Integer.parseInt(financialYear.substring(0, 4));
            int endYear = startYear + 1;
            LocalDate fyStart = LocalDate.of(startYear, 4, 1);
            LocalDate fyEnd = LocalDate.of(endYear, 3, 31);

            List<TaxTransaction> taxTransactions = taxTransactionRepository.findByUserIdAndSellDateBetween(userIdString,
                    fyStart, fyEnd);
            if (taxTransactions != null) {
                for (TaxTransaction txn : taxTransactions) {
                    result.add(toDto(txn));
                }
            }
        } else {
            // No specific financial year filter - get all tax transactions
            List<TaxTransaction> taxTransactions = taxTransactionRepository.findByUserId(userIdString);
            if (taxTransactions != null) {
                for (TaxTransaction txn : taxTransactions) {
                    result.add(toDto(txn));
                }
            }
        }

        result.sort((a, b) -> a.getSellDate().compareTo(b.getSellDate()));
        return result;
    }

    private TaxTransactionDTO toDto(TaxTransaction txn) {
        TaxTransactionDTO dto = new TaxTransactionDTO();
        dto.setId(txn.getTransactionId());
        dto.setFundName(txn.getFundName());
        dto.setBuyDate(txn.getBuyDate());
        dto.setSellDate(txn.getSellDate());
        dto.setUnits(txn.getUnits());
        dto.setGain(txn.getGain());
        dto.setType(txn.getTaxType());
        return dto;
    }

    /**
     * Moves an investment with an endDate to the tax_transactions table.
     * This ensures data integrity by separating active investments from closed
     * ones.
     *
     * @param investment The investment to move to tax transactions
     * @return The created TaxTransaction
     */
    @Transactional
    public TaxTransaction moveInvestmentToTaxTransaction(Investment investment) {
        Objects.requireNonNull(investment, "Investment cannot be null");
        Objects.requireNonNull(investment.getEndDate(),
                "Investment must have an endDate to be moved to tax transactions");

        // Calculate gain
        double invested = investment.getAmount() != null ? investment.getAmount() : 0.0;
        double currentNav = investment.getCurrentNav() != null && investment.getCurrentNav() > 0
                ? investment.getCurrentNav()
                : investment.getNavAtBuy() != null && investment.getNavAtBuy() > 0
                        ? investment.getNavAtBuy() * 1.05
                        : 0.0;
        double finalValue = invested;
        if (investment.getUnits() != null && investment.getUnits() > 0 && currentNav > 0) {
            finalValue = investment.getUnits() * currentNav;
        } else if (invested > 0) {
            finalValue = invested * 1.15;
        }
        double gain = finalValue - invested;

        // Determine tax type based on holding period
        LocalDate buyDate = investment.getBuyDate();
        if (buyDate == null) {
            buyDate = investment.getStartDate() != null ? investment.getStartDate() : LocalDate.now();
        }
        long daysBetween = ChronoUnit.DAYS.between(buyDate, investment.getEndDate());
        String taxType = daysBetween > 365 ? "LTCG" : "STCG";

        // Create new TaxTransaction
        TaxTransaction taxTxn = new TaxTransaction();
        taxTxn.setTransactionId(UUID.randomUUID().toString());
        taxTxn.setUserId(investment.getUserId().toString());
        taxTxn.setFundName(
                investment.getSchemeName() != null ? investment.getSchemeName() : "Fund #" + investment.getFundId());
        taxTxn.setBuyDate(buyDate);
        taxTxn.setSellDate(investment.getEndDate());
        taxTxn.setUnits(investment.getUnits() != null ? investment.getUnits() : 0.0);
        taxTxn.setGain(gain);
        taxTxn.setTaxType(taxType);

        // Save to tax_transactions table
        return taxTransactionRepository.save(taxTxn);
    }
}
