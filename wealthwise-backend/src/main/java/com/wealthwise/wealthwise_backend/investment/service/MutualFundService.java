package com.wealthwise.wealthwise_backend.investment.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class MutualFundService {

    @Autowired
    private RestTemplate restTemplate;

    private static final String MF_API_URL = "https://api.mfapi.in/mf";

    private List<Map<String, Object>> cachedFundList = new ArrayList<>();

    // Removed @PostConstruct to implement lazy loading and avoid startup failures
    // getFundList() will be called on-demand

    public List<Map<String, Object>> getFundList() {
        if (cachedFundList.isEmpty()) {
            try {
                // Fetch the list of all funds from mfapi
                ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                        MF_API_URL,
                        HttpMethod.GET,
                        null,
                        new ParameterizedTypeReference<List<Map<String, Object>>>() {}
                );
                
                List<Map<String, Object>> body = response.getBody();
                if (body != null) {
                    cachedFundList = body;
                    System.out.println("MutualFundService: Successfully fetched " + cachedFundList.size() + " funds.");
                } else {
                    System.out.println("MutualFundService: API returned empty body.");
                }
            } catch (org.springframework.web.client.RestClientException e) {
                System.err.println("MutualFundService: MF API unavailable, using fallback");
            } catch (Exception e) {
                System.err.println("MutualFundService: Unexpected error fetching funds, using fallback");
            }
        }
        return cachedFundList;
    }

    public Map<String, Object> getFundDetails(String schemeCode) {
        Objects.requireNonNull(schemeCode, "Scheme code cannot be null");
        String url = MF_API_URL + "/" + schemeCode;
        try {
            System.out.println("MutualFundService: Fetching details for scheme: " + schemeCode);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            return Objects.requireNonNull(response.getBody(), "Fund details body cannot be null for scheme: " + schemeCode);
        } catch (org.springframework.web.client.RestClientException e) {
            System.err.println("MutualFundService: MF API unavailable for scheme " + schemeCode + ", using fallback");
            return java.util.Collections.emptyMap();
        } catch (Exception e) {
            System.err.println("MutualFundService: Unexpected error fetching details for " + schemeCode + ", using fallback");
            return java.util.Collections.emptyMap();
        }
    }
}
