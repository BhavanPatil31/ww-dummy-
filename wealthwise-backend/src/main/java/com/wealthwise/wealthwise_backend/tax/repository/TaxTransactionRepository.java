package com.wealthwise.wealthwise_backend.tax.repository;

import com.wealthwise.wealthwise_backend.tax.entity.TaxTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface TaxTransactionRepository extends JpaRepository<TaxTransaction, String> {
    List<TaxTransaction> findByUserId(String userId);
    List<TaxTransaction> findByUserIdAndSellDateBetween(String userId, LocalDate startDate, LocalDate endDate);
    void deleteByUserId(String userId);
}
