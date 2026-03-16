package com.wealthwise.wealthwise_backend.investment.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class MfApiResponse {
    private Map<String, Object> meta;
    private List<MfNavData> data;
    private String status;
}
