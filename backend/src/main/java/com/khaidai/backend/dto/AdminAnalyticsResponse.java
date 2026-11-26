package com.khaidai.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record AdminAnalyticsResponse(

        LocalDate fromDate,
        LocalDate toDate,

        BigDecimal totalRevenue,

        long totalOrders,
        long paidOrders,

        BigDecimal averageOrderValue,

        BigDecimal cashRevenue,
        BigDecimal onlineRevenue,

        long cashPayments,
        long onlinePayments,

        List<DailyRevenue> dailyRevenue,
        List<TopSellingItem> topSellingItems,
        List<OrderStatusCount> orderStatusCounts

) {

    public record DailyRevenue(
            LocalDate date,
            BigDecimal revenue
    ) {
    }

    public record TopSellingItem(
            Integer foodId,
            String foodName,
            long quantitySold,
            BigDecimal sales
    ) {
    }

    public record OrderStatusCount(
            String status,
            long count
    ) {
    }
}