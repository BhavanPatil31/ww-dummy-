package com.wealthwise.wealthwise_backend.tax.repository;

import com.wealthwise.wealthwise_backend.tax.entity.TaxTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

public interface TaxTransactionRepository extends JpaRepository<TaxTransaction, String> {
    List<TaxTransaction> findByUserId(String userId);
    List<TaxTransaction> findByUserIdAndSellDateBetween(String userId, LocalDate startDate, LocalDate endDate);
    @Transactional
    @Modifying
    void deleteByUserId(String userId);
    @Transactional
    @Modifying
    void deleteByUserIdAndSellDateBetween(String userId, LocalDate startDate, LocalDate endDate);
}
