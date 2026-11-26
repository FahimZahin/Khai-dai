package com.khaidai.backend.service;

import com.khaidai.backend.entity.InventoryIngredient;
import com.khaidai.backend.entity.MenuRecipeIngredient;
import com.khaidai.backend.entity.OrderItem;
import com.khaidai.backend.entity.RestaurantOrder;
import com.khaidai.backend.entity.StockMovement;
import com.khaidai.backend.entity.StockMovementType;

import com.khaidai.backend.repository.InventoryIngredientRepository;
import com.khaidai.backend.repository.MenuRecipeIngredientRepository;
import com.khaidai.backend.repository.StockMovementRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;

@Service
public class OrderInventoryService {

    private final InventoryIngredientRepository ingredientRepository;
    private final MenuRecipeIngredientRepository recipeRepository;
    private final StockMovementRepository movementRepository;

    public OrderInventoryService(
            InventoryIngredientRepository ingredientRepository,
            MenuRecipeIngredientRepository recipeRepository,
            StockMovementRepository movementRepository
    ) {
        this.ingredientRepository = ingredientRepository;
        this.recipeRepository = recipeRepository;
        this.movementRepository = movementRepository;
    }

    // ==========================================
    // CHECK STOCK BEFORE ACCEPTING AN ORDER
    // ==========================================

    @Transactional
    public void validateAvailability(RestaurantOrder order) {

        Map<Long, BigDecimal> required =
                calculateRequiredIngredients(order);

        Map<Long, InventoryIngredient> locked =
                lockIngredients(required.keySet());

        validateStock(required, locked);
    }

    // ==========================================
    // DEDUCT STOCK WHEN PREPARATION STARTS
    // ==========================================

    @Transactional
    public void deductForOrder(RestaurantOrder order) {

        if (order.isInventoryDeducted()) {
            return;
        }

        Map<Long, BigDecimal> required =
                calculateRequiredIngredients(order);

        Map<Long, InventoryIngredient> locked =
                lockIngredients(required.keySet());

        validateStock(required, locked);

        for (Map.Entry<Long, BigDecimal> entry : required.entrySet()) {

            InventoryIngredient ingredient = locked.get(entry.getKey());

            BigDecimal quantity = entry.getValue();

            BigDecimal newBalance =
                    ingredient.getCurrentStock().subtract(quantity);

            ingredient.setCurrentStock(newBalance);

            ingredientRepository.save(ingredient);

            movementRepository.save(
                    new StockMovement(
                            ingredient,
                            StockMovementType.ORDER_DEDUCTION,
                            quantity.negate(),
                            newBalance,
                            "Deducted for order " + order.getOrderNumber(),
                            order.getOrderNumber()
                    )
            );
        }

        order.setInventoryDeducted(true);
    }

    // ==========================================
    // RESTORE STOCK WHEN A PREPARING ORDER
    // IS CANCELLED
    // ==========================================

    @Transactional
    public void restoreForOrder(RestaurantOrder order) {

        if (!order.isInventoryDeducted()) {
            return;
        }

        List<StockMovement> deductions =
                movementRepository
                        .findAllByReferenceAndMovementTypeOrderByIdAsc(
                                order.getOrderNumber(),
                                StockMovementType.ORDER_DEDUCTION
                        );

        if (deductions.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Inventory deduction history is missing. Stock cannot be safely restored."
            );
        }

        Map<Long, BigDecimal> restorationAmounts = new TreeMap<>();

        for (StockMovement deduction : deductions) {

            BigDecimal change = deduction.getQuantityChange();

            if (change == null ||
                    change.compareTo(BigDecimal.ZERO) >= 0) {

                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Invalid inventory deduction history."
                );
            }

            Long ingredientId = deduction.getIngredient().getId();

            restorationAmounts.merge(
                    ingredientId,
                    change.negate(),
                    BigDecimal::add
            );
        }

        Map<Long, InventoryIngredient> locked =
                lockIngredients(restorationAmounts.keySet());

        for (Map.Entry<Long, BigDecimal> entry :
                restorationAmounts.entrySet()) {

            InventoryIngredient ingredient = locked.get(entry.getKey());

            BigDecimal quantity = entry.getValue();

            BigDecimal newBalance =
                    ingredient.getCurrentStock().add(quantity);

            ingredient.setCurrentStock(newBalance);

            ingredientRepository.save(ingredient);

            movementRepository.save(
                    new StockMovement(
                            ingredient,
                            StockMovementType.ORDER_RESTORATION,
                            quantity,
                            newBalance,
                            "Restored after cancellation of order "
                                    + order.getOrderNumber(),
                            order.getOrderNumber()
                    )
            );
        }

        order.setInventoryDeducted(false);
    }

    // ==========================================
    // CALCULATE TOTAL REQUIRED INGREDIENTS
    // ==========================================

    private Map<Long, BigDecimal> calculateRequiredIngredients(
            RestaurantOrder order
    ) {

        if (order == null ||
                order.getItems() == null ||
                order.getItems().isEmpty()) {

            throw conflict("Order has no items.");
        }

        List<Integer> foodIds = order.getItems()
                .stream()
                .map(OrderItem::getFoodId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        List<MenuRecipeIngredient> recipeRows =
                foodIds.isEmpty()
                        ? List.of()
                        : recipeRepository.findAllForFoodIds(foodIds);

        Map<Integer, List<MenuRecipeIngredient>> recipesByFood =
                new HashMap<>();

        for (MenuRecipeIngredient recipe : recipeRows) {

            recipesByFood.computeIfAbsent(
                    recipe.getFoodId(),
                    ignored -> new ArrayList<>()
            ).add(recipe);
        }

        Map<Long, BigDecimal> required = new TreeMap<>();

        for (OrderItem item : order.getItems()) {

            if (item.getFoodId() == null ||
                    item.getQuantity() == null ||
                    item.getQuantity() <= 0) {

                throw conflict("Invalid quantity or menu item in order.");
            }

            List<MenuRecipeIngredient> recipeLines =
                    recipesByFood.get(item.getFoodId());

            if (recipeLines == null || recipeLines.isEmpty()) {

                String foodName = item.getFoodName() == null
                        ? "Food ID " + item.getFoodId()
                        : item.getFoodName();

                throw conflict(
                        "No recipe configured for " + foodName
                                + ". Add its ingredients before accepting the order."
                );
            }

            for (MenuRecipeIngredient recipe : recipeLines) {

                InventoryIngredient ingredient = recipe.getIngredient();

                if (ingredient == null ||
                        recipe.getQuantityPerServing() == null ||
                        recipe.getQuantityPerServing()
                                .compareTo(BigDecimal.ZERO) <= 0) {

                    throw conflict("Invalid recipe configuration.");
                }

                BigDecimal needed =
                        recipe.getQuantityPerServing()
                                .multiply(BigDecimal.valueOf(item.getQuantity()));

                required.merge(
                        ingredient.getId(),
                        needed,
                        BigDecimal::add
                );
            }
        }

        return required;
    }

    // ==========================================
    // LOCK INGREDIENTS IN A CONSISTENT ORDER
    // ==========================================

    private Map<Long, InventoryIngredient> lockIngredients(
            Set<Long> ingredientIds
    ) {

        Map<Long, InventoryIngredient> locked =
                new LinkedHashMap<>();

        for (Long id : new TreeSet<>(ingredientIds)) {

            InventoryIngredient ingredient =
                    ingredientRepository.findByIdForUpdate(id)
                            .orElseThrow(() -> new ResponseStatusException(
                                    HttpStatus.NOT_FOUND,
                                    "Recipe ingredient no longer exists."
                            ));

            locked.put(id, ingredient);
        }

        return locked;
    }

    // ==========================================
    // VALIDATE STOCK
    // ==========================================

    private void validateStock(
            Map<Long, BigDecimal> required,
            Map<Long, InventoryIngredient> locked
    ) {

        for (Map.Entry<Long, BigDecimal> entry : required.entrySet()) {

            InventoryIngredient ingredient = locked.get(entry.getKey());

            if (!ingredient.isActive()) {

                throw conflict(
                        "Ingredient " + ingredient.getName()
                                + " is inactive. Update its recipe or activate it."
                );
            }

            BigDecimal available = ingredient.getCurrentStock();
            BigDecimal needed = entry.getValue();

            if (available.compareTo(needed) < 0) {

                throw conflict(
                        "Insufficient stock for " + ingredient.getName()
                                + ". Required: " + format(needed)
                                + " " + ingredient.getUnit()
                                + ", available: " + format(available)
                                + " " + ingredient.getUnit() + "."
                );
            }
        }
    }

    private String format(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }

    private ResponseStatusException conflict(String message) {

        return new ResponseStatusException(
                HttpStatus.CONFLICT,
                message
        );
    }
}
