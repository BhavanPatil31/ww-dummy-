package com.wealthwise.wealthwise_backend.investment.dto;

import lombok.Data;

@Data
public class MfNavData {
    private String date;
    private String nav;

    public MfNavData() {}

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getNav() {
        return nav;
    }

    public void setNav(String nav) {
        this.nav = nav;
    }
}
