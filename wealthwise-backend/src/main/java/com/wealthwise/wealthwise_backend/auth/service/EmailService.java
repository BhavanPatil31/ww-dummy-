package com.wealthwise.wealthwise_backend.auth.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendOtpEmail(String toEmail, String otp){

        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(toEmail);
        message.setSubject("WealthWise OTP Verification");
        message.setText("Your WealthWise OTP is: " + otp + "\n\n" +
                "Use this to verify your account or reset your password.");

        mailSender.send(message);
    }
}
