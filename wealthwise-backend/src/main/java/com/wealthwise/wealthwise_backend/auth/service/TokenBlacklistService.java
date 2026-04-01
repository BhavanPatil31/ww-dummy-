package com.wealthwise.wealthwise_backend.auth.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
public class TokenBlacklistService {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    public void blacklistToken(String token, long expirationMillis) {
        if (token != null && !token.isBlank() && expirationMillis > 0) {
            redisTemplate.opsForValue().set(token, "blacklisted", expirationMillis, TimeUnit.MILLISECONDS);
        }
    }

    public boolean isTokenBlacklisted(String token) {
        if (token == null || token.isBlank()) return false;
        return Boolean.TRUE.equals(redisTemplate.hasKey(token));
    }
}
