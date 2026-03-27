package com.wealthwise.wealthwise_backend.investment.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.io.Serializable;

@JsonIgnoreProperties(ignoreUnknown = true)
public class Fund implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long schemeCode;
    private String schemeName;
    private String nav;
    private String date;

    public Fund() {}

    public Fund(Long schemeCode, String schemeName, String nav, String date) {
        this.schemeCode = schemeCode;
        this.schemeName = schemeName;
        this.nav = nav;
        this.date = date;
    }

    public Long getSchemeCode() {
        return schemeCode;
    }

    public void setSchemeCode(Long schemeCode) {
        this.schemeCode = schemeCode;
    }

    public String getSchemeName() {
        return schemeName;
    }

    public void setSchemeName(String schemeName) {
        this.schemeName = schemeName;
    }

    public String getNav() {
        return nav;
    }

    public void setNav(String nav) {
        this.nav = nav;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }
}
