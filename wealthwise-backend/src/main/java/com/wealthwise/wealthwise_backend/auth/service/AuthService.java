package com.wealthwise.wealthwise_backend.auth.service;

import com.wealthwise.wealthwise_backend.auth.entity.OtpVerification;
import com.wealthwise.wealthwise_backend.auth.repository.OtpVerificationRepository;
import com.wealthwise.wealthwise_backend.auth.entity.User;
import com.wealthwise.wealthwise_backend.auth.repository.UserRepository;
import java.time.LocalDateTime;
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

    @Autowired
    private OtpVerificationRepository otpVerificationRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final SecureRandom secureRandom = new SecureRandom();

    public User register(User user) {
        Objects.requireNonNull(user, "User cannot be null");
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists: " + user.getEmail());
        }
        // Hash the password before saving to the database
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        // Newly registered users must verify their account via OTP before logging in
        user.setVerified(false);

        User savedUser = Objects.requireNonNull(userRepository.save(user), "Saved user cannot be null");

        // Send OTP to the user's email as part of the registration flow (login verification)
        sendOtp(Objects.requireNonNull(savedUser.getEmail(), "User email cannot be null"), "login");

        return savedUser;
    }

    public Optional<String> login(String email, String rawPassword) {
        Objects.requireNonNull(email, "Email cannot be null");
        Objects.requireNonNull(rawPassword, "Password cannot be null");
        Optional<User> userOptional = userRepository.findByEmail(email);

        // Check if user exists and if the raw password matches the hashed password
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            if (passwordEncoder.matches(rawPassword, user.getPassword())) {
                // Ensure the user has verified their email via OTP
                Boolean verified = user.getVerified();
                if (Boolean.FALSE.equals(verified)) {
                    // If not verified, generate and store a login OTP explicitly as login intent
                    sendOtp(email, "login");
                    throw new com.wealthwise.wealthwise_backend.auth.exception.AccountNotVerifiedException(
                            "Account not verified. OTP sent to email with login intent.");
                }

                // Generate valid JWT using JwtUtil
                String token = jwtUtil.generateToken(Objects.requireNonNull(user.getEmail(), "User email cannot be null"));
                return Optional.of(Objects.requireNonNull(token, "Generated token cannot be null"));
            }
        }

        return Optional.empty();
    }

    public Optional<User> getUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    // SEND OTP
    public String sendOtp(String email, String otpType) {
        Objects.requireNonNull(email, "Email cannot be null");
        Objects.requireNonNull(otpType, "OTP Type cannot be null");
        Optional<User> userOptional = userRepository.findByEmail(email);

        if (!userOptional.isPresent()) {
            return "User not found";
        }

        User user = userOptional.get();

        String otp = String.valueOf(100000 + secureRandom.nextInt(900000));

        // Create new record in db
        OtpVerification otpVerification = new OtpVerification();
        otpVerification.setUserId(user.getUser_id());
        otpVerification.setOtpCode(otp);
        otpVerification.setOtpType(otpType);
        otpVerification.setExpiryTime(LocalDateTime.now().plusMinutes(2)); // 2 minutes expiry
        otpVerification.setIsUsed(false);
        otpVerification.setAttempts(0);
        
        otpVerificationRepository.save(otpVerification);

        emailService.sendOtpEmail(email, otp);

        return "OTP sent to email";
    }

    // fallback for existing flows or simple controller usage
    public String sendOtp(String email) {
        return sendOtp(email, "password_recovery");
    }

    // VERIFY OTP
    public String verifyOtp(String email, String otp) {
        Objects.requireNonNull(email, "Email cannot be null");
        Objects.requireNonNull(otp, "OTP cannot be null");
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

        OtpVerification otpVerification = otpVerificationRepository.findTopByUserIdOrderByIdDesc(user.getUser_id())
                .orElseThrow(() -> new RuntimeException("No OTP found for user: " + email));

        if (Boolean.TRUE.equals(otpVerification.getIsUsed())) {
            return "OTP already used";
        }

        if (otpVerification.getExpiryTime().isBefore(LocalDateTime.now())) {
            return "OTP expired";
        }

        if (otpVerification.getAttempts() >= 5) {
            return "Too many failed attempts";
        }

        if (!otpVerification.getOtpCode().equals(otp)) {
            otpVerification.setAttempts(otpVerification.getAttempts() + 1);
            otpVerificationRepository.save(otpVerification);
            return "Invalid OTP";
        }

        // Mark user as verified and clear the OTP after successful verification
        otpVerification.setIsUsed(true);
        otpVerificationRepository.save(otpVerification);

        user.setVerified(true);
        userRepository.save(user);

        return "OTP verified";
    }

    // RESET PASSWORD
    public String resetPassword(String email, String newPassword) {
        Objects.requireNonNull(email, "Email cannot be null");
        Objects.requireNonNull(newPassword, "New Password cannot be null");
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

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