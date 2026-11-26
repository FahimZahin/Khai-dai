package com.khaidai.backend.dto;

import java.math.BigDecimal;

public final class RecipeRequests {

    private RecipeRequests() {
    }

    public record AddIngredientRequest(
            Long ingredientId,
            BigDecimal quantityPerServing
    ) {
    }

    public record UpdateIngredientRequest(
            BigDecimal quantityPerServing
    ) {
    }
}