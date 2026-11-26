package com.khaidai.backend.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record InventoryOverviewResponse(

        List<IngredientRow> ingredients,

        List<MovementRow> recentMovements

) {

    public record IngredientRow(

            Long id,
            String name,
            String unit,

            BigDecimal currentStock,
            BigDecimal reorderLevel,

            boolean active,
            boolean lowStock,

            Instant updatedAt

    ) {
    }

    public record MovementRow(

            Long id,
            Long ingredientId,

            String ingredientName,
            String unit,

            String movementType,

            BigDecimal quantityChange,
            BigDecimal balanceAfter,

            String note,
            Instant createdAt

    ) {
    }
}