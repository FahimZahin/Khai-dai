package com.khaidai.backend.dto;

import java.util.List;

public record CreateOrderRequest(

        String tableToken,

        String customerNote,

        List<ItemRequest> items

) {

    public record ItemRequest(

            Integer foodId,

            Integer quantity,

            String spiceLevel,

            List<AddonRequest> selectedAddons

    ) {
    }

    public record AddonRequest(

            String id

    ) {
    }
}