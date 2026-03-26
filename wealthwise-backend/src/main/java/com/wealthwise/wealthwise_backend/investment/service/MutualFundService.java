package com.wealthwise.wealthwise_backend.investment.service;

import com.wealthwise.wealthwise_backend.investment.entity.MutualFund;
import com.wealthwise.wealthwise_backend.investment.repository.MutualFundRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Arrays;
import java.util.stream.Collectors;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.lang.NonNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class MutualFundService {
    private static final Logger logger = LoggerFactory.getLogger(MutualFundService.class);

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private MutualFundRepository mutualFundRepository;

    private static final String MF_API_URL = "https://api.mfapi.in/mf";
    private static final String MF_SEARCH_URL = "https://api.mfapi.in/mf/search?q=";

    @NonNull
    public List<Map<String, Object>> getFundList() {
        List<MutualFund> funds = mutualFundRepository.findAll();
        
        // Fallback to static list if database seeding failed or table is empty
        if (funds.isEmpty()) {
            return Objects.requireNonNull(Arrays.asList(
                createMap("125497", "HDFC Top 100 Fund - Direct Plan - Growth"),
                createMap("118834", "SBI Bluechip Fund - Direct Plan - Growth"),
                createMap("118825", "Mirae Asset Large Cap Fund - Direct Plan - Growth"),
                createMap("120465", "Axis Bluechip Fund - Direct Plan - Growth"),
                createMap("120716", "ICICI Prudential Bluechip Fund - Direct Plan - Growth"),
                createMap("122639", "Parag Parikh Flexi Cap Fund - Direct Plan - Growth"),
                createMap("120468", "UTI Flexi Cap Fund - Direct Plan - Growth"),
                createMap("120199", "Aditya Birla Sun Life Frontline Equity Fund - Direct Plan - Growth"),
                createMap("125354", "SBI Small Cap Fund - Direct Plan - Growth"),
                createMap("120847", "Quant Small Cap Fund - Direct Plan - Growth"),
                createMap("120822", "HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth"),
                createMap("130321", "Kotak Emerging Equity Fund - Direct Plan - Growth"),
                createMap("129457", "ICICI Prudential Flexi Cap Fund - Direct Plan - Growth"),
                createMap("130115", "Axis Flexi Cap Fund - Direct Plan - Growth"),
                createMap("128051", "HDFC Flexi Cap Fund - Direct Plan - Growth"),
                createMap("132010", "DSP Flexi Cap Fund - Direct Plan - Growth"),
                createMap("130323", "Kotak Equity Opportunities Fund - Direct Plan - Growth"),
                createMap("131201", "SBI Focused Equity Fund - Direct Plan - Growth"),
                createMap("130112", "Axis Focused 25 Fund - Direct Plan - Growth"),
                createMap("130114", "Axis Small Cap Fund - Direct Plan - Growth"),
                createMap("100148", "Franklin India Prima Fund - Growth"),
                createMap("100251", "Franklin India Bluechip Fund - Growth"),
                createMap("100305", "Franklin India Taxshield - Growth"),
                createMap("131203", "SBI Contra Fund - Direct Plan - Growth"),
                createMap("131202", "SBI Magnum Midcap Fund - Direct Plan - Growth"),
                createMap("131205", "SBI Long Term Equity Fund - Direct Plan - Growth"),
                createMap("132011", "DSP Small Cap Fund - Direct Plan - Growth"),
                createMap("132012", "DSP Equity Opportunities Fund - Direct Plan - Growth"),
                createMap("132013", "DSP Tax Saver Fund - Direct Plan - Growth"),
                createMap("129456", "ICICI Prudential Value Discovery Fund - Direct Plan - Growth"),
                createMap("128052", "HDFC Balanced Advantage Fund - Direct Plan - Growth"),
                createMap("128053", "HDFC Hybrid Equity Fund - Direct Plan - Growth"),
                createMap("128054", "HDFC Large and Mid Cap Fund - Direct Plan - Growth"),
                createMap("128055", "HDFC Small Cap Fund - Direct Plan - Growth"),
                createMap("127042", "DSP Midcap Fund - Direct Plan - Growth"),
                createMap("126503", "Axis Midcap Fund - Direct Plan - Growth"),
                createMap("130322", "Kotak Small Cap Fund - Direct Plan - Growth"),
                createMap("130324", "Kotak Bluechip Fund - Direct Plan - Growth"),
                createMap("119551", "Tata Digital India Fund - Direct Plan - Growth"),
                createMap("120318", "Kotak Flexicap Fund - Direct Plan - Growth")
            ));
        }

        return Objects.requireNonNull(funds.stream()
                .map(fund -> createMap(
                    Objects.requireNonNull(fund.getSchemeCode(), "Scheme code is null in DB"), 
                    Objects.requireNonNull(fund.getSchemeName(), "Scheme name is null in DB")))
                .collect(Collectors.toList()));
    }

    @NonNull
    private Map<String, Object> createMap(@NonNull String code, @NonNull String name) {
        Map<String, Object> map = new HashMap<>();
        map.put("scheme_code", code);
        map.put("scheme_name", name);
        return map;
    }

    @NonNull
    @Cacheable(value = "navCache", key = "#schemeCode")
    public Map<String, Object> getFundDetails(@NonNull String schemeCode) {
        Objects.requireNonNull(schemeCode, "Scheme code cannot be null");
        String url = MF_API_URL + "/" + schemeCode;
        try {
            logger.info("Fetching details for scheme: {}", schemeCode);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            return Objects.requireNonNull(response.getBody(), "Fund details body is null for scheme: " + schemeCode);
        } catch (org.springframework.web.client.RestClientException e) {
            logger.error("MF API unavailable for scheme {}: {}", schemeCode, e.getMessage());
            return Objects.requireNonNull(Collections.emptyMap());
        } catch (Exception e) {
            logger.error("Unexpected error fetching details for {}: {}", schemeCode, e.getMessage());
            return Objects.requireNonNull(Collections.emptyMap());
        }
    }

    public @NonNull List<Map<String, Object>> searchFunds(@NonNull String query) {
        if (query == null || query.trim().isEmpty()) return Objects.requireNonNull(Collections.emptyList());
        String url = MF_SEARCH_URL + query.trim();
        try {
            logger.info("Searching funds with query: {}", query);
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );
            List<Map<String, Object>> body = response.getBody();
            return Objects.requireNonNull(body != null ? body : Collections.emptyList());
        } catch (Exception e) {
            logger.error("Error searching funds for {}: {}", query, e.getMessage());
            return Objects.requireNonNull(Collections.emptyList());
        }
    }
}
