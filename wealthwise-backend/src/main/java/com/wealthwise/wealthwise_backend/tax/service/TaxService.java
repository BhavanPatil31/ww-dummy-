package com.wealthwise.wealthwise_backend.tax.service;

import com.wealthwise.wealthwise_backend.investment.entity.Investment;
import com.wealthwise.wealthwise_backend.investment.repository.InvestmentRepository;
import com.wealthwise.wealthwise_backend.tax.entity.TaxTransaction;
import com.wealthwise.wealthwise_backend.tax.repository.TaxTransactionRepository;
import com.wealthwise.wealthwise_backend.tax.dto.TaxTransactionDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
public class TaxService {

    @Autowired
    private TaxTransactionRepository taxTransactionRepository;

    @Autowired
    private InvestmentRepository investmentRepository;

    public List<TaxTransactionDTO> getTaxSummary(Long userId, String financialYear) {
        
        // AUTO SYNC: Move existing "Buy Funds" into the new Tax Transactions table so the UI populates
        List<Investment> investments = investmentRepository.findByUserId(userId);
        for (Investment inv : investments) {
            String txnId = "txn-" + inv.getInvestmentId();
            if (!taxTransactionRepository.existsById(txnId)) {
                TaxTransaction txn = new TaxTransaction();
                txn.setTransactionId(txnId);
                txn.setUserId(String.valueOf(userId));
                txn.setFundName(inv.getSchemeName() != null ? inv.getSchemeName() : "Fund #" + inv.getFundId());
                
                LocalDate buyDate = inv.getBuyDate() != null ? inv.getBuyDate() : (inv.getStartDate() != null ? inv.getStartDate() : LocalDate.now().minusDays(400));
                LocalDate sellDate = inv.getEndDate() != null ? inv.getEndDate() : LocalDate.now();

                txn.setBuyDate(buyDate);
                txn.setSellDate(sellDate);
                
                Double invested = inv.getAmount() != null ? inv.getAmount() : 0.0;
                Double finalValue;
                if (inv.getUnits() != null && inv.getCurrentNav() != null && inv.getUnits() > 0 && inv.getCurrentNav() > 0) {
                    finalValue = inv.getUnits() * inv.getCurrentNav();
                } else {
                    finalValue = invested * 1.15; // 15% dummy profit if no NAV available
                }
                
                txn.setUnits(inv.getUnits() != null ? inv.getUnits() : 0.0);
                txn.setGain(finalValue - invested);

                long daysBetween = ChronoUnit.DAYS.between(buyDate, sellDate);
                txn.setTaxType(daysBetween > 365 ? "LTCG" : "STCG");

                taxTransactionRepository.save(txn);
            }
        }


        List<TaxTransaction> transactions;

        int startYear = 0;
        int endYear = 0;
        if (financialYear != null && financialYear.contains("-")) {
            startYear = Integer.parseInt(financialYear.substring(0, 4));
            endYear = startYear + 1;
        }

        if (startYear > 0) {
            LocalDate fyStart = LocalDate.of(startYear, 4, 1);
            LocalDate fyEnd = LocalDate.of(endYear, 3, 31);
            transactions = taxTransactionRepository.findByUserIdAndSellDateBetween(String.valueOf(userId), fyStart, fyEnd);
        } else {
            transactions = taxTransactionRepository.findByUserId(String.valueOf(userId));
        }

        List<TaxTransactionDTO> result = new ArrayList<>();
        for (TaxTransaction txn : transactions) {
            TaxTransactionDTO dto = new TaxTransactionDTO();
            dto.setId(txn.getTransactionId());
            dto.setFundName(txn.getFundName());
            dto.setBuyDate(txn.getBuyDate());
            dto.setSellDate(txn.getSellDate());
            dto.setUnits(txn.getUnits());
            dto.setGain(txn.getGain());
            dto.setType(txn.getTaxType());
            result.add(dto);
        }
        return result;
    }
}
