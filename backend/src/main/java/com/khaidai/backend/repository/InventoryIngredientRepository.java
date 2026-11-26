package com.khaidai.backend.repository;

import com.khaidai.backend.entity.InventoryIngredient;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface InventoryIngredientRepository
        extends JpaRepository<InventoryIngredient, Long> {

    Optional<InventoryIngredient> findByNameIgnoreCase(String name);

    List<InventoryIngredient> findAllByOrderByNameAsc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select ingredient
        from InventoryIngredient ingredient
        where ingredient.id = :id
    """)
    Optional<InventoryIngredient> findByIdForUpdate(
            @Param("id") Long id
    );
}