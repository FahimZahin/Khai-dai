package com.khaidai.backend.service;

import com.khaidai.backend.dto.RecipeOverviewResponse;
import com.khaidai.backend.dto.RecipeRequests;

import com.khaidai.backend.entity.InventoryIngredient;
import com.khaidai.backend.entity.MenuRecipeIngredient;

import com.khaidai.backend.repository.InventoryIngredientRepository;
import com.khaidai.backend.repository.MenuRecipeIngredientRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import java.util.List;

@Service
public class RecipeService {

    private final InventoryIngredientRepository ingredientRepository;
    private final MenuRecipeIngredientRepository recipeRepository;

    @Value("${khaidai.admin.api-key:}")
    private String configuredAdminKey;

    public RecipeService(
            InventoryIngredientRepository ingredientRepository,
            MenuRecipeIngredientRepository recipeRepository
    ) {
        this.ingredientRepository = ingredientRepository;
        this.recipeRepository = recipeRepository;
    }

    // ==========================================
    // GET RECIPE OVERVIEW
    // ==========================================

    @Transactional(readOnly = true)
    public RecipeOverviewResponse getOverview(String adminKey) {

        validateAdminKey(adminKey);

        List<RecipeOverviewResponse.MenuItemOption> menuItems =
                MenuCatalog.all()
                        .stream()
                        .map(food -> new RecipeOverviewResponse.MenuItemOption(
                                food.id(),
                                food.name(),
                                food.price()
                        ))
                        .toList();

        List<RecipeOverviewResponse.IngredientOption> ingredients =
                ingredientRepository.findAllByOrderByNameAsc()
                        .stream()
                        .filter(InventoryIngredient::isActive)
                        .map(ingredient ->
                                new RecipeOverviewResponse.IngredientOption(
                                        ingredient.getId(),
                                        ingredient.getName(),
                                        ingredient.getUnit(),
                                        ingredient.getCurrentStock()
                                )
                        )
                        .toList();

        List<RecipeOverviewResponse.RecipeRow> recipes =
                recipeRepository.findAllWithIngredient()
                        .stream()
                        .map(this::toRecipeRow)
                        .toList();

        return new RecipeOverviewResponse(
                menuItems,
                ingredients,
                recipes
        );
    }

    // ==========================================
    // ADD INGREDIENT TO RECIPE
    // ==========================================

    @Transactional
    public void addIngredient(
            Integer foodId,
            RecipeRequests.AddIngredientRequest request,
            String adminKey
    ) {

        validateAdminKey(adminKey);

        if (request == null || request.ingredientId() == null) {
            throw badRequest("Please select an ingredient.");
        }

        MenuCatalog.FoodItem food = MenuCatalog.findById(foodId);

        if (food == null) {
            throw badRequest("Invalid menu item.");
        }

        InventoryIngredient ingredient = ingredientRepository
                .findById(request.ingredientId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Ingredient not found."
                ));

        if (!ingredient.isActive()) {
            throw badRequest("This ingredient is inactive.");
        }

        if (recipeRepository.findByFoodIdAndIngredient_Id(
                foodId,
                ingredient.getId()
        ).isPresent()) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This ingredient is already in the recipe."
            );
        }

        BigDecimal quantity = positiveQuantity(
                request.quantityPerServing()
        );

        MenuRecipeIngredient recipe = new MenuRecipeIngredient();

        recipe.setFoodId(food.id());
        recipe.setFoodName(food.name());
        recipe.setIngredient(ingredient);
        recipe.setQuantityPerServing(quantity);

        recipeRepository.save(recipe);
    }

    // ==========================================
    // UPDATE RECIPE QUANTITY
    // ==========================================

    @Transactional
    public void updateIngredient(
            Long recipeId,
            RecipeRequests.UpdateIngredientRequest request,
            String adminKey
    ) {

        validateAdminKey(adminKey);

        if (request == null) {
            throw badRequest("Recipe update information is required.");
        }

        MenuRecipeIngredient recipe = recipeRepository
                .findById(recipeId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Recipe ingredient not found."
                ));

        recipe.setQuantityPerServing(
                positiveQuantity(request.quantityPerServing())
        );

        recipeRepository.save(recipe);
    }

    // ==========================================
    // REMOVE INGREDIENT FROM RECIPE
    // ==========================================

    @Transactional
    public void deleteIngredient(Long recipeId, String adminKey) {

        validateAdminKey(adminKey);

        MenuRecipeIngredient recipe = recipeRepository
                .findById(recipeId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Recipe ingredient not found."
                ));

        recipeRepository.delete(recipe);
    }

    // ==========================================
    // RESPONSE MAPPING
    // ==========================================

    private RecipeOverviewResponse.RecipeRow toRecipeRow(
            MenuRecipeIngredient recipe
    ) {

        InventoryIngredient ingredient = recipe.getIngredient();

        return new RecipeOverviewResponse.RecipeRow(
                recipe.getId(),
                recipe.getFoodId(),
                recipe.getFoodName(),
                ingredient.getId(),
                ingredient.getName(),
                ingredient.getUnit(),
                ingredient.getCurrentStock(),
                recipe.getQuantityPerServing(),
                ingredient.isActive()
        );
    }

    // ==========================================
    // QUANTITY VALIDATION
    // ==========================================

    private BigDecimal positiveQuantity(BigDecimal value) {

        if (value == null || value.compareTo(BigDecimal.ZERO) <= 0) {
            throw badRequest("Quantity per serving must be greater than zero.");
        }

        BigDecimal normalized;

        try {
            normalized = value.setScale(3, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException exception) {
            throw badRequest(
                    "Quantity supports a maximum of 3 decimal places."
            );
        }

        if (normalized.precision() > 14) {
            throw badRequest("Recipe quantity is too large.");
        }

        return normalized;
    }

    // ==========================================
    // ADMIN AUTHENTICATION
    // ==========================================

    private void validateAdminKey(String providedKey) {

        if (configuredAdminKey == null ||
                configuredAdminKey.isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Admin API key is not configured."
            );
        }

        if (providedKey == null ||
                !MessageDigest.isEqual(
                        configuredAdminKey.getBytes(StandardCharsets.UTF_8),
                        providedKey.getBytes(StandardCharsets.UTF_8)
                )) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid administrator key."
            );
        }
    }

    private ResponseStatusException badRequest(String message) {

        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                message
        );
    }
}