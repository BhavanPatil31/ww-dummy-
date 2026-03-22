package com.wealthwise.wealthwise_backend.auth.service;

import com.wealthwise.wealthwise_backend.auth.entity.User;
import com.wealthwise.wealthwise_backend.auth.repository.UserRepository;
import com.wealthwise.wealthwise_backend.auth.util.JwtUtil;
import com.wealthwise.wealthwise_backend.userprofile.entity.UserProfileDetails;
import com.wealthwise.wealthwise_backend.userprofile.repository.UserProfileRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Objects;
import java.util.Optional;
import java.security.SecureRandom;

import org.springframework.lang.NonNull;

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

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final SecureRandom secureRandom = new SecureRandom();

    @SuppressWarnings("null")
    public User register(User user) {
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists: " + user.getEmail());
        }
        // Hash the password before saving to the database
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        // Newly registered users must verify their account via OTP before logging in
        user.setVerified(false);

        User savedUser = userRepository.save(user);

        // Send OTP to the user's email as part of the registration flow (login verification)
        sendOtp(savedUser.getEmail(), "login");

        return savedUser;
    }

    public Optional<String> login(String email, String rawPassword) {
        Optional<User> user = userRepository.findByEmail(email);

        // Check if user exists and if the raw password matches the hashed password
        if (user.isPresent() && passwordEncoder.matches(rawPassword, user.get().getPassword())) {
            // Ensure the user has verified their email via OTP
            Boolean verified = user.get().getVerified();
            if (Boolean.FALSE.equals(verified)) {
                // If not verified, generate and store a login OTP explicitly as login intent
                sendOtp(email, "login");
                throw new com.wealthwise.wealthwise_backend.auth.exception.AccountNotVerifiedException(
                        "Account not verified. OTP sent to email with login intent.");
            }

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
    @SuppressWarnings("null")
    public String sendOtp(String email, String otpType) {
        Optional<User> userOptional = userRepository.findByEmail(email);

        if (userOptional.isEmpty()) {
            return "User not found";
        }

        User user = userOptional.get();

        String otp = String.valueOf(100000 + secureRandom.nextInt(900000));

        user.setOtp(otp);
        user.setOtpType(otpType);

        userRepository.save(user);

        emailService.sendOtpEmail(email, otp);

        return "OTP sent to email";
    }

    // fallback for existing flows or simple controller usage
    public String sendOtp(String email) {
        return sendOtp(email, "password_recovery");
    }

    // VERIFY OTP
    public String verifyOtp(String email, String otp) {
        Optional<User> userOptional = userRepository.findByEmail(email);

        if (userOptional.isEmpty()) {
            return "User not found";
        }

        User user = userOptional.get();

        if (user.getOtp() != null && user.getOtp().equals(otp)) {
            // Mark user as verified and clear the OTP after successful verification
            user.setVerified(true);
            user.setOtp(null);
            user.setOtpType(null);
            userRepository.save(user);
            return "OTP verified";
        }

        return "Invalid OTP";
    }

    // RESET PASSWORD
    @SuppressWarnings("null")
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

    public void deleteAccount(@NonNull Long userId) {
        // Step 1 — delete profile first to avoid foreign key error
        Optional<UserProfileDetails> profile = userProfileRepository.findByUserId(userId);
        profile.ifPresent(userProfileRepository::delete);

        // Step 2 — delete user
        User user = Objects.requireNonNull(
                userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("User not found with id: " + userId)));
        userRepository.delete(user);
    }

    public void updateUserName(@NonNull Long userId, String newName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setName(newName);
        userRepository.save(user);
    }

    public void updateUserEmail(@NonNull Long userId, String newEmail) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setEmail(newEmail);
        userRepository.save(user);
    }
}