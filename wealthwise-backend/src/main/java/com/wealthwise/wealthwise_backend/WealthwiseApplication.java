package com.wealthwise.wealthwise_backend;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class WealthwiseApplication {

    public static void main(String[] args) {
        SpringApplication.run(WealthwiseApplication.class, args);
    }
}
