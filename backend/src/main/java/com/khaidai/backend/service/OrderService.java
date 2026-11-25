package com.khaidai.backend.service;

import com.khaidai.backend.dto.CreateOrderRequest;
import com.khaidai.backend.dto.OrderResponse;

import com.khaidai.backend.entity.OrderItem;
import com.khaidai.backend.entity.OrderItemAddon;
import com.khaidai.backend.entity.OrderStatus;
import com.khaidai.backend.entity.PaymentMethod;
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
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final TableRepository tableRepository;

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

            throw badRequest(
                    "Customer note cannot exceed 500 characters."
            );
        }

        // Validate order items

        if (request.items() == null ||
                request.items().isEmpty()) {

            throw badRequest(
                    "An order must contain at least one item."
            );
        }

        if (request.items().size() > 50) {

            throw badRequest(
                    "An order cannot contain more than 50 item lines."
            );
        }

        RestaurantOrder order = new RestaurantOrder(
                "KD-" + UUID.randomUUID().toString().toUpperCase(),
                table,
                request.customerNote()
        );

        BigDecimal orderTotal = BigDecimal.ZERO;

        int totalPreparationWork = 0;

        // Process every order item

        for (CreateOrderRequest.ItemRequest item : request.items()) {

            // Validate food and retrieve official catalog data

            MenuCatalog.FoodItem food = validateItem(item);

            List<OrderItemAddon> addons = new ArrayList<>();

            // Validate selected add-ons

            if (item.selectedAddons() != null) {

                if (item.selectedAddons().size() > 20) {

                    throw badRequest("Too many add-ons selected.");
                }

                // Prevent duplicate add-on selections

                Set<String> selectedAddonIds = new HashSet<>();

                for (CreateOrderRequest.AddonRequest addonRequest
                        : item.selectedAddons()) {

                    if (addonRequest == null ||
                            addonRequest.id() == null ||
                            addonRequest.id().isBlank()) {

                        throw badRequest(
                                "Invalid add-on information."
                        );
                    }

                    String addonId = addonRequest.id().trim();

                    if (!selectedAddonIds.add(addonId)) {

                        throw badRequest(
                                "Duplicate add-on selection."
                        );
                    }

                    // Find add-on belonging to this particular food

                    MenuCatalog.Addon officialAddon =
                            food.addons().get(addonId);

                    if (officialAddon == null) {

                        throw badRequest(
                                "Selected add-on is not available for this food."
                        );
                    }

                    // Use official backend add-on price

                    addons.add(new OrderItemAddon(
                            officialAddon.name(),
                            normalizePrice(officialAddon.price())
                    ));
                }
            }

            // Build order item using backend-authoritative values

            OrderItem orderItem = new OrderItem(

                    food.id(),

                    food.name(),

                    item.quantity(),

                    normalizePrice(food.price()),

                    item.spiceLevel(),

                    food.preparationTimeMinutes(),

                    addons
            );

            order.addItem(orderItem);

            // Calculate actual line total

            orderTotal = orderTotal.add(
                    orderItem.getLineTotal()
            );

            // Different dishes can be prepared simultaneously

            totalPreparationWork = Math.max(
                    totalPreparationWork,
                    food.preparationTimeMinutes()
            );
        }

        // Save calculated totals

        order.setTotalAmount(
                orderTotal.setScale(2, RoundingMode.HALF_UP)
        );

        order.setTotalPreparationWorkMinutes(
                totalPreparationWork
        );

        // Preserve existing behavior when paymentMethod is omitted.
        PaymentMethod paymentMethod = request.paymentMethod() == null
                ? PaymentMethod.CASH
                : request.paymentMethod();

        order.setStatus(
                paymentMethod == PaymentMethod.SSLCOMMERZ
                        ? OrderStatus.AWAITING_PAYMENT
                        : OrderStatus.PENDING
        );

        RestaurantOrder savedOrder = orderRepository.save(order);

        return toResponse(savedOrder);
    }

    // ==========================================
    // VALIDATE ITEM AND GET OFFICIAL FOOD
    // ==========================================

    private MenuCatalog.FoodItem validateItem(
            CreateOrderRequest.ItemRequest item
    ) {

        if (item == null) {

            throw badRequest("Invalid order item.");
        }

        if (item.foodId() == null) {

            throw badRequest("Invalid food ID.");
        }

        MenuCatalog.FoodItem food =
                MenuCatalog.findById(item.foodId());

        if (food == null) {

            throw badRequest("Food does not exist.");
        }

        if (item.quantity() == null ||
                item.quantity() < 1 ||
                item.quantity() > 50) {

            throw badRequest(
                    "Quantity must be between 1 and 50."
            );
        }

        // Validate spice level against this food's options

        if (item.spiceLevel() == null ||
                !food.spiceOptions().contains(item.spiceLevel())) {

            throw badRequest(
                    "Invalid spice level for this food."
            );
        }

        return food;
    }

    // ==========================================
    // NORMALIZE PRICE
    // ==========================================

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

    // ==========================================
    // BAD REQUEST
    // ==========================================

    private ResponseStatusException badRequest(String message) {

        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                message
        );
    }
}