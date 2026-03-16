package com.wealthwise.wealthwise_backend.userprofile.repository;

import com.wealthwise.wealthwise_backend.userprofile.entity.ProfileActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProfileActivityLogRepository extends JpaRepository<ProfileActivityLog, Long> {

    @Query("SELECT l FROM ProfileActivityLog l WHERE l.userId = :userId ORDER BY l.changedAt DESC")
    List<ProfileActivityLog> findByUserIdOrderByChangedAtDesc(@Param("userId") Long userId);
}