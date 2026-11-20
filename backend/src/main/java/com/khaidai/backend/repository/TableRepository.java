
package com.khaidai.backend.repository;

import com.khaidai.backend.entity.RestaurantTable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TableRepository
        extends JpaRepository<RestaurantTable, Long> {

    Optional<RestaurantTable> findByQrTokenAndActiveTrue(
            String qrToken
    );

    Optional<RestaurantTable> findByTableNumber(
            Integer tableNumber
    );

    boolean existsByTableNumber(Integer tableNumber);

    List<RestaurantTable> findAllByOrderByTableNumberAsc();
}
