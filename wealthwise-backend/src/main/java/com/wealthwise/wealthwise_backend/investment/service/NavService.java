package com.wealthwise.wealthwise_backend.investment.service;

import com.wealthwise.wealthwise_backend.investment.dto.MfApiResponse;
import com.wealthwise.wealthwise_backend.investment.dto.MfNavData;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

@Service
public class NavService {

    @Autowired
    private RestTemplate restTemplate;

    private static final String API_URL = "https://api.mfapi.in/mf/";

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
}