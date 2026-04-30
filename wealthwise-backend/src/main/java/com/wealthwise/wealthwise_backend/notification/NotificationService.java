package com.wealthwise.wealthwise_backend.notification;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.wealthwise.wealthwise_backend.auth.repository.UserRepository;
import java.util.List;
import java.util.Optional;

@Service
@SuppressWarnings("null")
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public void deleteNotificationsByUserId(Long userId) {
        notificationRepository.deleteByUserId(userId);
    }

    public List<Notification> getNotificationsByUserId(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public Long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    public void markAsRead(Long id) {
        Optional<Notification> notificationOpt = notificationRepository.findById(id);
        if (notificationOpt.isPresent()) {
            Notification notification = notificationOpt.get();
            notification.setRead(true);
            notificationRepository.save(notification);
        }
    }

    public void markAsUnread(Long id) {
        Optional<Notification> notificationOpt = notificationRepository.findById(id);
        if (notificationOpt.isPresent()) {
            Notification notification = notificationOpt.get();
            notification.setRead(false);
            notificationRepository.save(notification);
        }
    }
    
    public Notification createNotification(Long userId, String message) {
        return createNotification(userId, message, "GENERAL");
    }

    public Notification createNotification(Long userId, String message, String type) {
        if (userId == null) {
            System.err.println("Skipping notification creation because userId is null.");
            return null;
        }

        if (!userRepository.existsById(userId)) {
            System.err.println("Skipping notification creation because userId does not exist: " + userId);
            return null;
        }

        // Prevent duplicate notifications with the exact same message for the user
        try {
            if (notificationRepository.existsByUserIdAndMessage(userId, message)) {
                return null;
            }

            Notification notification = new Notification();
            notification.setUserId(userId);
            notification.setMessage(message);
            notification.setNotificationType(type);
            notification.setRead(false); // also sets status to UNREAD
            return notificationRepository.save(notification);
        } catch (DataIntegrityViolationException ex) {
            System.err.println("Skipping notification creation because of FK/constraint issue: " + ex.getMessage());
            return null;
        }
    }
}
