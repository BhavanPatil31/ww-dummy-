package com.wealthwise.wealthwise_backend.investment.service;

import com.wealthwise.wealthwise_backend.investment.entity.MutualFund;
import com.wealthwise.wealthwise_backend.investment.repository.MutualFundRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class MutualFundService {

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private MutualFundRepository mutualFundRepository;

    private static final String MF_API_URL = "https://api.mfapi.in/mf";

    public List<Map<String, Object>> getFundList() {
        List<MutualFund> funds = mutualFundRepository.findAll();
        
        // Fallback to static list if database seeding failed or table is empty
        if (funds.isEmpty()) {
            return java.util.Arrays.asList(
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
            );
        }

        return funds.stream().map(fund -> createMap(fund.getSchemeCode(), fund.getSchemeName())).collect(Collectors.toList());
    }

    private Map<String, Object> createMap(String code, String name) {
        Map<String, Object> map = new HashMap<>();
        map.put("scheme_code", code);
        map.put("scheme_name", name);
        return map;
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
