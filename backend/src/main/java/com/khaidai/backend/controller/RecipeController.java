package com.khaidai.backend.controller;

import com.khaidai.backend.dto.RecipeOverviewResponse;
import com.khaidai.backend.dto.RecipeRequests;
import com.khaidai.backend.service.RecipeService;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/recipes")
@CrossOrigin(
    originPatterns = {
        "http://localhost:*",
        "http://127.0.0.1:*",
        "http://192.168.*:*",
        "http://10.*:*",
        "http://172.*:*"
    }
)
public class RecipeController {

    private final RecipeService recipeService;

    public RecipeController(RecipeService recipeService) {
        this.recipeService = recipeService;
    }

    @GetMapping
    public RecipeOverviewResponse getOverview(
            @RequestHeader(
                    value = "X-Admin-Key",
                    required = false
            )
            String adminKey
    ) {
        return recipeService.getOverview(adminKey);
    }

    @PostMapping("/foods/{foodId}/ingredients")
    public RecipeOverviewResponse addIngredient(
            @PathVariable Integer foodId,

            @RequestHeader(
                    value = "X-Admin-Key",
                    required = false
            )
            String adminKey,

            @RequestBody
            RecipeRequests.AddIngredientRequest request
    ) {

        recipeService.addIngredient(foodId, request, adminKey);

        return recipeService.getOverview(adminKey);
    }

    @PatchMapping("/{recipeId}")
    public RecipeOverviewResponse updateIngredient(
            @PathVariable Long recipeId,

            @RequestHeader(
                    value = "X-Admin-Key",
                    required = false
            )
            String adminKey,

            @RequestBody
            RecipeRequests.UpdateIngredientRequest request
    ) {

        recipeService.updateIngredient(recipeId, request, adminKey);

        return recipeService.getOverview(adminKey);
    }

    @DeleteMapping("/{recipeId}")
    public RecipeOverviewResponse deleteIngredient(
            @PathVariable Long recipeId,

            @RequestHeader(
                    value = "X-Admin-Key",
                    required = false
            )
            String adminKey
    ) {

        recipeService.deleteIngredient(recipeId, adminKey);

        return recipeService.getOverview(adminKey);
    }
}