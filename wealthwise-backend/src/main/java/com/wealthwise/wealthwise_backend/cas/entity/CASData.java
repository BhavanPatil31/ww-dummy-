package com.wealthwise.wealthwise_backend.cas.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "cas_data")
public class CASData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long casId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "financial_year", nullable = false)
    private String financialYear;

    @Column(name = "account_name", length = 2048)
    private String accountName;

    @Column(name = "account_id", length = 2048)
    private String accountId;

    @Column(name = "ltcg")
    private Double ltcg;

    @Column(name = "stcg")
    private Double stcg;

    @OneToMany(mappedBy = "casData", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CASTransaction> transactions;

    @Column(name = "uploaded_at", insertable = false, updatable = false)
    private LocalDateTime uploadedAt;

    public CASData() {}

    public Long getCasId() { return casId; }
    public void setCasId(Long casId) { this.casId = casId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getFinancialYear() { return financialYear; }
    public void setFinancialYear(String financialYear) { this.financialYear = financialYear; }

    public String getAccountName() { return accountName; }
    public void setAccountName(String accountName) { this.accountName = accountName; }

    public String getAccountId() { return accountId; }
    public void setAccountId(String accountId) { this.accountId = accountId; }

    public Double getLtcg() { return ltcg; }
    public void setLtcg(Double ltcg) { this.ltcg = ltcg; }

    public Double getStcg() { return stcg; }
    public void setStcg(Double stcg) { this.stcg = stcg; }

    public List<CASTransaction> getTransactions() { return transactions; }
    public void setTransactions(List<CASTransaction> transactions) { this.transactions = transactions; }

    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }
}
