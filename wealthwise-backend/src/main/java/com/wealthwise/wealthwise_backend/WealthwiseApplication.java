package com.wealthwise.wealthwise_backend;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableCaching
@EnableJpaRepositories(basePackages = "com.wealthwise.wealthwise_backend")
public class WealthwiseApplication {

    public static void main(String[] args) {
        SpringApplication.run(WealthwiseApplication.class, args);
    }
}
