package com.khaidai.backend.dto;

import com.khaidai.backend.entity.PaymentStatus;

import java.math.BigDecimal;

public record PaymentInitiateResponse(
    String transactionId,
    BigDecimal amount,
    String currency,
    String gatewayPageUrl,
    PaymentStatus status
) {
}