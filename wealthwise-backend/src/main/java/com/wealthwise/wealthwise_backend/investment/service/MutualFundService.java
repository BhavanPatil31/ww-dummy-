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

import javax.annotation.PostConstruct;

import org.springframework.cache.annotation.Cacheable;

@Service
public class MutualFundService {

    @Autowired
    private RestTemplate restTemplate;

    private static final String MF_API_URL = "https://api.mfapi.in/mf";
    private static final String MF_SEARCH_URL = "https://api.mfapi.in/mf/search?q=";

    private List<Map<String, Object>> cachedFundList = new ArrayList<>();

    @PostConstruct
    public void init() {
        System.out.println("MutualFundService: Starting to fetch fund list from " + MF_API_URL);
        getFundList(); // Warm up cache on startup
    }

    public List<Map<String, Object>> getFundList() {
        if (cachedFundList == null || cachedFundList.isEmpty()) {
            try {
                // Fetch the list of all funds from mfapi
                ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                        MF_API_URL,
                        HttpMethod.GET,
                        null,
                        new ParameterizedTypeReference<List<Map<String, Object>>>() {}
                );
                
                if (response.getBody() != null) {
                    cachedFundList = response.getBody();
                    System.out.println("MutualFundService: Successfully fetched " + cachedFundList.size() + " funds.");
                } else {
                    System.out.println("MutualFundService: API returned empty body.");
                    cachedFundList = new ArrayList<>();
                }
            } catch (Exception e) {
                System.err.println("MutualFundService: Error fetching funds: " + e.getMessage());
                e.printStackTrace();
                cachedFundList = new ArrayList<>();
            }
        }
        return cachedFundList;
    }

    @Cacheable(value = "navCache", key = "#schemeCode")
    public Map<String, Object> getFundDetails(String schemeCode) {
        String url = MF_API_URL + "/" + schemeCode;
        try {
            System.out.println("MutualFundService: Fetching details for scheme: " + schemeCode);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            return response.getBody();
        } catch (Exception e) {
            System.err.println("MutualFundService: Error fetching details for " + schemeCode + ": " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    public List<Map<String, Object>> searchFunds(String query) {
        String url = MF_SEARCH_URL + query;
        try {
            System.out.println("MutualFundService: Searching funds with query: " + query);
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );
            return response.getBody();
        } catch (Exception e) {
            System.err.println("MutualFundService: Error searching funds for " + query + ": " + e.getMessage());
            return new ArrayList<>();
        }
    }
}
