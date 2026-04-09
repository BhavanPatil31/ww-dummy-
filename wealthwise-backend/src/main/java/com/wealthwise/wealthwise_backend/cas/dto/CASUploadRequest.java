package com.wealthwise.wealthwise_backend.cas.dto;

import java.util.List;

public class CASUploadRequest {
    private Long user_id;
    private String financial_year;
    private String account_name;
    private String account_id;
    private Double ltcg;
    private Double stcg;
    private List<CASTransactionDTO> transactions;

    public CASUploadRequest() {}

    public Long getUser_id() { return user_id; }
    public void setUser_id(Long user_id) { this.user_id = user_id; }

    public String getFinancial_year() { return financial_year; }
    public void setFinancial_year(String financial_year) { this.financial_year = financial_year; }

    public String getAccount_name() { return account_name; }
    public void setAccount_name(String account_name) { this.account_name = account_name; }

    public String getAccount_id() { return account_id; }
    public void setAccount_id(String account_id) { this.account_id = account_id; }

    public Double getLtcg() { return ltcg; }
    public void setLtcg(Double ltcg) { this.ltcg = ltcg; }

    public Double getStcg() { return stcg; }
    public void setStcg(Double stcg) { this.stcg = stcg; }

    public List<CASTransactionDTO> getTransactions() { return transactions; }
    public void setTransactions(List<CASTransactionDTO> transactions) { this.transactions = transactions; }
}
