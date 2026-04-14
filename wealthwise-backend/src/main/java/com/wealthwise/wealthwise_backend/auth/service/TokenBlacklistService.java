package com.wealthwise.wealthwise_backend.auth.service;

import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
public class TokenBlacklistService {

    private final java.util.Map<String, Long> blacklist = new java.util.concurrent.ConcurrentHashMap<>();

    public void blacklistToken(String token, long expirationMillis) {
        if (token != null && !token.trim().isEmpty() && expirationMillis > 0) {
            blacklist.put(token, System.currentTimeMillis() + expirationMillis);
        }
    }

    public boolean isTokenBlacklisted(String token) {
        if (token == null || token.trim().isEmpty()) return false;
        Long expirationTime = blacklist.get(token);
        if (expirationTime == null) return false;
        
        if (System.currentTimeMillis() > expirationTime) {
            blacklist.remove(token); // cleanup expired token
            return false;
        }
        return true;
    }
}
