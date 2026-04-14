package com.wealthwise.wealthwise_backend.cas.service;

import com.wealthwise.wealthwise_backend.cas.dto.CASTransactionDTO;
import com.wealthwise.wealthwise_backend.cas.dto.CASUploadRequest;
import com.wealthwise.wealthwise_backend.cas.entity.CASData;
import com.wealthwise.wealthwise_backend.cas.entity.CASTransaction;
import com.wealthwise.wealthwise_backend.cas.repository.CASDataRepository;
import com.wealthwise.wealthwise_backend.tax.entity.TaxTransaction;
import com.wealthwise.wealthwise_backend.tax.repository.TaxTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CASService {

    private static final int ACCOUNT_NAME_MAX_LENGTH = 2048;
    private static final int ACCOUNT_ID_MAX_LENGTH = 2048;

    @Autowired
    private CASDataRepository casDataRepository;

    @Autowired
    private TaxTransactionRepository taxTransactionRepository;

    private String safeString(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.length() <= maxLength) {
            return trimmed;
        }
        System.err.println("CASService.uploadCASData: truncating field to " + maxLength + " chars, original length=" + trimmed.length());
        return trimmed.substring(0, maxLength);
    }

    @Transactional
    public CASData uploadCASData(CASUploadRequest request) {
        try {
            // Check if CAS data already exists for this user and financial year
            Optional<CASData> existing = casDataRepository.findByUserIdAndFinancialYear(
                request.getUser_id(), 
                request.getFinancial_year()
            );

            List<CASTransactionDTO> dtos = request.getTransactions();
            if (dtos == null || dtos.isEmpty()) {
                throw new IllegalArgumentException("CAS upload must contain at least one transaction row.");
            }

            CASData casData;
            if (existing.isPresent()) {
                casData = existing.get();
                if (casData.getTransactions() == null) {
                    casData.setTransactions(new ArrayList<>());
                } else {
                    casData.getTransactions().clear(); // Clear old transactions
                }
            } else {
                casData = new CASData();
                casData.setUserId(request.getUser_id());
            }

            casData.setFinancialYear(request.getFinancial_year());
            casData.setAccountName(safeString(request.getAccount_name(), ACCOUNT_NAME_MAX_LENGTH));
            casData.setAccountId(safeString(request.getAccount_id(), ACCOUNT_ID_MAX_LENGTH));
            casData.setLtcg(request.getLtcg());
            casData.setStcg(request.getStcg());

            // Parse and add transactions
            List<CASTransaction> transactions = new ArrayList<>();
            DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE;

            int rowIndex = 0;
            for (CASTransactionDTO dto : dtos) {
                if (dto == null) {
                    throw new IllegalArgumentException("Transaction row " + rowIndex + " is invalid.");
                }
                if (dto.getFundName() == null || dto.getFundName().isBlank()) {
                    throw new IllegalArgumentException("Transaction row " + rowIndex + " is missing fundName.");
                }
                if (dto.getBuyDate() == null || dto.getSellDate() == null) {
                    throw new IllegalArgumentException("Transaction row " + rowIndex + " is missing buyDate or sellDate.");
                }
                if (dto.getUnits() == null || dto.getGain() == null) {
                    throw new IllegalArgumentException("Transaction row " + rowIndex + " is missing units or gain.");
                }
                if (dto.getType() == null || dto.getType().isBlank()) {
                    throw new IllegalArgumentException("Transaction row " + rowIndex + " is missing tax type.");
                }
                CASTransaction transaction = new CASTransaction();
                transaction.setCasData(casData);
                transaction.setFundName(dto.getFundName());
                transaction.setBuyDate(LocalDate.parse(dto.getBuyDate(), formatter));
                transaction.setSellDate(LocalDate.parse(dto.getSellDate(), formatter));
                transaction.setUnits(dto.getUnits());
                transaction.setGain(dto.getGain());
                transaction.setTaxType(dto.getType());
                transactions.add(transaction);
                rowIndex++;
            }

            // Set transactions properly to avoid Hibernate collection tracking issues
            if (existing.isPresent()) {
                if (casData.getTransactions() == null) {
                    casData.setTransactions(transactions);
                } else {
                    casData.getTransactions().addAll(transactions);
                }
            } else {
                casData.setTransactions(transactions);
            }
            CASData savedCasData = casDataRepository.save(casData);
            syncTaxTransactions(savedCasData);
            return savedCasData;
        } catch (Exception e) {
            System.err.println("CASService.uploadCASData failed: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Error uploading CAS data: " + e.getMessage());
        }
    }

    private void syncTaxTransactions(CASData casData) {
        if (casData == null || casData.getTransactions() == null || casData.getTransactions().isEmpty()) {
            return;
        }

        String userIdString = casData.getUserId().toString();
        String financialYear = casData.getFinancialYear();
        if (financialYear != null && financialYear.contains("-")) {
            int startYear = Integer.parseInt(financialYear.substring(0, 4));
            int endYear = startYear + 1;
            LocalDate fyStart = LocalDate.of(startYear, 4, 1);
            LocalDate fyEnd = LocalDate.of(endYear, 3, 31);
            taxTransactionRepository.deleteByUserIdAndSourceAndSellDateBetween(userIdString, "CAS", fyStart, fyEnd);
        }

        List<TaxTransaction> taxTransactions = new ArrayList<>();
        for (CASTransaction transaction : casData.getTransactions()) {
            TaxTransaction taxTransaction = new TaxTransaction();
            taxTransaction.setTransactionId(UUID.randomUUID().toString());
            taxTransaction.setUserId(userIdString);
            taxTransaction.setFundName(transaction.getFundName());
            taxTransaction.setBuyDate(transaction.getBuyDate());
            taxTransaction.setSellDate(transaction.getSellDate());
            taxTransaction.setUnits(transaction.getUnits());
            taxTransaction.setGain(transaction.getGain());
            taxTransaction.setTaxType(transaction.getTaxType());
            taxTransaction.setSource("CAS");
            taxTransactions.add(taxTransaction);
        }
        taxTransactionRepository.saveAll(taxTransactions);
    }

    public List<CASData> getCASDataByUser(Long userId) {
        return casDataRepository.findByUserId(userId);
    }

    public Optional<CASData> getCASDataByUserAndYear(Long userId, String financialYear) {
        return casDataRepository.findByUserIdAndFinancialYear(userId, financialYear);
    }
}
