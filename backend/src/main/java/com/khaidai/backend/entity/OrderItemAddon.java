
package com.khaidai.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Embeddable
public class OrderItemAddon {

    @Column(name = "addon_name", nullable = false, length = 100)
    private String name;

    @Column(name = "addon_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    public OrderItemAddon() {
    }

    public OrderItemAddon(String name, BigDecimal price) {
        this.name = name;
        this.price = price;
    }

    public String getName() {
        return name;
    }

    public BigDecimal getPrice() {
        return price;
    }
}
