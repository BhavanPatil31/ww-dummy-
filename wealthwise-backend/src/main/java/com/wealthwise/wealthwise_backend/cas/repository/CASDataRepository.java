package com.wealthwise.wealthwise_backend.cas.repository;

import com.wealthwise.wealthwise_backend.cas.entity.CASData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CASDataRepository extends JpaRepository<CASData, Long> {
    List<CASData> findByUserId(Long userId);
    Optional<CASData> findByUserIdAndFinancialYear(Long userId, String financialYear);
}
