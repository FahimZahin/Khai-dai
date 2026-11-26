package com.khaidai.backend.dto;

import java.math.BigDecimal;
import java.util.List;

public final class PurchasingRequests {
    private PurchasingRequests() { }

    public record SupplierRequest(
            String name,
            String contactPerson,
            String phone,
            String email,
            String address,
            String notes,
            Boolean active
    ) { }

    public record CreatePurchaseOrderRequest(
            Long supplierId,
            String notes,
            List<PurchaseOrderItemRequest> items
    ) { }

    public record PurchaseOrderItemRequest(
            Long ingredientId,
            BigDecimal quantity,
            BigDecimal unitCost
    ) { }

    public record ReceivePurchaseOrderRequest(
            String note,
            List<ReceiveItemRequest> items
    ) { }

    public record ReceiveItemRequest(
            Long purchaseOrderItemId,
            BigDecimal quantity
    ) { }
}
