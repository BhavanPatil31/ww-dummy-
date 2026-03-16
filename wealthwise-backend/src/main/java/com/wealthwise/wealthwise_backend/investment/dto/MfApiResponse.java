package com.wealthwise.wealthwise_backend.investment.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class MfApiResponse {
    private Map<String, Object> meta;
    private List<MfNavData> data;
    private String status;

    public MfApiResponse() {}

    public Map<String, Object> getMeta() {
        return meta;
    }

    public void setMeta(Map<String, Object> meta) {
        this.meta = meta;
    }

    public List<MfNavData> getData() {
        return data;
    }

    public void setData(List<MfNavData> data) {
        this.data = data;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
