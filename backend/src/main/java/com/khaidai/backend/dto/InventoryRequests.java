package com.khaidai.backend.dto;

import java.math.BigDecimal;

public final class InventoryRequests {

    private InventoryRequests() {
    }

    public record CreateIngredientRequest(

            String name,
            String unit,

            BigDecimal openingStock,
            BigDecimal reorderLevel

    ) {
    }

    public record UpdateIngredientRequest(

            String name,
            String unit,

            BigDecimal reorderLevel,
            Boolean active

    ) {
    }

    public record StockMovementRequest(

            String type,
            BigDecimal quantity,
            String note

    ) {
    }
}