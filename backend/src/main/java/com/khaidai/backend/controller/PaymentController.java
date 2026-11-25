
package com.khaidai.backend.controller;

import com.khaidai.backend.dto.PaymentInitiateRequest;
import com.khaidai.backend.dto.PaymentInitiateResponse;
import com.khaidai.backend.service.PaymentService;

import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Locale;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(
    originPatterns = {
        "http://localhost:*",
        "http://127.0.0.1:*",
        "http://192.168.*:*",
        "http://10.*:*",
        "http://172.*:*"
    }
)
public class PaymentController {

    private final PaymentService paymentService;

    @Value("${sslcommerz.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/initiate")
    public ResponseEntity<PaymentInitiateResponse> initiatePayment(
            @Valid @RequestBody PaymentInitiateRequest request
    ) {
        return ResponseEntity.ok(
                paymentService.initiatePayment(request)
        );
    }

    @PostMapping("/callback/success")
    public ResponseEntity<Void> success(
            @RequestParam MultiValueMap<String, String> params
    ) {
        return redirect(
                paymentService.handleGatewayCallback(params, "success")
        );
    }

    @PostMapping("/callback/fail")
    public ResponseEntity<Void> fail(
            @RequestParam MultiValueMap<String, String> params
    ) {
        return redirect(
                paymentService.handleGatewayCallback(params, "fail")
        );
    }

    @PostMapping("/callback/cancel")
    public ResponseEntity<Void> cancel(
            @RequestParam MultiValueMap<String, String> params
    ) {
        return redirect(
                paymentService.handleGatewayCallback(params, "cancel")
        );
    }

    @PostMapping("/callback/ipn")
    public ResponseEntity<String> ipn(
            @RequestParam MultiValueMap<String, String> params
    ) {
        paymentService.handleGatewayCallback(params, "ipn");

        return ResponseEntity.ok("IPN received");
    }

    private ResponseEntity<Void> redirect(
            PaymentService.CallbackResult result
    ) {
        URI destination = UriComponentsBuilder
                .fromUriString(frontendBaseUrl)
                .queryParam(
                        "paymentResult",
                        result.paymentStatus().name().toLowerCase(Locale.ROOT)
                )
                .queryParam("orderNumber", result.orderNumber())
                .build()
                .encode()
                .toUri();

        return ResponseEntity
                .status(HttpStatus.SEE_OTHER)
                .location(destination)
                .build();
    }
}
