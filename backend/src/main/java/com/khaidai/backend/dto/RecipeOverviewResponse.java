package com.khaidai.backend.dto;

import java.math.BigDecimal;
import java.util.List;

public record RecipeOverviewResponse(

    List<MenuItemOption> menuItems,

    List<IngredientOption> ingredients,

    List<RecipeRow> recipes

) {

    public record MenuItemOption(
            Integer id,
            String name,
            BigDecimal price
    ) {
    }

    public record IngredientOption(
            Long id,
            String name,
            String unit,
            BigDecimal currentStock
    ) {
    }

    public record RecipeRow(
            Long id,
            Integer foodId,
            String foodName,
            Long ingredientId,
            String ingredientName,
            String unit,
            BigDecimal currentStock,
            BigDecimal quantityPerServing,
            boolean ingredientActive
    ) {
    }
}