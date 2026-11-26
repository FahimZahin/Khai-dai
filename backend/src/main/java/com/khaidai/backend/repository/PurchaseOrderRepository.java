package com.khaidai.backend.repository;

import com.khaidai.backend.entity.PurchaseOrder;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {

    @EntityGraph(attributePaths = {"supplier", "items", "items.ingredient"})
    List<PurchaseOrder> findAllByOrderByCreatedAtDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select purchaseOrder
        from PurchaseOrder purchaseOrder
        where purchaseOrder.id = :id
    """)
    Optional<PurchaseOrder> findByIdForUpdate(@Param("id") Long id);
}
