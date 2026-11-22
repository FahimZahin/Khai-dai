
package com.khaidai.backend.service;

import com.khaidai.backend.dto.AdminOrderResponse;
import com.khaidai.backend.entity.OrderStatus;
import com.khaidai.backend.entity.RestaurantOrder;
import com.khaidai.backend.repository.OrderRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.Locale;

@Service
public class OrderAdminService {

    private final OrderRepository orderRepository;

    @Value("${khaidai.admin.api-key:}")
    private String configuredAdminKey;

    public OrderAdminService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    // ==========================================
    // GET ALL RESTAURANT ORDERS
    // ==========================================

    @Transactional(readOnly = true)
    public List<AdminOrderResponse> getAllOrders(String adminKey) {

        validateAdminKey(adminKey);

        return orderRepository
                .findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ==========================================
    // UPDATE ORDER STATUS
    // ==========================================

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

        RestaurantOrder order = orderRepository
                .findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Order not found."
                ));

        OrderStatus currentStatus = order.getStatus();

        if (!isValidTransition(currentStatus, newStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot change order status from "
                            + currentStatus + " to " + newStatus + "."
            );
        }

        order.setStatus(newStatus);

        RestaurantOrder savedOrder = orderRepository.save(order);

        return toResponse(savedOrder);
    }

    // ==========================================
    // ALLOWED STATUS TRANSITIONS
    // ==========================================

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

    // ==========================================
    // ADMIN AUTHENTICATION
    // ==========================================

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
                        configuredAdminKey.getBytes(
                                StandardCharsets.UTF_8
                        ),
                        providedAdminKey.getBytes(
                                StandardCharsets.UTF_8
                        )
                )) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid admin API key."
            );
        }
    }

    // ==========================================
    // CONVERT ENTITY TO ADMIN RESPONSE
    // ==========================================

    private AdminOrderResponse toResponse(RestaurantOrder order) {

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
