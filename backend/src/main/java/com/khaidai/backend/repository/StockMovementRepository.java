package com.khaidai.backend.repository;

import com.khaidai.backend.entity.StockMovement;
import com.khaidai.backend.entity.StockMovementType;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockMovementRepository
        extends JpaRepository<StockMovement, Long> {

    List<StockMovement> findTop50ByOrderByCreatedAtDesc();

    List<StockMovement> findAllByReferenceAndMovementTypeOrderByIdAsc(
            String reference,
            StockMovementType movementType
    );
}