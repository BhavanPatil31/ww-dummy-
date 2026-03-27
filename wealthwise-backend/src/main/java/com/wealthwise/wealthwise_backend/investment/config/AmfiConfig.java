package com.wealthwise.wealthwise_backend.investment.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;



@Configuration
@ConfigurationProperties(prefix = "amfi")
public class AmfiConfig {
    private String primaryUrl;
    private String fallbackUrl;

    public String getPrimaryUrl() {
        return primaryUrl;
    }

    public void setPrimaryUrl(String primaryUrl) {
        this.primaryUrl = primaryUrl;
    }

    public String getFallbackUrl() {
        return fallbackUrl;
    }

    public void setFallbackUrl(String fallbackUrl) {
        this.fallbackUrl = fallbackUrl;
    }
}
