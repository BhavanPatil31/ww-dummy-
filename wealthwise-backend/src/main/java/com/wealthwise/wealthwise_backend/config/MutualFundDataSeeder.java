package com.wealthwise.wealthwise_backend.config;

import com.wealthwise.wealthwise_backend.investment.entity.MutualFund;
import com.wealthwise.wealthwise_backend.investment.repository.MutualFundRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;

@Component
public class MutualFundDataSeeder implements CommandLineRunner {

    @Autowired
    private MutualFundRepository mutualFundRepository;

    @Override
    public void run(String... args) throws Exception {
        try {
            if (mutualFundRepository.count() == 0) {
                System.out.println("Seeding explicit Mutual Funds into database...");
                List<MutualFund> predefinedFunds = Arrays.asList(
                    new MutualFund("125497", "HDFC Top 100 Fund - Direct Plan - Growth", 1),
                    new MutualFund("118834", "SBI Bluechip Fund - Direct Plan - Growth", 1),
                    new MutualFund("118825", "Mirae Asset Large Cap Fund - Direct Plan - Growth", 1),
                    new MutualFund("120465", "Axis Bluechip Fund - Direct Plan - Growth", 1),
                    new MutualFund("120716", "ICICI Prudential Bluechip Fund - Direct Plan - Growth", 1),
                    new MutualFund("122639", "Parag Parikh Flexi Cap Fund - Direct Plan - Growth", 1),
                    new MutualFund("120468", "UTI Flexi Cap Fund - Direct Plan - Growth", 1),
                    new MutualFund("120199", "Aditya Birla Sun Life Frontline Equity Fund - Direct Plan - Growth", 1),
                    new MutualFund("125354", "SBI Small Cap Fund - Direct Plan - Growth", 1),
                    new MutualFund("120847", "Quant Small Cap Fund - Direct Plan - Growth", 1),
                    new MutualFund("120822", "HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth", 1),
                    new MutualFund("130321", "Kotak Emerging Equity Fund - Direct Plan - Growth", 1),
                    new MutualFund("129457", "ICICI Prudential Flexi Cap Fund - Direct Plan - Growth", 1),
                    new MutualFund("130115", "Axis Flexi Cap Fund - Direct Plan - Growth", 1),
                    new MutualFund("128051", "HDFC Flexi Cap Fund - Direct Plan - Growth", 1),
                    new MutualFund("132010", "DSP Flexi Cap Fund - Direct Plan - Growth", 1),
                    new MutualFund("130323", "Kotak Equity Opportunities Fund - Direct Plan - Growth", 1),
                    new MutualFund("131201", "SBI Focused Equity Fund - Direct Plan - Growth", 1),
                    new MutualFund("130112", "Axis Focused 25 Fund - Direct Plan - Growth", 1),
                    new MutualFund("130114", "Axis Small Cap Fund - Direct Plan - Growth", 1),
                    new MutualFund("100148", "Franklin India Prima Fund - Growth", 1),
                    new MutualFund("100251", "Franklin India Bluechip Fund - Growth", 1),
                    new MutualFund("100305", "Franklin India Taxshield - Growth", 1),
                    new MutualFund("131203", "SBI Contra Fund - Direct Plan - Growth", 1),
                    new MutualFund("131202", "SBI Magnum Midcap Fund - Direct Plan - Growth", 1),
                    new MutualFund("131205", "SBI Long Term Equity Fund - Direct Plan - Growth", 1),
                    new MutualFund("132011", "DSP Small Cap Fund - Direct Plan - Growth", 1),
                    new MutualFund("132012", "DSP Equity Opportunities Fund - Direct Plan - Growth", 1),
                    new MutualFund("132013", "DSP Tax Saver Fund - Direct Plan - Growth", 1),
                    new MutualFund("129456", "ICICI Prudential Value Discovery Fund - Direct Plan - Growth", 1),
                    new MutualFund("128052", "HDFC Balanced Advantage Fund - Direct Plan - Growth", 1),
                    new MutualFund("128053", "HDFC Hybrid Equity Fund - Direct Plan - Growth", 1),
                    new MutualFund("128054", "HDFC Large and Mid Cap Fund - Direct Plan - Growth", 1),
                    new MutualFund("128055", "HDFC Small Cap Fund - Direct Plan - Growth", 1),
                    new MutualFund("127042", "DSP Midcap Fund - Direct Plan - Growth", 1),
                    new MutualFund("126503", "Axis Midcap Fund - Direct Plan - Growth", 1),
                    new MutualFund("130322", "Kotak Small Cap Fund - Direct Plan - Growth", 1),
                    new MutualFund("130324", "Kotak Bluechip Fund - Direct Plan - Growth", 1),
                    new MutualFund("119551", "Tata Digital India Fund - Direct Plan - Growth", 1),
                    new MutualFund("120318", "Kotak Flexicap Fund - Direct Plan - Growth", 1)
                );
                mutualFundRepository.saveAll(Objects.requireNonNull(predefinedFunds));
                System.out.println("Inserted 40 explicit funds successfully.");
            }
        } catch (Exception e) {
            System.err.println("MutualFundDataSeeder: Table might not be ready yet: " + e.getMessage());
        }
    }

}
