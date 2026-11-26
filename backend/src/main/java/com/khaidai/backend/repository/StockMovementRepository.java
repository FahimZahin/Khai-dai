package com.khaidai.backend.repository;

import com.khaidai.backend.entity.StockMovement;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockMovementRepository
        extends JpaRepository<StockMovement, Long> {

    List<StockMovement> findTop50ByOrderByCreatedAtDesc();
}