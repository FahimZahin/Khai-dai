package com.khaidai.backend.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(
    name = "inventory_stock_movements",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_stock_movement_reference_ingredient_type",
            columnNames = {"movement_reference", "ingredient_id", "movement_type"}
        )
    },
    indexes = {
        @Index(
            name = "idx_inventory_movement_created",
            columnList = "created_at"
        ),
        @Index(
            name = "idx_inventory_movement_ingredient",
            columnList = "ingredient_id"
        )
    }
)
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ingredient_id", nullable = false)
    private InventoryIngredient ingredient;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", nullable = false, length = 30)
    private StockMovementType movementType;

    @Column(
        name = "quantity_change",
        nullable = false,
        precision = 14,
        scale = 3
    )
    private BigDecimal quantityChange;

    @Column(
        name = "balance_after",
        nullable = false,
        precision = 14,
        scale = 3
    )
    private BigDecimal balanceAfter;

    @Column(length = 250)
    private String note;

    @Column(name = "movement_reference", length = 100)
    private String reference;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public StockMovement() {
    }

    public StockMovement(
            InventoryIngredient ingredient,
            StockMovementType movementType,
            BigDecimal quantityChange,
            BigDecimal balanceAfter,
            String note
    ) {
        this(ingredient, movementType, quantityChange, balanceAfter, note, null);
    }

    public StockMovement(
            InventoryIngredient ingredient,
            StockMovementType movementType,
            BigDecimal quantityChange,
            BigDecimal balanceAfter,
            String note,
            String reference
    ) {
        this.ingredient = ingredient;
        this.movementType = movementType;
        this.quantityChange = quantityChange;
        this.balanceAfter = balanceAfter;
        this.note = note;
        this.reference = reference;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public InventoryIngredient getIngredient() {
        return ingredient;
    }

    public StockMovementType getMovementType() {
        return movementType;
    }

    public BigDecimal getQuantityChange() {
        return quantityChange;
    }

    public BigDecimal getBalanceAfter() {
        return balanceAfter;
    }

    public String getNote() {
        return note;
    }

    public String getReference() {
        return reference;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}