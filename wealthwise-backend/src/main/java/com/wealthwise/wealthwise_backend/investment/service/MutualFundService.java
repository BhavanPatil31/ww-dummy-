package com.wealthwise.wealthwise_backend.investment.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class MutualFundService {

    @Autowired
    private RestTemplate restTemplate;

    private static final String MF_API_URL = "https://api.mfapi.in/mf";

    private List<Map<String, Object>> cachedFundList = new ArrayList<>();

    @PostConstruct
    public void init() {
        System.out.println("MutualFundService: Starting to fetch fund list from " + MF_API_URL);
        getFundList(); // Warm up cache on startup
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getFundList() {
        if (cachedFundList == null || cachedFundList.isEmpty()) {
            try {
                // Fetch the list of all funds from mfapi
                List<Map<String, Object>> response = (List<Map<String, Object>>) restTemplate.getForObject(MF_API_URL, List.class);
                if (response != null) {
                    cachedFundList = response;
                    System.out.println("MutualFundService: Successfully fetched " + cachedFundList.size() + " funds.");
                } else {
                    System.out.println("MutualFundService: API returned null.");
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

    @SuppressWarnings("unchecked")
    public Map<String, Object> getFundDetails(String schemeCode) {
        String url = MF_API_URL + "/" + schemeCode;
        try {
            System.out.println("MutualFundService: Fetching details for scheme: " + schemeCode);
            Map<String, Object> response = (Map<String, Object>) restTemplate.getForObject(url, Map.class);
            return response;
        } catch (Exception e) {
            System.err.println("MutualFundService: Error fetching details for " + schemeCode + ": " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }
}
