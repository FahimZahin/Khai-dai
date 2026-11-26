package com.khaidai.backend.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(
    name = "menu_recipe_ingredients",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_recipe_food_ingredient",
            columnNames = {"food_id", "ingredient_id"}
        )
    },
    indexes = {
        @Index(
            name = "idx_recipe_food",
            columnList = "food_id"
        ),
        @Index(
            name = "idx_recipe_ingredient",
            columnList = "ingredient_id"
        )
    }
)
public class MenuRecipeIngredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "food_id", nullable = false)
    private Integer foodId;

    @Column(name = "food_name", nullable = false, length = 120)
    private String foodName;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ingredient_id", nullable = false)
    private InventoryIngredient ingredient;

    @Column(
        name = "quantity_per_serving",
        nullable = false,
        precision = 14,
        scale = 3
    )
    private BigDecimal quantityPerServing;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public MenuRecipeIngredient() {
    }

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Integer getFoodId() {
        return foodId;
    }

    public void setFoodId(Integer foodId) {
        this.foodId = foodId;
    }

    public String getFoodName() {
        return foodName;
    }

    public void setFoodName(String foodName) {
        this.foodName = foodName;
    }

    public InventoryIngredient getIngredient() {
        return ingredient;
    }

    public void setIngredient(InventoryIngredient ingredient) {
        this.ingredient = ingredient;
    }

    public BigDecimal getQuantityPerServing() {
        return quantityPerServing;
    }

    public void setQuantityPerServing(BigDecimal quantityPerServing) {
        this.quantityPerServing = quantityPerServing;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}