
package com.khaidai.backend.repository;

import com.khaidai.backend.entity.RestaurantOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface OrderRepository
        extends JpaRepository<RestaurantOrder, Long> {

    Optional<RestaurantOrder> findByOrderNumber(String orderNumber);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select restaurantOrder
        from RestaurantOrder restaurantOrder
        where restaurantOrder.orderNumber = :orderNumber
    """)
    Optional<RestaurantOrder> findByOrderNumberForUpdate(
            @Param("orderNumber") String orderNumber
    );

    List<RestaurantOrder> findAllByOrderByCreatedAtDesc();

    List<RestaurantOrder> findAllByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(
            Instant fromInclusive,
            Instant toExclusive
    );
}
