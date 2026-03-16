package com.wealthwise.wealthwise_backend.auth.service;

import com.wealthwise.wealthwise_backend.auth.entity.User;
import com.wealthwise.wealthwise_backend.auth.repository.UserRepository;
import com.wealthwise.wealthwise_backend.auth.util.JwtUtil;
import com.wealthwise.wealthwise_backend.userprofile.entity.UserProfileDetails;
import com.wealthwise.wealthwise_backend.userprofile.repository.UserProfileRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.Random;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private JwtUtil jwtUtil;
    
    @Autowired
    private UserProfileRepository userProfileRepository;

    private BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public User register(User user) {
        // Hash the password before saving to the database
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    public Optional<String> login(String email, String rawPassword) {
        Optional<User> user = userRepository.findByEmail(email);

        // Check if user exists and if the raw password matches the hashed password
        if (user.isPresent() && passwordEncoder.matches(rawPassword, user.get().getPassword())) {
            // Generate valid JWT using JwtUtil
            String token = jwtUtil.generateToken(user.get().getEmail());
            return Optional.of(token);
        }

        return Optional.empty();
    }

    public Optional<User> getUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    // SEND OTP
    public String sendOtp(String email) {
        Optional<User> userOptional = userRepository.findByEmail(email);

        if (userOptional.isEmpty()) {
            return "User not found";
        }

        User user = userOptional.get();

        String otp = String.valueOf(100000 + new Random().nextInt(900000));

        user.setOtp(otp);

        userRepository.save(user);

        emailService.sendOtpEmail(email, otp);

        return "OTP sent to email";
    }

    // VERIFY OTP
    public String verifyOtp(String email, String otp) {
        Optional<User> userOptional = userRepository.findByEmail(email);

        if (userOptional.isEmpty()) {
            return "User not found";
        }

        User user = userOptional.get();

        if (user.getOtp() != null && user.getOtp().equals(otp)) {
            return "OTP verified";
        }

        return "Invalid OTP";
    }

    // RESET PASSWORD
    public String resetPassword(String email, String newPassword) {
        Optional<User> userOptional = userRepository.findByEmail(email);

        if (userOptional.isEmpty()) {
            return "User not found";
        }

        User user = userOptional.get();

        // Hash the NEW password before saving
        user.setPassword(passwordEncoder.encode(newPassword));

        userRepository.save(user);

        return "Password updated successfully";
    }
    
    public void deleteAccount(Long userId) {
        // Step 1 — delete profile first to avoid foreign key error
        Optional<UserProfileDetails> profile = userProfileRepository.findByUserId(userId);
        profile.ifPresent(userProfileRepository::delete);

        // Step 2 — delete user
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        userRepository.delete(user);
    }
}