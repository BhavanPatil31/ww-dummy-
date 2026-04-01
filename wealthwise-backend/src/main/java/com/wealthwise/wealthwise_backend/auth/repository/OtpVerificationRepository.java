package com.wealthwise.wealthwise_backend.auth.repository;

import com.wealthwise.wealthwise_backend.auth.entity.OtpVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OtpVerificationRepository extends JpaRepository<OtpVerification, Long> {
    Optional<OtpVerification> findTopByUserIdOrderByIdDesc(Long userId);
    void deleteByUserId(Long userId);
}
