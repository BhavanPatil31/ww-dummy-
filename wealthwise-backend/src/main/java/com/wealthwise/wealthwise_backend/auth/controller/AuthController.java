package com.wealthwise.wealthwise_backend.auth.controller;

import com.wealthwise.wealthwise_backend.auth.entity.User;
import com.wealthwise.wealthwise_backend.auth.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Optional;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private AuthService authService;

    // REGISTER / SIGNUP
    @PostMapping("/signup")
    public ResponseEntity<Map<String, Object>> register(@RequestBody User user) {
        User savedUser = authService.register(user);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Account created successfully");
        response.put("user", savedUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // LOGIN
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody User user) {
        Optional<String> tokenOpt = authService.login(user.getEmail(), user.getPassword());
        Map<String, Object> response = new HashMap<>();
        if (tokenOpt.isPresent()) {
            response.put("message", "Login Successful");
            Optional<User> loggedUser = authService.getUserByEmail(user.getEmail());
            if (loggedUser.isPresent()) {
                response.put("name",   loggedUser.get().getName());
                response.put("userId", loggedUser.get().getUser_id());
                response.put("email",  loggedUser.get().getEmail());
            }
            response.put("token", tokenOpt.get());
            return ResponseEntity.ok(response);
        }
        response.put("error", "Invalid Credentials");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    // SEND OTP
    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, String>> sendOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String result = authService.sendOtp(email);
        Map<String, String> response = new HashMap<>();
        if (result.equals("User not found")) {
            response.put("error", result);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
        response.put("message", result);
        return ResponseEntity.ok(response);
    }

    // VERIFY OTP
    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, String>> verifyOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String otp = body.get("otp");
        String result = authService.verifyOtp(email, otp);
        Map<String, String> response = new HashMap<>();
        if (result.equals("User not found") || result.equals("Invalid OTP")) {
            response.put("error", result);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
        response.put("message", result);
        return ResponseEntity.ok(response);
    }

    // RESET PASSWORD
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String newPassword = body.get("newPassword");
        String result = authService.resetPassword(email, newPassword);
        Map<String, String> response = new HashMap<>();
        if (result.equals("User not found")) {
            response.put("error", result);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
        response.put("message", result);
        return ResponseEntity.ok(response);
    }

    // ✅ DELETE ACCOUNT
    @DeleteMapping("/delete/{userId}")
    public ResponseEntity<Map<String, String>> deleteAccount(@PathVariable Long userId) {
        Map<String, String> response = new HashMap<>();
        try {
            authService.deleteAccount(userId);
            response.put("message", "Account deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }
}