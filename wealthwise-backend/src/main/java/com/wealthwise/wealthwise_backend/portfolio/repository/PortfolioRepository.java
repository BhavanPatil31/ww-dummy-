package com.wealthwise.wealthwise_backend.portfolio.repository;

import com.wealthwise.wealthwise_backend.portfolio.entity.Portfolio;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PortfolioRepository extends JpaRepository<Portfolio, Integer> {
    Optional<Portfolio> findByUserId(Long userId);
}
