
package com.khaidai.backend.repository;

import com.khaidai.backend.entity.Payment;
import com.khaidai.backend.entity.PaymentStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository
        extends JpaRepository<Payment, Long> {

    Optional<Payment> findByTransactionId(String transactionId);

    List<Payment> findAllByOrder_IdOrderByCreatedAtDesc(
        Long orderId
    );

    @EntityGraph(attributePaths = {"order", "order.items"})
    List<Payment> findAllByStatusAndPaidAtGreaterThanEqualAndPaidAtLessThanOrderByPaidAtAsc(
            PaymentStatus status,
            Instant fromInclusive,
            Instant toExclusive
    );

    boolean existsByTransactionId(String transactionId);
}
