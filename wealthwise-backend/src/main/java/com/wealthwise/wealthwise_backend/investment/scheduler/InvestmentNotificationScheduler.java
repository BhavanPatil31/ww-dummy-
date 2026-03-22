package com.wealthwise.wealthwise_backend.investment.scheduler;

import com.wealthwise.wealthwise_backend.investment.entity.Investment;
import com.wealthwise.wealthwise_backend.investment.repository.InvestmentRepository;
import com.wealthwise.wealthwise_backend.notification.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
public class InvestmentNotificationScheduler {

    @Autowired
    private InvestmentRepository investmentRepository;

    @Autowired
    private NotificationService notificationService;

    // Run every 10 seconds to make notifications pop up faster
    @Scheduled(fixedRate = 10000)
    public void checkInvestmentDueDates() {
        LocalDate today = LocalDate.now();
        
        // 1. Check for investments ending TODAY
        List<Investment> endingToday = investmentRepository.findByEndDate(today);
        for (Investment investment : endingToday) {
            String message = "Today is the last date of your investment in " + investment.getSchemeName() + ".";
            notificationService.createNotification(investment.getUserId(), message, "INVESTMENT_DUE");
        }
        
        // 2. Check for investments ending in 7 days (Warning)
        LocalDate sevenDaysOut = today.plusDays(7);
        List<Investment> endingSoon7 = investmentRepository.findByEndDate(sevenDaysOut);
        for (Investment investment : endingSoon7) {
            String message = "Your investment in " + investment.getSchemeName() + " will reach its end date in 7 days.";
            notificationService.createNotification(investment.getUserId(), message, "INVESTMENT_DUE");
        }

        // 3. Check for investments ending in 3 days (Urgent Warning)
        LocalDate threeDaysOut = today.plusDays(3);
        List<Investment> endingSoon3 = investmentRepository.findByEndDate(threeDaysOut);
        for (Investment investment : endingSoon3) {
            String message = "Your investment in " + investment.getSchemeName() + " will reach its end date in just 3 days.";
            notificationService.createNotification(investment.getUserId(), message, "INVESTMENT_DUE");
        }
        
        // 4. Check for investments that ended yesterday
        LocalDate yesterday = today.minusDays(1);
        List<Investment> endedYesterday = investmentRepository.findByEndDate(yesterday);
        for (Investment investment : endedYesterday) {
            String message = "Your investment in " + investment.getSchemeName() + " has reached its end date.";
            notificationService.createNotification(investment.getUserId(), message, "INVESTMENT_DUE");
        }
    }
    
    // For testing/manual trigger, we could add a method here if needed
}
