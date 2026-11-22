
package com.khaidai.backend.service;

import com.khaidai.backend.dto.CreateOrderRequest;
import com.khaidai.backend.dto.OrderResponse;

import com.khaidai.backend.entity.OrderItem;
import com.khaidai.backend.entity.OrderItemAddon;
import com.khaidai.backend.entity.OrderStatus;
import com.khaidai.backend.entity.RestaurantOrder;
import com.khaidai.backend.entity.RestaurantTable;

import com.khaidai.backend.repository.OrderRepository;
import com.khaidai.backend.repository.TableRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final TableRepository tableRepository;

    private static final Set<String> ALLOWED_SPICE_LEVELS = Set.of(
            "Not Spicy",
            "Mild",
            "Medium",
            "Hot"
    );

    public OrderService(
            OrderRepository orderRepository,
            TableRepository tableRepository
    ) {
        this.orderRepository = orderRepository;
        this.tableRepository = tableRepository;
    }

    // ==========================================
    // CREATE CUSTOMER ORDER
    // ==========================================

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {

        if (request == null) {
            throw badRequest("Order information is required.");
        }

        // Validate table QR token

        if (request.tableToken() == null ||
                request.tableToken().isBlank()) {

            throw badRequest("Table QR token is required.");
        }

        RestaurantTable table = tableRepository
                .findByQrTokenAndActiveTrue(request.tableToken())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Invalid or inactive restaurant table."
                ));

        // Validate customer note

        if (request.customerNote() != null &&
                request.customerNote().length() > 500) {

            throw badRequest("Customer note cannot exceed 500 characters.");
        }

        // Validate order items

        if (request.items() == null ||
                request.items().isEmpty()) {

            throw badRequest("An order must contain at least one item.");
        }

        if (request.items().size() > 50) {
            throw badRequest("An order cannot contain more than 50 item lines.");
        }

        RestaurantOrder order = new RestaurantOrder(
                "KD-" + UUID.randomUUID().toString().toUpperCase(),
                table,
                request.customerNote()
        );

        BigDecimal orderTotal = BigDecimal.ZERO;
        int totalPreparationWork = 0;

        for (CreateOrderRequest.ItemRequest item : request.items()) {

            validateItem(item);

            List<OrderItemAddon> addons = new ArrayList<>();

            // Validate and store selected add-ons

            if (item.selectedAddons() != null) {

                if (item.selectedAddons().size() > 20) {
                    throw badRequest("Too many add-ons selected.");
                }

                for (CreateOrderRequest.AddonRequest addon
                        : item.selectedAddons()) {

                    if (addon == null ||
                            addon.name() == null ||
                            addon.name().isBlank() ||
                            addon.name().length() > 100 ||
                            addon.price() == null ||
                            addon.price().compareTo(BigDecimal.ZERO) < 0 ||
                            addon.price().compareTo(new BigDecimal("100000")) > 0) {

                        throw badRequest("Invalid add-on information.");
                    }

                    addons.add(new OrderItemAddon(
                            addon.name().trim(),
                            normalizePrice(addon.price())
                    ));
                }
            }

            OrderItem orderItem = new OrderItem(
                    item.foodId(),
                    item.foodName().trim(),
                    item.quantity(),
                    normalizePrice(item.unitPrice()),
                    item.spiceLevel(),
                    item.preparationTimeMinutes(),
                    addons
            );

            order.addItem(orderItem);

            orderTotal = orderTotal.add(orderItem.getLineTotal());

            totalPreparationWork = Math.addExact(
                    totalPreparationWork,
                    Math.multiplyExact(
                            item.preparationTimeMinutes(),
                            item.quantity()
                    )
            );

            if (totalPreparationWork > 100000) {
                throw badRequest("Preparation workload is too large.");
            }
        }

        // Save calculated totals

        order.setTotalAmount(
                orderTotal.setScale(2, RoundingMode.HALF_UP)
        );

        order.setTotalPreparationWorkMinutes(totalPreparationWork);

        // Every new customer order starts as PENDING

        order.setStatus(OrderStatus.PENDING);

        RestaurantOrder savedOrder = orderRepository.save(order);

        return toResponse(savedOrder);
    }

    // ==========================================
    // VALIDATE ORDER ITEM
    // ==========================================

    private void validateItem(
            CreateOrderRequest.ItemRequest item
    ) {

        if (item == null) {
            throw badRequest("Invalid order item.");
        }

        if (item.foodId() == null || item.foodId() <= 0) {
            throw badRequest("Invalid food ID.");
        }

        if (item.foodName() == null ||
                item.foodName().isBlank() ||
                item.foodName().length() > 120) {

            throw badRequest("Invalid food name.");
        }

        if (item.quantity() == null ||
                item.quantity() < 1 ||
                item.quantity() > 50) {

            throw badRequest("Quantity must be between 1 and 50.");
        }

        if (item.unitPrice() == null ||
                item.unitPrice().compareTo(BigDecimal.ZERO) < 0 ||
                item.unitPrice().compareTo(new BigDecimal("100000")) > 0) {

            throw badRequest("Invalid food price.");
        }

        if (item.preparationTimeMinutes() == null ||
                item.preparationTimeMinutes() < 0 ||
                item.preparationTimeMinutes() > 1440) {

            throw badRequest("Invalid preparation time.");
        }

        if (item.spiceLevel() == null ||
                !ALLOWED_SPICE_LEVELS.contains(item.spiceLevel())) {

            throw badRequest("Invalid spice level.");
        }
    }

    private BigDecimal normalizePrice(BigDecimal price) {
        return price.setScale(2, RoundingMode.HALF_UP);
    }

    // ==========================================
    // GET CUSTOMER ORDER
    // ==========================================

    @Transactional(readOnly = true)
    public OrderResponse getOrder(String orderNumber) {

        RestaurantOrder order = orderRepository
                .findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Order not found."
                ));

        return toResponse(order);
    }

    // ==========================================
    // CONVERT ENTITY TO RESPONSE
    // ==========================================

    private OrderResponse toResponse(RestaurantOrder order) {

        List<OrderResponse.ItemResponse> itemResponses =
                order.getItems().stream()
                        .map(item -> new OrderResponse.ItemResponse(
                                item.getFoodId(),
                                item.getFoodName(),
                                item.getQuantity(),
                                item.getUnitPrice(),
                                item.getLineTotal(),
                                item.getSpiceLevel(),
                                item.getPreparationTimeMinutes(),

                                item.getSelectedAddons().stream()
                                        .map(addon ->
                                                new OrderResponse.AddonResponse(
                                                        addon.getName(),
                                                        addon.getPrice()
                                                )
                                        )
                                        .toList()
                        ))
                        .toList();

        return new OrderResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getRestaurantTable().getTableNumber(),
                order.getStatus(),
                order.getTotalAmount(),
                order.getTotalPreparationWorkMinutes(),
                order.getCreatedAt(),
                itemResponses
        );
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                message
        );
    }
}
