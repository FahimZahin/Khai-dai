package com.khaidai.backend.service;

import com.khaidai.backend.dto.AdminAnalyticsResponse;
import com.khaidai.backend.entity.*;
import com.khaidai.backend.repository.OrderRepository;
import com.khaidai.backend.repository.PaymentRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

import java.util.*;

@Service
public class AdminAnalyticsService {

    private static final ZoneId BUSINESS_ZONE =
            ZoneId.of("Asia/Dhaka");

    private static final BigDecimal ZERO =
            new BigDecimal("0.00");

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;

    @Value("${khaidai.admin.api-key:}")
    private String configuredAdminKey;

    public AdminAnalyticsService(
            OrderRepository orderRepository,
            PaymentRepository paymentRepository
    ) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
    }

    @Transactional(readOnly = true)
    public AdminAnalyticsResponse getAnalytics(
            String adminKey,
            LocalDate fromDate,
            LocalDate toDate
    ) {

        validateAdminKey(adminKey);

        if (fromDate == null || toDate == null) {
            throw badRequest("Both start and end dates are required.");
        }

        if (fromDate.isAfter(toDate)) {
            throw badRequest("Start date cannot be after end date.");
        }

        long days = ChronoUnit.DAYS.between(fromDate, toDate) + 1;

        if (days > 90) {
            throw badRequest("Analytics date range cannot exceed 90 days.");
        }

        Instant fromInstant =
                fromDate.atStartOfDay(BUSINESS_ZONE).toInstant();

        Instant toInstant =
                toDate.plusDays(1).atStartOfDay(BUSINESS_ZONE).toInstant();

        // Orders are counted by order creation date.
        List<RestaurantOrder> orders =
                orderRepository
                        .findAllByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(
                                fromInstant,
                                toInstant
                        );

        // Revenue is counted by verified payment date.
        List<Payment> payments =
                paymentRepository
                        .findAllByStatusAndPaidAtGreaterThanEqualAndPaidAtLessThanOrderByPaidAtAsc(
                                PaymentStatus.PAID,
                                fromInstant,
                                toInstant
                        );

        BigDecimal cashRevenue = BigDecimal.ZERO;
        BigDecimal onlineRevenue = BigDecimal.ZERO;

        long cashPayments = 0;
        long onlinePayments = 0;

        Set<Long> paidOrderIds = new HashSet<>();

        Map<LocalDate, BigDecimal> dailyTotals =
                new LinkedHashMap<>();

        for (
                LocalDate date = fromDate;
                !date.isAfter(toDate);
                date = date.plusDays(1)
        ) {
            dailyTotals.put(date, BigDecimal.ZERO);
        }

        Map<Integer, ItemAccumulator> itemTotals =
                new HashMap<>();

        for (Payment payment : payments) {

            if (!"BDT".equalsIgnoreCase(payment.getCurrency())) {
                continue;
            }

            BigDecimal amount = payment.getAmount() == null
                    ? BigDecimal.ZERO
                    : payment.getAmount();

            LocalDate paymentDate =
                    payment.getPaidAt()
                            .atZone(BUSINESS_ZONE)
                            .toLocalDate();

            dailyTotals.compute(
                    paymentDate,
                    (date, total) ->
                            (total == null ? BigDecimal.ZERO : total)
                                    .add(amount)
            );

            if (payment.getPaymentMethod() == PaymentMethod.CASH) {

                cashRevenue = cashRevenue.add(amount);
                cashPayments++;

            } else if (
                    payment.getPaymentMethod() == PaymentMethod.SSLCOMMERZ
            ) {

                onlineRevenue = onlineRevenue.add(amount);
                onlinePayments++;
            }

            // Count each paid order only once when calculating
            // sold food quantities, even if multiple payments exist.
            RestaurantOrder order = payment.getOrder();

            if (paidOrderIds.add(order.getId())) {

                for (OrderItem item : order.getItems()) {

                    ItemAccumulator accumulator =
                            itemTotals.computeIfAbsent(
                                    item.getFoodId(),
                                    id -> new ItemAccumulator(
                                            item.getFoodId(),
                                            item.getFoodName()
                                    )
                            );

                    accumulator.quantity += item.getQuantity();

                    accumulator.sales =
                            accumulator.sales.add(item.getLineTotal());
                }
            }
        }

        BigDecimal totalRevenue =
                cashRevenue.add(onlineRevenue);

        BigDecimal averageOrderValue = paidOrderIds.isEmpty()
                ? ZERO
                : totalRevenue.divide(
                        BigDecimal.valueOf(paidOrderIds.size()),
                        2,
                        RoundingMode.HALF_UP
                );

        // Order status counts by creation date.
        Map<OrderStatus, Long> statusTotals =
                new EnumMap<>(OrderStatus.class);

        for (OrderStatus status : OrderStatus.values()) {
            statusTotals.put(status, 0L);
        }

        for (RestaurantOrder order : orders) {
            statusTotals.merge(order.getStatus(), 1L, Long::sum);
        }

        List<AdminAnalyticsResponse.OrderStatusCount> statusCounts =
                new ArrayList<>();

        for (OrderStatus status : OrderStatus.values()) {

            statusCounts.add(
                    new AdminAnalyticsResponse.OrderStatusCount(
                            status.name(),
                            statusTotals.get(status)
                    )
            );
        }

        List<AdminAnalyticsResponse.DailyRevenue> dailyRevenue =
                dailyTotals.entrySet()
                        .stream()
                        .map(entry ->
                                new AdminAnalyticsResponse.DailyRevenue(
                                        entry.getKey(),
                                        money(entry.getValue())
                                )
                        )
                        .toList();

        List<ItemAccumulator> sortedItems =
                new ArrayList<>(itemTotals.values());

        sortedItems.sort((left, right) -> {

            int quantityComparison =
                    Long.compare(right.quantity, left.quantity);

            if (quantityComparison != 0) {
                return quantityComparison;
            }

            return left.foodName.compareToIgnoreCase(right.foodName);
        });

        List<AdminAnalyticsResponse.TopSellingItem> topSellingItems =
                sortedItems.stream()
                        .limit(5)
                        .map(item ->
                                new AdminAnalyticsResponse.TopSellingItem(
                                        item.foodId,
                                        item.foodName,
                                        item.quantity,
                                        money(item.sales)
                                )
                        )
                        .toList();

        return new AdminAnalyticsResponse(

                fromDate,
                toDate,

                money(totalRevenue),

                orders.size(),
                paidOrderIds.size(),

                money(averageOrderValue),

                money(cashRevenue),
                money(onlineRevenue),

                cashPayments,
                onlinePayments,

                dailyRevenue,
                topSellingItems,
                statusCounts
        );
    }

    private void validateAdminKey(String providedKey) {

        if (configuredAdminKey == null ||
                configuredAdminKey.isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Admin API key is not configured."
            );
        }

        if (providedKey == null ||
                !MessageDigest.isEqual(
                        configuredAdminKey.getBytes(StandardCharsets.UTF_8),
                        providedKey.getBytes(StandardCharsets.UTF_8)
                )) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid administrator key."
            );
        }
    }

    private BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private ResponseStatusException badRequest(String message) {

        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                message
        );
    }

    private static final class ItemAccumulator {

        private final Integer foodId;
        private final String foodName;

        private long quantity = 0;
        private BigDecimal sales = BigDecimal.ZERO;

        private ItemAccumulator(Integer foodId, String foodName) {
            this.foodId = foodId;
            this.foodName = foodName;
        }
    }
}