package com.wealthwise.wealthwise_backend.investment.entity;

import javax.persistence.*;

@Entity
@Table(name = "mutual_funds")
public class MutualFund {

    @Id
    @Column(name = "scheme_code", nullable = false, unique = true)
    private String schemeCode;

    @Column(name = "scheme_name", nullable = false)
    private String schemeName;

    @Column(name = "status", nullable = false)
    private Integer status;

    public MutualFund() {
    }

    public MutualFund(String schemeCode, String schemeName, Integer status) {
        this.schemeCode = schemeCode;
        this.schemeName = schemeName;
        this.status = status;
    }

    public String getSchemeCode() {
        return schemeCode;
    }

    public void setSchemeCode(String schemeCode) {
        this.schemeCode = schemeCode;
    }

    public String getSchemeName() {
        return schemeName;
    }

    public void setSchemeName(String schemeName) {
        this.schemeName = schemeName;
    }

    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }
}
