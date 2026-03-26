package com.wealthwise.wealthwise_backend.investment.repository;

import com.wealthwise.wealthwise_backend.investment.entity.MutualFund;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MutualFundRepository extends JpaRepository<MutualFund, String> {
}
