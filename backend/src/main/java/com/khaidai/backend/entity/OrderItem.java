
package com.khaidai.backend.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private RestaurantOrder order;

    @Column(name = "food_id", nullable = false)
    private Integer foodId;

    @Column(name = "food_name", nullable = false, length = 120)
    private String foodName;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "spice_level", nullable = false, length = 30)
    private String spiceLevel;

    @Column(name = "preparation_time_minutes", nullable = false)
    private Integer preparationTimeMinutes;

    @ElementCollection
    @CollectionTable(
        name = "order_item_addons",
        joinColumns = @JoinColumn(name = "order_item_id")
    )
    private List<OrderItemAddon> selectedAddons = new ArrayList<>();

    public OrderItem() {
    }

    public OrderItem(
            Integer foodId,
            String foodName,
            Integer quantity,
            BigDecimal unitPrice,
            String spiceLevel,
            Integer preparationTimeMinutes,
            List<OrderItemAddon> selectedAddons
    ) {
        this.foodId = foodId;
        this.foodName = foodName;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.spiceLevel = spiceLevel;
        this.preparationTimeMinutes = preparationTimeMinutes;

        if (selectedAddons != null) {
            this.selectedAddons = new ArrayList<>(selectedAddons);
        }
    }

    public BigDecimal getLineTotal() {

        BigDecimal addonTotal = selectedAddons.stream()
                .map(OrderItemAddon::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return unitPrice.add(addonTotal)
                .multiply(BigDecimal.valueOf(quantity));
    }

    public Long getId() {
        return id;
    }

    public RestaurantOrder getOrder() {
        return order;
    }

    public void setOrder(RestaurantOrder order) {
        this.order = order;
    }

    public Integer getFoodId() {
        return foodId;
    }

    public String getFoodName() {
        return foodName;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public String getSpiceLevel() {
        return spiceLevel;
    }

    public Integer getPreparationTimeMinutes() {
        return preparationTimeMinutes;
    }

    public List<OrderItemAddon> getSelectedAddons() {
        return selectedAddons;
    }
}
