package com.wealthwise.wealthwise_backend.investment.service;

import com.wealthwise.wealthwise_backend.investment.dto.MfApiResponse;
import com.wealthwise.wealthwise_backend.investment.dto.MfNavData;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class NavService {

    @Autowired
    private RestTemplate restTemplate;

    private static final String API_URL = "https://api.mfapi.in/mf/";
    private static final DateTimeFormatter MF_DATE_FORMAT = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    // In-memory cache for fund data
    private final Map<String, MfApiResponse> fundCache = new ConcurrentHashMap<>();

    public List<Map<String, Object>> searchFunds(String query) {
        String url = "https://api.mfapi.in/mf/search?q=" + query;

        try {
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );
            return response.getBody() != null ? response.getBody() : Collections.emptyList();
        } catch (Exception e) {
            System.err.println("Error searching funds: " + e.getMessage());
            return Collections.emptyList();
        }
    }

    public Double getLatestNav(String fundId) {
        if (fundId == null || fundId.trim().isEmpty()) return 0.0;

        try {
            MfApiResponse response = getFundData(fundId);
            if (response != null && response.getData() != null && !response.getData().isEmpty()) {
                // mfapi.in data[0] is the latest
                MfNavData latest = response.getData().get(0);
                if (latest.getNav() != null) {
                    return Double.parseDouble(latest.getNav());
                }
            }
        } catch (Exception e) {
            System.err.println("Error fetching latest NAV for fund " + fundId + ": " + e.getMessage());
        }
        return 0.0;
    }

    private MfApiResponse getFundData(String fundId) {
        if (fundCache.containsKey(fundId)) {
            return fundCache.get(fundId);
        }

        try {
            MfApiResponse response = restTemplate.getForObject(API_URL + fundId, MfApiResponse.class);
            if (response != null && response.getData() != null && !response.getData().isEmpty()) {
                fundCache.put(fundId, response);
                return response;
            }
        } catch (Exception e) {
            System.err.println("External API error for " + fundId + ": " + e.getMessage());
        }
        return null;
    }

    /**
     * Finds the NAV for a specific date:
     * 1. Exact match if available.
     * 2. Nearest previous available date (<= target).
     * 3. If target is in future -> return latest available (data[0]).
     */
    public Double getNavForDate(String fundId, String selectedDate) {
        if (fundId == null || fundId.isEmpty()) return 0.0;
        
        try {
            MfApiResponse response = getFundData(fundId);
            if (response == null || response.getData() == null || response.getData().isEmpty()) {
                return 0.0;
            }

            LocalDate targetDate;
            try {
                targetDate = LocalDate.parse(selectedDate);
            } catch (Exception e) {
                // If date is invalid, return latest
                return Double.parseDouble(response.getData().get(0).getNav());
            }

            LocalDate today = LocalDate.now();

            // REQUIREMENT: Future date -> ALWAYS use data[0] (latest available)
            if (targetDate.isAfter(today)) {
                return Double.parseDouble(response.getData().get(0).getNav());
            }

            // Since mfapi.in returns data sorted latest first (data[0] is newest):
            // The FIRST entry where navDate <= targetDate is the correct nearest previous NAV.
            for (MfNavData navData : response.getData()) {
                try {
                    LocalDate navDate = LocalDate.parse(navData.getDate(), MF_DATE_FORMAT);
                    if (!navDate.isAfter(targetDate)) {
                        return Double.parseDouble(navData.getNav());
                    }
                } catch (Exception parseEx) {
                    // Skip malformed individual entries
                }
            }

        } catch (Exception e) {
            System.err.println("NavService: Error fetching NavForDate for " + fundId + ": " + e.getMessage());
        }

        return 0.0;
    }
}
