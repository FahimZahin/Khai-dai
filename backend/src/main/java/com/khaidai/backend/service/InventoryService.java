package com.khaidai.backend.service;

import com.khaidai.backend.dto.InventoryOverviewResponse;
import com.khaidai.backend.dto.InventoryRequests;

import com.khaidai.backend.entity.InventoryIngredient;
import com.khaidai.backend.entity.StockMovement;
import com.khaidai.backend.entity.StockMovementType;

import com.khaidai.backend.repository.InventoryIngredientRepository;
import com.khaidai.backend.repository.StockMovementRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class InventoryService {

    private static final Set<String> ALLOWED_UNITS = Set.of(
            "g", "kg", "ml", "L", "pcs", "pack", "bottle", "box"
    );

    private final InventoryIngredientRepository ingredientRepository;
    private final StockMovementRepository movementRepository;

    @Value("${khaidai.admin.api-key:}")
    private String configuredAdminKey;

    public InventoryService(
            InventoryIngredientRepository ingredientRepository,
            StockMovementRepository movementRepository
    ) {
        this.ingredientRepository = ingredientRepository;
        this.movementRepository = movementRepository;
    }

    // ==========================================
    // GET INVENTORY OVERVIEW
    // ==========================================

    @Transactional(readOnly = true)
    public InventoryOverviewResponse getOverview(String adminKey) {

        validateAdminKey(adminKey);

        List<InventoryOverviewResponse.IngredientRow> ingredients =
                ingredientRepository.findAllByOrderByNameAsc()
                        .stream()
                        .map(this::toIngredientRow)
                        .toList();

        List<InventoryOverviewResponse.MovementRow> movements =
                movementRepository.findTop50ByOrderByCreatedAtDesc()
                        .stream()
                        .map(this::toMovementRow)
                        .toList();

        return new InventoryOverviewResponse(
                ingredients,
                movements
        );
    }

    // ==========================================
    // CREATE INGREDIENT
    // ==========================================

    @Transactional
    public void createIngredient(
            InventoryRequests.CreateIngredientRequest request,
            String adminKey
    ) {

        validateAdminKey(adminKey);

        if (request == null) {
            throw badRequest("Ingredient information is required.");
        }

        String name = cleanName(request.name());
        String unit = validateUnit(request.unit());

        BigDecimal openingStock = nonNegative(
                request.openingStock(),
                "Opening stock"
        );

        BigDecimal reorderLevel = nonNegative(
                request.reorderLevel(),
                "Reorder level"
        );

        if (ingredientRepository.findByNameIgnoreCase(name).isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "An ingredient with this name already exists."
            );
        }

        InventoryIngredient ingredient = new InventoryIngredient();

        ingredient.setName(name);
        ingredient.setUnit(unit);
        ingredient.setCurrentStock(openingStock);
        ingredient.setReorderLevel(reorderLevel);
        ingredient.setActive(true);

        ingredientRepository.saveAndFlush(ingredient);

        if (openingStock.compareTo(BigDecimal.ZERO) > 0) {

            movementRepository.save(
                    new StockMovement(
                            ingredient,
                            StockMovementType.OPENING,
                            openingStock,
                            openingStock,
                            "Opening stock"
                    )
            );
        }
    }

    // ==========================================
    // UPDATE INGREDIENT
    // ==========================================

    @Transactional
    public void updateIngredient(
            Long id,
            InventoryRequests.UpdateIngredientRequest request,
            String adminKey
    ) {

        validateAdminKey(adminKey);

        if (request == null) {
            throw badRequest("Update information is required.");
        }

        InventoryIngredient ingredient = findForUpdate(id);

        if (request.name() != null) {

            String name = cleanName(request.name());

            ingredientRepository.findByNameIgnoreCase(name)
                    .filter(existing -> !existing.getId().equals(id))
                    .ifPresent(existing -> {
                        throw new ResponseStatusException(
                                HttpStatus.CONFLICT,
                                "Another ingredient already uses this name."
                        );
                    });

            ingredient.setName(name);
        }

        if (request.unit() != null) {
            ingredient.setUnit(validateUnit(request.unit()));
        }

        if (request.reorderLevel() != null) {
            ingredient.setReorderLevel(
                    nonNegative(
                            request.reorderLevel(),
                            "Reorder level"
                    )
            );
        }

        if (request.active() != null) {
            ingredient.setActive(request.active());
        }

        ingredientRepository.save(ingredient);
    }

    // ==========================================
    // RECORD STOCK MOVEMENT
    // ==========================================

    @Transactional
    public void recordMovement(
            Long id,
            InventoryRequests.StockMovementRequest request,
            String adminKey
    ) {

        validateAdminKey(adminKey);

        if (request == null || request.type() == null) {
            throw badRequest("Stock movement information is required.");
        }

        InventoryIngredient ingredient = findForUpdate(id);

        if (!ingredient.isActive()) {
            throw badRequest("This ingredient is inactive.");
        }

        StockMovementType type;

        try {
            type = StockMovementType.valueOf(
                    request.type().trim().toUpperCase(Locale.ROOT)
            );
        } catch (IllegalArgumentException exception) {
            throw badRequest("Invalid stock movement type.");
        }

        if (type == StockMovementType.OPENING) {
            throw badRequest("Opening stock is only allowed when creating an ingredient.");
        }

        BigDecimal quantity = nonNegative(
                request.quantity(),
                "Quantity"
        );

        if (quantity.compareTo(BigDecimal.ZERO) == 0 &&
                type != StockMovementType.ADJUSTMENT) {
            throw badRequest("Quantity must be greater than zero.");
        }

        BigDecimal current = ingredient.getCurrentStock();

        BigDecimal change;
        BigDecimal newBalance;

        switch (type) {

            case STOCK_IN -> {

                change = quantity;
                newBalance = current.add(quantity);
            }

            case WASTE -> {

                change = quantity.negate();
                newBalance = current.subtract(quantity);

                if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT,
                            "Waste quantity exceeds available stock."
                    );
                }
            }

            case ADJUSTMENT -> {

                // For adjustment, quantity means actual
                // physically counted stock, not a delta.

                newBalance = quantity;
                change = newBalance.subtract(current);
            }

            default -> throw badRequest("Unsupported stock movement.");
        }

        ingredient.setCurrentStock(newBalance);

        ingredientRepository.save(ingredient);

        String note = request.note() == null
                ? null
                : request.note().trim();

        if (note != null && note.isEmpty()) {
            note = null;
        }

        if (note != null && note.length() > 250) {
            throw badRequest("Movement note cannot exceed 250 characters.");
        }

        movementRepository.save(
                new StockMovement(
                        ingredient,
                        type,
                        change,
                        newBalance,
                        note
                )
        );
    }

    // ==========================================
    // MAPPING
    // ==========================================

    private InventoryOverviewResponse.IngredientRow toIngredientRow(
            InventoryIngredient ingredient
    ) {

        boolean lowStock =
                ingredient.getCurrentStock()
                        .compareTo(ingredient.getReorderLevel()) <= 0;

        return new InventoryOverviewResponse.IngredientRow(

                ingredient.getId(),
                ingredient.getName(),
                ingredient.getUnit(),

                ingredient.getCurrentStock(),
                ingredient.getReorderLevel(),

                ingredient.isActive(),
                lowStock,

                ingredient.getUpdatedAt()
        );
    }

    private InventoryOverviewResponse.MovementRow toMovementRow(
            StockMovement movement
    ) {

        InventoryIngredient ingredient = movement.getIngredient();

        return new InventoryOverviewResponse.MovementRow(

                movement.getId(),
                ingredient.getId(),

                ingredient.getName(),
                ingredient.getUnit(),

                movement.getMovementType().name(),

                movement.getQuantityChange(),
                movement.getBalanceAfter(),

                movement.getNote(),
                movement.getCreatedAt()
        );
    }

    // ==========================================
    // VALIDATION
    // ==========================================

    private InventoryIngredient findForUpdate(Long id) {

        if (id == null) {
            throw badRequest("Ingredient ID is required.");
        }

        return ingredientRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Ingredient not found."
                ));
    }

    private String cleanName(String value) {

        if (value == null || value.isBlank()) {
            throw badRequest("Ingredient name is required.");
        }

        String name = value.trim();

        if (name.length() > 100) {
            throw badRequest("Ingredient name cannot exceed 100 characters.");
        }

        return name;
    }

    private String validateUnit(String value) {

        if (value == null || !ALLOWED_UNITS.contains(value.trim())) {
            throw badRequest(
                    "Unit must be g, kg, ml, L, pcs, pack, bottle or box."
            );
        }

        return value.trim();
    }

    private BigDecimal nonNegative(
            BigDecimal value,
            String field
    ) {

        if (value == null || value.compareTo(BigDecimal.ZERO) < 0) {
            throw badRequest(field + " cannot be negative.");
        }

        return value;
    }

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