package com.wealthwise.wealthwise_backend.investment.repository;

import com.wealthwise.wealthwise_backend.investment.entity.Investment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface InvestmentRepository extends JpaRepository<Investment, Long> {

    List<Investment> findByUserId(Long userId);

    @Query("SELECT i FROM Investment i WHERE i.userId = :userId AND (i.endDate IS NULL OR i.endDate >= :today)")
    List<Investment> findActiveByUserId(@Param("userId") Long userId, @Param("today") LocalDate today);

    List<Investment> findByEndDate(LocalDate endDate);

    List<Investment> findByEndDateBetween(LocalDate start, LocalDate end);

    @Modifying
    @Query(value = "DELETE FROM goal_investments WHERE investment_id = :investmentId", nativeQuery = true)
    void deleteGoalInvestmentsByInvestmentId(@Param("investmentId") Long investmentId);

}
