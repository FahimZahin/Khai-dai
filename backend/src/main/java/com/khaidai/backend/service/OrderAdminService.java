package com.khaidai.backend.service;

import com.khaidai.backend.dto.AdminOrderResponse;
import com.khaidai.backend.entity.OrderStatus;
import com.khaidai.backend.entity.Payment;
import com.khaidai.backend.entity.PaymentMethod;
import com.khaidai.backend.entity.PaymentStatus;
import com.khaidai.backend.entity.RestaurantOrder;
import com.khaidai.backend.repository.OrderRepository;
import com.khaidai.backend.repository.PaymentRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class OrderAdminService {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;

    @Value("${khaidai.admin.api-key:}")
    private String configuredAdminKey;

    public OrderAdminService(
            OrderRepository orderRepository,
            PaymentRepository paymentRepository
    ) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
    }

    @Transactional(readOnly = true)
    public List<AdminOrderResponse> getAllOrders(String adminKey) {

        validateAdminKey(adminKey);

        return orderRepository
                .findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public AdminOrderResponse updateOrderStatus(
            String orderNumber,
            String requestedStatus,
            String adminKey
    ) {

        validateAdminKey(adminKey);

        if (requestedStatus == null || requestedStatus.isBlank()) {
            throw badRequest("Order status is required.");
        }

        OrderStatus newStatus;

        try {
            newStatus = OrderStatus.valueOf(
                    requestedStatus.trim().toUpperCase(Locale.ROOT)
            );
        } catch (IllegalArgumentException exception) {
            throw badRequest("Invalid order status.");
        }

        RestaurantOrder order = findOrder(orderNumber);

        if (!isValidTransition(order.getStatus(), newStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot change order status from "
                            + order.getStatus() + " to " + newStatus + "."
            );
        }

        order.setStatus(newStatus);

        RestaurantOrder savedOrder = orderRepository.save(order);

        return toResponse(savedOrder);
    }

    // ==========================================
    // MARK CASH PAYMENT AS PAID
    // ==========================================

    @Transactional
    public AdminOrderResponse markCashPaymentAsPaid(
            String orderNumber,
            String adminKey
    ) {

        validateAdminKey(adminKey);

        RestaurantOrder order = findOrder(orderNumber);

        if (order.getStatus() == OrderStatus.AWAITING_PAYMENT) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This order is awaiting online payment."
            );
        }

        List<Payment> existingPayments =
                paymentRepository.findAllByOrder_IdOrderByCreatedAtDesc(
                        order.getId()
                );

        Payment latest = existingPayments.isEmpty()
                ? null
                : existingPayments.get(0);

        if (latest != null &&
                latest.getStatus() == PaymentStatus.PAID) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This order is already marked as paid."
            );
        }

        if (latest != null &&
                latest.getPaymentMethod() == PaymentMethod.SSLCOMMERZ &&
                latest.getStatus() == PaymentStatus.PENDING) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "An online payment is still pending."
            );
        }

        Payment cashPayment = new Payment();

        cashPayment.setOrder(order);

        cashPayment.setTransactionId(
                "CASH-" + UUID.randomUUID()
                        .toString()
                        .replace("-", "")
                        .substring(0, 24)
                        .toUpperCase(Locale.ROOT)
        );

        cashPayment.setPaymentMethod(PaymentMethod.CASH);
        cashPayment.setStatus(PaymentStatus.PAID);
        cashPayment.setAmount(order.getTotalAmount());
        cashPayment.setCurrency("BDT");

        paymentRepository.saveAndFlush(cashPayment);

        return toResponse(order);
    }

    private RestaurantOrder findOrder(String orderNumber) {

        return orderRepository
                .findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Order not found."
                ));
    }

    private boolean isValidTransition(
            OrderStatus current,
            OrderStatus next
    ) {

        return switch (current) {

            case PENDING ->
                    next == OrderStatus.ACCEPTED ||
                    next == OrderStatus.REJECTED;

            case ACCEPTED ->
                    next == OrderStatus.PREPARING;

            case PREPARING ->
                    next == OrderStatus.READY;

            case READY ->
                    next == OrderStatus.SERVED;

            default -> false;
        };
    }

    private void validateAdminKey(String providedAdminKey) {

        if (configuredAdminKey == null ||
                configuredAdminKey.isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Admin API key is not configured."
            );
        }

        if (providedAdminKey == null ||
                !MessageDigest.isEqual(
                        configuredAdminKey.getBytes(StandardCharsets.UTF_8),
                        providedAdminKey.getBytes(StandardCharsets.UTF_8)
                )) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid admin API key."
            );
        }
    }

    // ==========================================
    // MAP ORDER AND LATEST PAYMENT
    // ==========================================

    private AdminOrderResponse toResponse(RestaurantOrder order) {

        List<Payment> payments =
                paymentRepository.findAllByOrder_IdOrderByCreatedAtDesc(
                        order.getId()
                );

        Payment latest = payments.isEmpty()
                ? null
                : payments.get(0);

        String paymentMethod = latest != null
                ? latest.getPaymentMethod().name()
                : order.getStatus() == OrderStatus.AWAITING_PAYMENT
                    ? "SSLCOMMERZ"
                    : "CASH";

        String paymentStatus = latest != null
                ? latest.getStatus().name()
                : "CASH".equals(paymentMethod)
                    ? "CASH_DUE"
                    : "PENDING";

        List<AdminOrderResponse.ItemResponse> items =
                order.getItems()
                        .stream()
                        .map(item ->
                                new AdminOrderResponse.ItemResponse(
                                        item.getFoodId(),
                                        item.getFoodName(),
                                        item.getQuantity(),
                                        item.getUnitPrice(),
                                        item.getLineTotal(),
                                        item.getSpiceLevel(),
                                        item.getPreparationTimeMinutes(),
                                        item.getSelectedAddons()
                                                .stream()
                                                .map(addon ->
                                                        new AdminOrderResponse.AddonResponse(
                                                                addon.getName(),
                                                                addon.getPrice()
                                                        )
                                                )
                                                .toList()
                                )
                        )
                        .toList();

        return new AdminOrderResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getRestaurantTable().getTableNumber(),
                order.getStatus(),
                order.getTotalAmount(),
                order.getTotalPreparationWorkMinutes(),
                order.getCustomerNote(),
                order.getCreatedAt(),
                order.getUpdatedAt(),

                paymentMethod,
                paymentStatus,
                latest != null ? latest.getTransactionId() : null,
                latest != null ? latest.getAmount() : null,
                latest != null ? latest.getCurrency() : "BDT",
                latest != null ? latest.getPaidAt() : null,

                items
        );
    }

    private ResponseStatusException badRequest(String message) {

        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                message
        );
    }
}