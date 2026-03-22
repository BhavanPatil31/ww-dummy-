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
import java.util.List;
import java.util.Map;

@Service
public class NavService {

    @Autowired
    private RestTemplate restTemplate;

    private static final String API_URL = "https://api.mfapi.in/mf/";
    private static final DateTimeFormatter MF_DATE_FORMAT = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    public List<Map<String, Object>> searchFunds(String query) {
        String url = "https://api.mfapi.in/mf/search?q=" + query;

        try {
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );
            return response.getBody() != null ? response.getBody() : List.of();
        } catch (Exception e) {
            System.err.println("Error searching funds: " + e.getMessage());
            return List.of();
        }
    }

    public Double getLatestNav(String fundId) {

        if (fundId == null)
            return 1.0;

        try {

            MfApiResponse response = restTemplate.getForObject(API_URL + fundId, MfApiResponse.class);

            if (response != null && response.getData() != null && !response.getData().isEmpty()) {
                // Get latest NAV (last record usually latest)
                MfNavData latest = response.getData().get(0);
                if (latest.getNav() != null) {
                    return Double.parseDouble(latest.getNav());
                }
            }

        } catch (Exception e) {
            System.err.println("Error fetching NAV for fundId " + fundId + ": " + e.getMessage());
        }

        return 1.0; // fallback NAV
    }

    public Double getNavForDate(String fundId, String selectedDate) {
        if (fundId == null) {
            return 1.0;
        }

        if (selectedDate == null || selectedDate.isBlank()) {
            return getLatestNav(fundId);
        }

        LocalDate targetDate;
        try {
            // Frontend sends ISO date: yyyy-MM-dd
            targetDate = LocalDate.parse(selectedDate);
        } catch (Exception e) {
            System.err.println("Invalid selected date format: " + selectedDate + ". Falling back to latest NAV.");
            return getLatestNav(fundId);
        }

        try {
            MfApiResponse response = restTemplate.getForObject(API_URL + fundId, MfApiResponse.class);
            if (response == null || response.getData() == null || response.getData().isEmpty()) {
                return 1.0;
            }

            LocalDate nearestPreviousDate = null;
            Double nearestPreviousNav = null;

            LocalDate oldestAvailableDate = null;
            Double oldestAvailableNav = null;

            for (MfNavData navData : response.getData()) {
                if (navData == null || navData.getDate() == null || navData.getNav() == null) {
                    continue;
                }

                LocalDate navDate;
                Double navValue;
                try {
                    navDate = LocalDate.parse(navData.getDate(), MF_DATE_FORMAT);
                    navValue = Double.parseDouble(navData.getNav());
                } catch (Exception parseEx) {
                    continue;
                }

                if (oldestAvailableDate == null || navDate.isBefore(oldestAvailableDate)) {
                    oldestAvailableDate = navDate;
                    oldestAvailableNav = navValue;
                }

                if (!navDate.isAfter(targetDate)) {
                    if (nearestPreviousDate == null || navDate.isAfter(nearestPreviousDate)) {
                        nearestPreviousDate = navDate;
                        nearestPreviousNav = navValue;
                    }
                }
            }

            if (nearestPreviousNav != null) {
                return nearestPreviousNav;
            }

            // If selected date is older than available history, return oldest available NAV.
            if (oldestAvailableNav != null) {
                return oldestAvailableNav;
            }
        } catch (Exception e) {
            System.err.println("Error fetching date-based NAV for fundId " + fundId + ": " + e.getMessage());
        }

        return getLatestNav(fundId);
    }
}
