
package com.khaidai.backend.repository;

import com.khaidai.backend.entity.RestaurantOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface OrderRepository
        extends JpaRepository<RestaurantOrder, Long> {

    Optional<RestaurantOrder> findByOrderNumber(String orderNumber);

    List<RestaurantOrder> findAllByOrderByCreatedAtDesc();

    List<RestaurantOrder> findAllByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(
            Instant fromInclusive,
            Instant toExclusive
    );
}
