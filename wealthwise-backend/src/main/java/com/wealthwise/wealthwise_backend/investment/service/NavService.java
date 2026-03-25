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
        if (fundId == null || fundId.isBlank()) return 1.0;

        try {
            MfApiResponse response = getFundData(fundId);
            if (response != null && response.getData() != null && !response.getData().isEmpty()) {
                MfNavData latest = response.getData().get(0);
                if (latest.getNav() != null) {
                    return Double.parseDouble(latest.getNav());
                }
            }
        } catch (Exception e) {
            System.err.println("Error fetching latest NAV for " + fundId + ": " + e.getMessage());
        }
        return 1.0;
    }

    private MfApiResponse getFundData(String fundId) {
        // Return from cache if available to prevent rate limits/Bad Gateway
        if (fundCache.containsKey(fundId)) {
            System.out.println("NavService: Serving data for fund " + fundId + " from cache.");
            return fundCache.get(fundId);
        }

        try {
            System.out.println("NavService: Fetching live data for fund " + fundId + " from external API.");
            MfApiResponse response = restTemplate.getForObject(API_URL + fundId, MfApiResponse.class);
            if (response != null && response.getData() != null) {
                fundCache.put(fundId, response);
                return response;
            }
        } catch (Exception e) {
            System.err.println("NavService: External API error for fund " + fundId + ": " + e.getMessage());
        }
        return null;
    }

    public Double getNavForDate(String fundId, String selectedDate) {
        if (fundId == null || fundId.isEmpty()) {
            return 1.0;
        }

        if (selectedDate == null || selectedDate.trim().isEmpty()) {
            return getLatestNav(fundId);
        }

        LocalDate targetDate;
        try {
            // Frontend sends ISO date: yyyy-MM-dd
            targetDate = LocalDate.parse(selectedDate);
            System.out.println("NavService: Targeted Date: " + targetDate);
        } catch (Exception e) {
            System.err.println("Invalid selected date format: " + selectedDate + ". Falling back to latest NAV.");
            return getLatestNav(fundId);
        }

        try {
            MfApiResponse response = getFundData(fundId);
            if (response == null || response.getData() == null || response.getData().isEmpty()) {
                System.out.println("NavService: No data available for fund " + fundId);
                return 1.0;
            }

            LocalDate nearestDate = null;
            Double nearestNav = null;
            
            // The API returns dates in DD-MM-YYYY format

            for (MfNavData navData : response.getData()) {
                String dateStr = navData.getDate();
                String navStr = navData.getNav();
                
                if (dateStr == null || navStr == null) continue;

                try {
                    LocalDate navDate = LocalDate.parse(dateStr, MF_DATE_FORMAT);
                    Double navValue = Double.parseDouble(navStr);

                    // We want the newest date that is NOT AFTER the target date
                    if (!navDate.isAfter(targetDate)) {
                        if (nearestDate == null || navDate.isAfter(nearestDate)) {
                            nearestDate = navDate;
                            nearestNav = navValue;
                        }
                    }
                } catch (Exception parseEx) {
                    // skip invalid entries
                }
            }

            if (nearestNav != null) {
                System.out.println("NavService: Found NAV " + nearestNav + " for date " + nearestDate + " (targeted " + targetDate + ")");
                return nearestNav;
            }

            // If we found nothing before the date, maybe its the oldest record?
            // (The loop above already finds nearest previous, so if nearestNav is null, target is likely too old)
            System.out.println("NavService: No history found before " + targetDate + ". Using oldest available.");
            MfNavData oldest = response.getData().get(response.getData().size() - 1);
            return Double.parseDouble(oldest.getNav());

        } catch (Exception e) {
            System.err.println("Error fetching date-based NAV for fundId " + fundId + ": " + e.getMessage());
            e.printStackTrace();
        }

        return getLatestNav(fundId);
    }
}
