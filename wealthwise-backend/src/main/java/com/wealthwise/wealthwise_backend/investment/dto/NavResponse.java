package com.wealthwise.wealthwise_backend.investment.dto;

/**
 * Response payload for the /api/nav endpoint.
 * Never contains simulated/mock data.
 */
public class NavResponse {

    /** The scheme code as registered with AMFI */
    private String schemeCode;

    /** Full scheme name from AMFI */
    private String schemeName;

    /** Latest NAV value – always real, never simulated */
    private Double nav;

    /** Date string of the NAV in dd-MMM-yyyy format as published by AMFI */
    private String lastUpdated;

    /** Always "AMFI India" */
    private String source;

    /** ISO timestamp of when this entry was last refreshed into our cache */
    private String cachedAt;

    public NavResponse() {}

    public NavResponse(String schemeCode, String schemeName, Double nav, String lastUpdated, String source, String cachedAt) {
        this.schemeCode = schemeCode;
        this.schemeName = schemeName;
        this.nav = nav;
        this.lastUpdated = lastUpdated;
        this.source = source;
        this.cachedAt = cachedAt;
    }

    public String getSchemeCode() { return schemeCode; }
    public void setSchemeCode(String schemeCode) { this.schemeCode = schemeCode; }

    public String getSchemeName() { return schemeName; }
    public void setSchemeName(String schemeName) { this.schemeName = schemeName; }

    public Double getNav() { return nav; }
    public void setNav(Double nav) { this.nav = nav; }

    public String getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(String lastUpdated) { this.lastUpdated = lastUpdated; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getCachedAt() { return cachedAt; }
    public void setCachedAt(String cachedAt) { this.cachedAt = cachedAt; }
}
