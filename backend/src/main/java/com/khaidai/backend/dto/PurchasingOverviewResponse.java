package com.khaidai.backend.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record PurchasingOverviewResponse(
        List<SupplierRow> suppliers,
        List<IngredientOption> ingredients,
        List<PurchaseOrderRow> purchaseOrders
) {
    public record SupplierRow(
            Long id,
            String name,
            String contactPerson,
            String phone,
            String email,
            String address,
            String notes,
            boolean active,
            Instant createdAt,
            Instant updatedAt
    ) { }

    public record IngredientOption(
            Long id,
            String name,
            String unit,
            BigDecimal currentStock
    ) { }

    public record PurchaseOrderRow(
            Long id,
            String poNumber,
            Long supplierId,
            String supplierName,
            String status,
            String notes,
            Instant createdAt,
            Instant orderedAt,
            Instant receivedAt,
            BigDecimal totalAmount,
            List<ItemRow> items
    ) { }

    public record ItemRow(
            Long id,
            Long ingredientId,
            String ingredientName,
            String unit,
            BigDecimal quantityOrdered,
            BigDecimal quantityReceived,
            BigDecimal remainingQuantity,
            BigDecimal unitCost,
            BigDecimal lineTotal
    ) { }
}
