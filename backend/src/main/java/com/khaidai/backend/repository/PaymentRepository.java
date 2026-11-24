
package com.khaidai.backend.repository;

import com.khaidai.backend.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository
        extends JpaRepository<Payment, Long> {

    Optional<Payment> findByTransactionId(String transactionId);

    List<Payment> findAllByOrder_IdOrderByCreatedAtDesc(
        Long orderId
    );

    boolean existsByTransactionId(String transactionId);
}
