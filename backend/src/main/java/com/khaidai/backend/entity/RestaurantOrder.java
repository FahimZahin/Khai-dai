
package com.khaidai.backend.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "restaurant_orders")
public class RestaurantOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_number", nullable = false, unique = true, length = 50)
    private String orderNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_id", nullable = false)
    private RestaurantTable restaurantTable;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OrderStatus status = OrderStatus.PENDING;

    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "total_preparation_work_minutes", nullable = false)
    private Integer totalPreparationWorkMinutes = 0;

    @Column(name = "customer_note", length = 500)
    private String customerNote;

    @Column(name = "inventory_deducted", nullable = false)
    private boolean inventoryDeducted = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(
        mappedBy = "order",
        cascade = CascadeType.ALL,
        orphanRemoval = true
    )
    private List<OrderItem> items = new ArrayList<>();

    public RestaurantOrder() {
    }

    public RestaurantOrder(
            String orderNumber,
            RestaurantTable restaurantTable,
            String customerNote
    ) {
        this.orderNumber = orderNumber;
        this.restaurantTable = restaurantTable;
        this.customerNote = customerNote;
        this.status = OrderStatus.PENDING;
    }

    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
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

    public String getOrderNumber() {
        return orderNumber;
    }

    public RestaurantTable getRestaurantTable() {
        return restaurantTable;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    public boolean isInventoryDeducted() {
        return inventoryDeducted;
    }

    public void setInventoryDeducted(boolean inventoryDeducted) {
        this.inventoryDeducted = inventoryDeducted;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public Integer getTotalPreparationWorkMinutes() {
        return totalPreparationWorkMinutes;
    }

    public void setTotalPreparationWorkMinutes(
            Integer totalPreparationWorkMinutes
    ) {
        this.totalPreparationWorkMinutes = totalPreparationWorkMinutes;
    }

    public String getCustomerNote() {
        return customerNote;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public List<OrderItem> getItems() {
        return items;
    }
}
