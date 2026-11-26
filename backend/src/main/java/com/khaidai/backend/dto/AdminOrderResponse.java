package com.khaidai.backend.dto;

import com.khaidai.backend.entity.OrderStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record AdminOrderResponse(
        Long id,
        String orderNumber,
        Integer tableNumber,
        OrderStatus status,
        BigDecimal totalAmount,
        Integer totalPreparationWorkMinutes,
        String customerNote,
        Instant createdAt,
        Instant updatedAt,

        String paymentMethod,
        String paymentStatus,
        String transactionId,
        BigDecimal paymentAmount,
        String paymentCurrency,
        Instant paidAt,

        List<ItemResponse> items
) {

    public record ItemResponse(
            Integer foodId,
            String foodName,
            Integer quantity,
            BigDecimal unitPrice,
            BigDecimal lineTotal,
            String spiceLevel,
            Integer preparationTimeMinutes,
            List<AddonResponse> selectedAddons
    ) {
    }

    public record AddonResponse(
            String name,
            BigDecimal price
    ) {
    }
}