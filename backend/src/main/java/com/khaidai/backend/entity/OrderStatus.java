package com.khaidai.backend.entity;

public enum OrderStatus {
    AWAITING_PAYMENT,
    PENDING,
    ACCEPTED,
    REJECTED,
    PREPARING,
    READY,
    SERVED,
    CANCELLED
}