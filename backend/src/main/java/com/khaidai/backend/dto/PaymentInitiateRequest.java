package com.khaidai.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PaymentInitiateRequest(

    @NotBlank
    @Size(max = 50)
    String orderNumber,

    @NotBlank
    @Size(max = 100)
    String customerName,

    @NotBlank
    @Email
    @Size(max = 100)
    String customerEmail,

    @NotBlank
    @Size(max = 20)
    String customerPhone,

    @NotBlank
    @Size(max = 200)
    String customerAddress,

    @NotBlank
    @Size(max = 80)
    String customerCity,

    @Size(max = 20)
    String customerPostcode

) {
}