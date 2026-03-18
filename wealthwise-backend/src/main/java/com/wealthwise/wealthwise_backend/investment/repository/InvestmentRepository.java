package com.wealthwise.wealthwise_backend.investment.repository;

import com.wealthwise.wealthwise_backend.investment.entity.Investment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface InvestmentRepository extends JpaRepository<Investment, Long> {

    List<Investment> findByUserId(Long userId);

    List<Investment> findByEndDate(LocalDate endDate);

    List<Investment> findByEndDateBetween(LocalDate start, LocalDate end);

}