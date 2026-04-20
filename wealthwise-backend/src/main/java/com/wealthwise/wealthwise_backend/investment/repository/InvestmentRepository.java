package com.wealthwise.wealthwise_backend.investment.repository;

import com.wealthwise.wealthwise_backend.investment.entity.Investment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface InvestmentRepository extends JpaRepository<Investment, Long> {

    List<Investment> findByUserId(Long userId);
    
    void deleteByUserId(Long userId);

    @Query("SELECT i FROM Investment i WHERE i.userId = :userId AND i.endDate IS NULL AND (i.status IS NULL OR UPPER(i.status) NOT IN ('SOLD','CLOSED','DELETED'))")
    List<Investment> findActiveByUserId(@Param("userId") Long userId);

    @Query("SELECT i.investmentId FROM Investment i WHERE i.userId = :userId AND i.investmentId IN :ids AND i.endDate IS NULL AND (i.status IS NULL OR UPPER(i.status) NOT IN ('SOLD','CLOSED','DELETED'))")
    List<Long> findActiveIdsByUserIdAndIds(@Param("userId") Long userId, @Param("ids") List<Long> ids);

    @Query("SELECT i FROM Investment i WHERE i.userId = :userId AND i.status = 'DELETED'")
    List<Investment> findDeletedByUserId(@Param("userId") Long userId);

    List<Investment> findByEndDate(LocalDate endDate);

    List<Investment> findByEndDateBetween(LocalDate start, LocalDate end);

    @Modifying
    @Transactional
    @Query(value = "UPDATE investments SET status = 'DELETED', deleted_at = CURRENT_TIMESTAMP WHERE id = :id", nativeQuery = true)
    void softDeleteInvestment(@Param("id") Long id);

    @Modifying
    @Transactional
    @Query(value = "UPDATE investments SET status = 'DELETED', deleted_at = CURRENT_TIMESTAMP WHERE user_id = :userId AND (status IS NULL OR status != 'DELETED')", nativeQuery = true)
    void softDeleteAllByUserId(@Param("userId") Long userId);

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM investments WHERE id = :id", nativeQuery = true)
    void permanentlyDeleteById(@Param("id") Long id);

    @Modifying
    @Transactional
    @Query(value = "UPDATE investments SET status = 'ACTIVE', deleted_at = NULL WHERE id = :id", nativeQuery = true)
    void recoverInvestment(@Param("id") Long id);

    @Modifying
    @Query(value = "DELETE FROM goal_investments WHERE investment_id = :investmentId", nativeQuery = true)
    void deleteGoalInvestmentsByInvestmentId(@Param("investmentId") Long investmentId);

}
