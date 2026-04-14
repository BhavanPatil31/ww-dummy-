package com.wealthwise.wealthwise_backend.investment.service;

import com.wealthwise.wealthwise_backend.investment.dto.MfApiResponse;
import com.wealthwise.wealthwise_backend.investment.dto.MfNavData;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class NavService {

    @Autowired
    private RestTemplate restTemplate;

    private static final String API_URL = "https://api.mfapi.in/mf/";
    private static final DateTimeFormatter MF_DATE_FORMAT = DateTimeFormatter.ofPattern("dd-MM-yyyy");
    private static final String ALL_FUNDS_URL = "https://api.mfapi.in/mf";

    // In-memory cache for fund data
    private final Map<String, MfApiResponse> fundCache = new ConcurrentHashMap<>();
    private volatile List<Map<String, Object>> allFundsCache = null;

    private static final class FallbackFund {
        private final String code;
        private final String name;
        private final double nav;

        private FallbackFund(String code, String name, double nav) {
            this.code = code;
            this.name = name;
            this.nav = nav;
        }
    }

    // Used only when external API is unavailable.
    private static final List<FallbackFund> FALLBACK_FUNDS = Arrays.asList(
            new FallbackFund("125497", "HDFC Top 100 Fund - Direct Plan - Growth", 19.84),
            new FallbackFund("118834", "SBI Bluechip Fund - Direct Plan - Growth", 76.15),
            new FallbackFund("118825", "Mirae Asset Large Cap Fund - Direct Plan - Growth", 112.42),
            new FallbackFund("120465", "Axis Bluechip Fund - Direct Plan - Growth", 64.31),
            new FallbackFund("120716", "ICICI Prudential Bluechip Fund - Direct Plan - Growth", 89.76),
            new FallbackFund("122639", "Parag Parikh Flexi Cap Fund - Direct Plan - Growth", 71.28),
            new FallbackFund("120468", "UTI Flexi Cap Fund - Direct Plan - Growth", 226.51),
            new FallbackFund("120199", "Aditya Birla Sun Life Frontline Equity Fund - Direct Plan - Growth", 412.37),
            new FallbackFund("125354", "SBI Small Cap Fund - Direct Plan - Growth", 158.94),
            new FallbackFund("120847", "Quant Small Cap Fund - Direct Plan - Growth", 248.63),
            new FallbackFund("120822", "HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth", 189.27),
            new FallbackFund("130321", "Kotak Emerging Equity Fund - Direct Plan - Growth", 102.88),
            new FallbackFund("129457", "ICICI Prudential Flexi Cap Fund - Direct Plan - Growth", 92.74),
            new FallbackFund("130115", "Axis Flexi Cap Fund - Direct Plan - Growth", 37.56),
            new FallbackFund("128051", "HDFC Flexi Cap Fund - Direct Plan - Growth", 96.21),
            new FallbackFund("132010", "DSP Flexi Cap Fund - Direct Plan - Growth", 45.73),
            new FallbackFund("130323", "Kotak Equity Opportunities Fund - Direct Plan - Growth", 121.34),
            new FallbackFund("131201", "SBI Focused Equity Fund - Direct Plan - Growth", 83.22),
            new FallbackFund("130112", "Axis Focused 25 Fund - Direct Plan - Growth", 58.14),
            new FallbackFund("130114", "Axis Small Cap Fund - Direct Plan - Growth", 87.69),
            new FallbackFund("100148", "Franklin India Prima Fund - Growth", 57.48),
            new FallbackFund("100251", "Franklin India Bluechip Fund - Growth", 104.92),
            new FallbackFund("100305", "Franklin India Taxshield - Growth", 92.31),
            new FallbackFund("131203", "SBI Contra Fund - Direct Plan - Growth", 68.55),
            new FallbackFund("131202", "SBI Magnum Midcap Fund - Direct Plan - Growth", 94.17),
            new FallbackFund("131205", "SBI Long Term Equity Fund - Direct Plan - Growth", 126.44),
            new FallbackFund("132011", "DSP Small Cap Fund - Direct Plan - Growth", 33.28),
            new FallbackFund("132012", "DSP Equity Opportunities Fund - Direct Plan - Growth", 61.77),
            new FallbackFund("132013", "DSP Tax Saver Fund - Direct Plan - Growth", 49.65),
            new FallbackFund("129456", "ICICI Prudential Value Discovery Fund - Direct Plan - Growth", 278.39),
            new FallbackFund("128052", "HDFC Balanced Advantage Fund - Direct Plan - Growth", 39.74),
            new FallbackFund("128053", "HDFC Hybrid Equity Fund - Direct Plan - Growth", 111.52),
            new FallbackFund("128054", "HDFC Large and Mid Cap Fund - Direct Plan - Growth", 84.37),
            new FallbackFund("128055", "HDFC Small Cap Fund - Direct Plan - Growth", 77.93),
            new FallbackFund("127042", "DSP Midcap Fund - Direct Plan - Growth", 214.88),
            new FallbackFund("126503", "Axis Midcap Fund - Direct Plan - Growth", 104.63),
            new FallbackFund("130322", "Kotak Small Cap Fund - Direct Plan - Growth", 144.21),
            new FallbackFund("130324", "Kotak Bluechip Fund - Direct Plan - Growth", 72.19),
            new FallbackFund("119551", "Tata Digital India Fund - Direct Plan - Growth", 31.42),
            new FallbackFund("120318", "Kotak Flexicap Fund - Direct Plan - Growth", 73.58)
    );

    private static final Map<String, FallbackFund> FALLBACK_BY_CODE = FALLBACK_FUNDS
            .stream()
            .collect(Collectors.toMap(f -> f.code, f -> f));

    public List<Map<String, Object>> searchFunds(String query) {
        String normalized = query == null ? "" : query.trim();
        if (normalized.isEmpty()) return getAllFunds();
        String url = "https://api.mfapi.in/mf/search?q=" + normalized;

        try {
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );
            List<Map<String, Object>> body = response.getBody();
            return body != null ? body : Collections.emptyList();
        } catch (Exception e) {
            System.err.println("NavService: search API unavailable, using fallback schemes. Reason: " + e.getMessage());
            return getFallbackSearchResults(normalized);
        }
    }

    public List<Map<String, Object>> getAllFunds() {
        if (allFundsCache != null && !allFundsCache.isEmpty()) {
            return allFundsCache;
        }

        try {
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    ALL_FUNDS_URL,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );
            List<Map<String, Object>> body = response.getBody();
            if (body != null && !body.isEmpty()) {
                List<Map<String, Object>> normalized = body.stream()
                        .map(this::normalizeFundRow)
                        .collect(Collectors.toList());
                allFundsCache = normalized;
                return normalized;
            }
        } catch (Exception e) {
            System.err.println("NavService: all-funds API unavailable, using fallback schemes. Reason: " + e.getMessage());
        }
        return getFallbackSearchResults("");
    }

    public Double getLatestNav(String fundId) {
        if (fundId == null || fundId.trim().isEmpty()) return 0.0;

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

        FallbackFund fallbackFund = FALLBACK_BY_CODE.get(fundId);
        if (fallbackFund != null) {
            return fallbackFund.nav;
        }
        return 0.0;
    }

    public MfApiResponse getFundHistory(String fundId) {
        if (fundId == null || fundId.trim().isEmpty()) return null;
        MfApiResponse response = getFundData(fundId);
        if (response != null && response.getData() != null && !response.getData().isEmpty()) {
            return response;
        }

        FallbackFund fallbackFund = FALLBACK_BY_CODE.get(fundId);
        if (fallbackFund == null) {
            return null;
        }

        MfNavData nav = new MfNavData();
        nav.setDate(LocalDate.now().format(MF_DATE_FORMAT));
        nav.setNav(String.valueOf(fallbackFund.nav));

        MfApiResponse fallback = new MfApiResponse();
        fallback.setStatus("SUCCESS");
        fallback.setData(Collections.singletonList(nav));
        return fallback;
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
            System.err.println("NavService: External API error for fund " + fundId + ": " + e.getMessage());
        }
        return null;
    }

    public Double getNavForDate(String fundId, String selectedDate) {
        if (fundId == null || fundId.isEmpty()) {
            return 0.0;
        }

        if (selectedDate == null || selectedDate.trim().isEmpty()) {
            return getLatestNav(fundId);
        }

        LocalDate targetDate;
        try {
            targetDate = LocalDate.parse(selectedDate);
        } catch (Exception e) {
            System.err.println("Invalid selected date format: " + selectedDate + ". Falling back to latest NAV.");
            return getLatestNav(fundId);
        }

        try {
            MfApiResponse response = getFundData(fundId);
            if (response == null || response.getData() == null || response.getData().isEmpty()) {
                return getLatestNav(fundId);
            }

            LocalDate nearestDate = null;
            Double nearestNav = null;

            for (MfNavData navData : response.getData()) {
                String dateStr = navData.getDate();
                String navStr = navData.getNav();
                if (dateStr == null || navStr == null) continue;

                try {
                    LocalDate navDate = LocalDate.parse(dateStr, MF_DATE_FORMAT);
                    Double navValue = Double.parseDouble(navStr);
                    if (!navDate.isAfter(targetDate)) {
                        if (nearestDate == null || navDate.isAfter(nearestDate)) {
                            nearestDate = navDate;
                            nearestNav = navValue;
                        }
                    }
                } catch (Exception ignored) {
                }
            }

            if (nearestNav != null) {
                return nearestNav;
            }

            MfNavData oldest = response.getData().get(response.getData().size() - 1);
            if (oldest != null && oldest.getNav() != null) {
                return Double.parseDouble(oldest.getNav());
            }
        } catch (Exception e) {
            System.err.println("Error fetching date-based NAV for fundId " + fundId + ": " + e.getMessage());
        }

        return getLatestNav(fundId);
    }

    private List<Map<String, Object>> getFallbackSearchResults(String query) {
        String q = query == null ? "" : query.toLowerCase(Locale.ROOT);
        List<Map<String, Object>> result = new ArrayList<>();

        for (FallbackFund fund : FALLBACK_FUNDS) {
            if (!q.isEmpty()) {
                String name = fund.name.toLowerCase(Locale.ROOT);
                if (!name.contains(q) && !fund.code.contains(q)) {
                    continue;
                }
            }
            Map<String, Object> row = new HashMap<>();
            row.put("schemeCode", fund.code);
            row.put("schemeName", fund.name);
            row.put("code", fund.code);
            row.put("name", fund.name);
            result.add(row);
        }

        return result;
    }

    private Map<String, Object> normalizeFundRow(Map<String, Object> row) {
        Map<String, Object> normalized = new HashMap<>(row);
        Object schemeCode = normalized.get("schemeCode");
        Object schemeName = normalized.get("schemeName");
        if (schemeCode != null) {
            normalized.put("code", String.valueOf(schemeCode));
        }
        if (schemeName != null) {
            normalized.put("name", String.valueOf(schemeName));
        }
        return normalized;
    }
}
