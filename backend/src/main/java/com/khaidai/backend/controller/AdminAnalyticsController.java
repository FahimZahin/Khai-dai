package com.khaidai.backend.controller;

import com.khaidai.backend.dto.AdminAnalyticsResponse;
import com.khaidai.backend.service.AdminAnalyticsService;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/analytics")
@CrossOrigin(
        originPatterns = {
                "http://localhost:*",
                "http://127.0.0.1:*",
                "http://192.168.*:*",
                "http://10.*:*",
                "http://172.*:*"
        }
)
public class AdminAnalyticsController {

    private final AdminAnalyticsService analyticsService;

    public AdminAnalyticsController(
            AdminAnalyticsService analyticsService
    ) {
        this.analyticsService = analyticsService;
    }

    @GetMapping
    public AdminAnalyticsResponse getAnalytics(

            @RequestHeader("X-Admin-Key")
            String adminKey,

            @RequestParam("from")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate fromDate,

            @RequestParam("to")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate toDate

    ) {

        return analyticsService.getAnalytics(
                adminKey,
                fromDate,
                toDate
        );
    }
}