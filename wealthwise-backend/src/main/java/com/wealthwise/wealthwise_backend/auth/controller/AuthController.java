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
    public ResponseEntity<Map<String, String>> login(@RequestBody User user) {
        Optional<String> tokenOpt = authService.login(user.getEmail(), user.getPassword());
        Map<String, String> response = new HashMap<>();

        if (tokenOpt.isPresent()) {
            response.put("message", "Login Successful");

            // Fetch name for frontend Welcome Message
            Optional<User> loggedUser = authService.getUserByEmail(user.getEmail());
            if (loggedUser.isPresent()) {
                response.put("name", loggedUser.get().getName());
                response.put("id", String.valueOf(loggedUser.get().getUser_id()));
            }

            // Supply the newly generated JWT Token mapped into 'token'
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

    @PostMapping("/debug-login")
    public ResponseEntity<String> debugLogin(@RequestBody User user) {
        try {
            Optional<String> tokenOpt = authService.login(user.getEmail(), user.getPassword());
            return ResponseEntity.ok("Success: " + tokenOpt.orElse("null token"));
        } catch (Exception e) {
            java.io.StringWriter sw = new java.io.StringWriter();
            java.io.PrintWriter pw = new java.io.PrintWriter(sw);
            e.printStackTrace(pw);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(sw.toString());
        }
    }
}