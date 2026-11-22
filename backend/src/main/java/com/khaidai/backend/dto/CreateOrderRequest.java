
package com.khaidai.backend.dto;

import java.math.BigDecimal;
import java.util.List;

public record CreateOrderRequest(
        String tableToken,
        String customerNote,
        List<ItemRequest> items
) {

    public record ItemRequest(
            Integer foodId,
            String foodName,
            Integer quantity,
            BigDecimal unitPrice,
            Integer preparationTimeMinutes,
            String spiceLevel,
            List<AddonRequest> selectedAddons
    ) {
    }

    public record AddonRequest(
            String name,
            BigDecimal price
    ) {
    }
}
