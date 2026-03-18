package com.wealthwise.wealthwise_backend.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);
    Long countByUserIdAndReadFalse(Long userId);
    
    boolean existsByUserIdAndMessage(Long userId, String message);
    
    void deleteByUserId(Long userId);
}
