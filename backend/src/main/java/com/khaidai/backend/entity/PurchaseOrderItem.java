package com.khaidai.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "purchase_order_items")
public class PurchaseOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ingredient_id", nullable = false)
    private InventoryIngredient ingredient;

    @Column(name = "quantity_ordered", nullable = false, precision = 14, scale = 3)
    private BigDecimal quantityOrdered;

    @Column(name = "quantity_received", nullable = false, precision = 14, scale = 3)
    private BigDecimal quantityReceived = BigDecimal.ZERO;

    @Column(name = "unit_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitCost;

    protected PurchaseOrderItem() { }

    public PurchaseOrderItem(
            InventoryIngredient ingredient,
            BigDecimal quantityOrdered,
            BigDecimal unitCost
    ) {
        this.ingredient = ingredient;
        this.quantityOrdered = quantityOrdered;
        this.unitCost = unitCost;
        this.quantityReceived = BigDecimal.ZERO.setScale(3);
    }

    void setPurchaseOrder(PurchaseOrder purchaseOrder) {
        this.purchaseOrder = purchaseOrder;
    }

    public BigDecimal getLineTotal() {
        return quantityOrdered.multiply(unitCost);
    }

    public BigDecimal getRemainingQuantity() {
        return quantityOrdered.subtract(quantityReceived);
    }

    public Long getId() { return id; }
    public PurchaseOrder getPurchaseOrder() { return purchaseOrder; }
    public InventoryIngredient getIngredient() { return ingredient; }
    public BigDecimal getQuantityOrdered() { return quantityOrdered; }
    public BigDecimal getQuantityReceived() { return quantityReceived; }
    public void setQuantityReceived(BigDecimal quantityReceived) { this.quantityReceived = quantityReceived; }
    public BigDecimal getUnitCost() { return unitCost; }
}
