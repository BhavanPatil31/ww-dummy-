package com.wealthwise.wealthwise_backend.investment.service;

import com.wealthwise.wealthwise_backend.investment.dto.MfApiResponse;
import com.wealthwise.wealthwise_backend.investment.dto.MfNavData;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class NavService {

    @Autowired
    private RestTemplate restTemplate;

    private static final String API_URL = "https://api.mfapi.in/mf/";

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> searchFunds(String query) {
        String url = "https://api.mfapi.in/mf/search?q=" + query;
        try {
            return restTemplate.getForObject(url, List.class);
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
                MfNavData latest = response.getData().get(0);
                return Double.parseDouble(latest.getNav());
            }
        } catch (Exception e) {
            System.err.println("Error fetching NAV for fundId " + fundId + ": " + e.getMessage());
        }
        return null; // Return null to indicate failure, so caller can use fallback
    }
}
