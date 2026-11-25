package com.khaidai.backend.service;

import com.khaidai.backend.dto.PaymentInitiateRequest;
import com.khaidai.backend.dto.PaymentInitiateResponse;
import com.khaidai.backend.entity.*;
import com.khaidai.backend.repository.OrderRepository;
import com.khaidai.backend.repository.PaymentRepository;
import org.springframework.util.MultiValueMap;
import org.springframework.web.util.UriComponentsBuilder;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentService {

    private static final BigDecimal MIN_AMOUNT =
            new BigDecimal("10.00");

    private static final BigDecimal MAX_AMOUNT =
            new BigDecimal("500000.00");

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final RestClient restClient = RestClient.create();

    @Value("${sslcommerz.store-id:}")
    private String storeId;

    @Value("${sslcommerz.store-password:}")
    private String storePassword;

    @Value("${sslcommerz.base-url:https://sandbox.sslcommerz.com}")
    private String baseUrl;

    @Value("${sslcommerz.callback-base-url:http://localhost:8090}")
    private String callbackBaseUrl;

    public PaymentService(
            OrderRepository orderRepository,
            PaymentRepository paymentRepository
    ) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public PaymentInitiateResponse initiatePayment(
            PaymentInitiateRequest request
    ) {

        if (!StringUtils.hasText(storeId) ||
                !StringUtils.hasText(storePassword)) {

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "SSLCommerz credentials are not configured."
            );
        }

        RestaurantOrder order = orderRepository
                .findByOrderNumber(request.orderNumber())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Order not found."
                ));

        if (order.getStatus() != OrderStatus.AWAITING_PAYMENT) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This order is not awaiting online payment."
            );
        }

        BigDecimal amount = order.getTotalAmount()
                .setScale(2, RoundingMode.HALF_UP);

        if (amount.compareTo(MIN_AMOUNT) < 0 ||
                amount.compareTo(MAX_AMOUNT) > 0) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Payment amount must be between BDT 10 and BDT 500,000."
            );
        }

        // Reuse an existing pending session to avoid duplicate charges.
        List<Payment> previousPayments =
                paymentRepository.findAllByOrder_IdOrderByCreatedAtDesc(
                        order.getId()
                );

        for (Payment previous : previousPayments) {

            if (previous.getPaymentMethod() == PaymentMethod.SSLCOMMERZ &&
                    previous.getStatus() == PaymentStatus.PENDING) {

                if (StringUtils.hasText(previous.getGatewayPageUrl())) {
                    return toResponse(previous);
                }

                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "A payment session is already being created. Please try again shortly."
                );
            }
        }

        String transactionId =
                "KD" + UUID.randomUUID()
                        .toString()
                        .replace("-", "")
                        .substring(0, 28)
                        .toUpperCase(Locale.ROOT);

        Payment payment = new Payment();

        payment.setOrder(order);
        payment.setTransactionId(transactionId);
        payment.setPaymentMethod(PaymentMethod.SSLCOMMERZ);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setAmount(amount);
        payment.setCurrency("BDT");

        paymentRepository.saveAndFlush(payment);

        MultiValueMap<String, String> form =
                new LinkedMultiValueMap<>();

        form.add("store_id", storeId);
        form.add("store_passwd", storePassword);
        form.add("total_amount", amount.toPlainString());
        form.add("currency", "BDT");
        form.add("tran_id", transactionId);

        form.add("success_url", callbackUrl("success"));
        form.add("fail_url", callbackUrl("fail"));
        form.add("cancel_url", callbackUrl("cancel"));
        form.add("ipn_url", callbackUrl("ipn"));

        form.add("cus_name", request.customerName());
        form.add("cus_email", request.customerEmail());
        form.add("cus_phone", request.customerPhone());
        form.add("cus_add1", request.customerAddress());
        form.add("cus_city", request.customerCity());
        form.add("cus_country", "Bangladesh");

        if (StringUtils.hasText(request.customerPostcode())) {
            form.add("cus_postcode", request.customerPostcode());
        }

        int itemCount = order.getItems().stream()
                .mapToInt(item -> item.getQuantity())
                .sum();

        form.add("shipping_method", "NO");
        form.add("product_name", "Khai-Dai Restaurant Order");
        form.add("product_category", "food");
        form.add("product_profile", "general");
        form.add("num_of_item", String.valueOf(Math.max(itemCount, 1)));

        form.add("value_a", order.getOrderNumber());
        form.add("value_b", transactionId);

        Map<?, ?> gatewayResponse;

        try {

            String apiUrl = baseUrl.replaceAll("/+$", "")
                    + "/gwprocess/v4/api.php";

            gatewayResponse = restClient.post()
                    .uri(apiUrl)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(form)
                    .retrieve()
                    .body(Map.class);

        } catch (RestClientException exception) {

            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Unable to connect to SSLCommerz. Please try again."
            );
        }

        if (gatewayResponse == null) {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "SSLCommerz returned an empty response."
            );
        }

        String gatewayStatus = value(gatewayResponse, "status");
        String gatewayPageUrl = value(
                gatewayResponse,
                "GatewayPageURL"
        );

        String sessionKey = value(
                gatewayResponse,
                "sessionkey"
        );

        if (!"SUCCESS".equalsIgnoreCase(gatewayStatus) ||
                !StringUtils.hasText(gatewayPageUrl) ||
                !StringUtils.hasText(sessionKey) ||
                !isTrustedGatewayUrl(gatewayPageUrl)) {

            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "SSLCommerz could not create a valid payment session."
            );
        }

        payment.setGatewaySessionKey(sessionKey);
        payment.setGatewayPageUrl(gatewayPageUrl);

        paymentRepository.save(payment);

        return toResponse(payment);
    }

public record CallbackResult(
        String orderNumber,
        PaymentStatus paymentStatus
) {}

@Transactional
public CallbackResult handleGatewayCallback(
        MultiValueMap<String, String> params,
        String callbackType
) {
    String transactionId = params.getFirst("tran_id");

    if (!StringUtils.hasText(transactionId)) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Missing transaction ID."
        );
    }

    Payment payment = paymentRepository
            .findByTransactionId(transactionId)
            .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Payment transaction not found."
            ));

    if (payment.getStatus() == PaymentStatus.PAID) {
        return callbackResult(payment);
    }

    String validationId = params.getFirst("val_id");

    if (StringUtils.hasText(validationId)) {
        return validateAndApply(payment, validationId);
    }

    return queryAndApply(payment);
}

private CallbackResult validateAndApply(
        Payment payment,
        String validationId
) {
    String endpoint = baseUrl.replaceAll("/+$", "")
            + "/validator/api/validationserverAPI.php";

    URI uri = UriComponentsBuilder
            .fromUriString(endpoint)
            .queryParam("val_id", validationId)
            .queryParam("store_id", storeId)
            .queryParam("store_passwd", storePassword)
            .queryParam("format", "json")
            .build()
            .encode()
            .toUri();

    Map<?, ?> result;

    try {
        result = restClient.get()
                .uri(uri)
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .body(Map.class);
    } catch (RestClientException exception) {
        throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "SSLCommerz validation service is unavailable."
        );
    }

    if (result == null ||
            !"DONE".equalsIgnoreCase(value(result, "APIConnect"))) {
        throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Unable to verify the SSLCommerz transaction."
        );
    }

    String status = value(result, "status");

    if (!"VALID".equalsIgnoreCase(status) &&
            !"VALIDATED".equalsIgnoreCase(status)) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "SSLCommerz transaction is not valid."
        );
    }

    if (!payment.getTransactionId().equals(
            value(result, "tran_id"))) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Transaction ID mismatch."
        );
    }

if (payment.getAmount().compareTo(
        new BigDecimal(value(result, "amount"))) != 0) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Payment amount mismatch."
        );
    }

    if (!"BDT".equalsIgnoreCase(value(result, "currency"))) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Payment currency mismatch."
        );
    }

    if (!payment.getOrder().getOrderNumber().equals(
            value(result, "value_a")) ||
            !payment.getTransactionId().equals(
                    value(result, "value_b"))) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Payment reference mismatch."
        );
    }

    // Risky payments must not be automatically confirmed.
    if (!"0".equals(value(result, "risk_level"))) {
        return callbackResult(payment);
    }

    payment.setGatewayValidationId(
            value(result, "val_id")
    );

    payment.setBankTransactionId(
            value(result, "bank_tran_id")
    );

    payment.setStatus(PaymentStatus.PAID);

    payment.getOrder().setStatus(OrderStatus.PENDING);

    paymentRepository.save(payment);
    orderRepository.save(payment.getOrder());

    return callbackResult(payment);
}

private CallbackResult queryAndApply(Payment payment) {

    String endpoint = baseUrl.replaceAll("/+$", "")
            + "/validator/api/merchantTransIDvalidationAPI.php";

    URI uri = UriComponentsBuilder
            .fromUriString(endpoint)
            .queryParam("tran_id", payment.getTransactionId())
            .queryParam("store_id", storeId)
            .queryParam("store_passwd", storePassword)
            .queryParam("format", "json")
            .build()
            .encode()
            .toUri();

    Map<?, ?> response;

    try {
        response = restClient.get()
                .uri(uri)
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .body(Map.class);
    } catch (RestClientException exception) {
        throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Unable to query SSLCommerz transaction."
        );
    }

    if (response == null ||
            !"DONE".equalsIgnoreCase(
                    value(response, "APIConnect"))) {
        throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "SSLCommerz transaction query failed."
        );
    }

    Object elements = response.get("element");

    if (elements instanceof List<?> list) {
        for (Object element : list) {
            if (!(element instanceof Map<?, ?> transaction)) {
                continue;
            }

            if (!payment.getTransactionId().equals(
                    value(transaction, "tran_id"))) {
                continue;
            }

            String status = value(transaction, "status");

            if ("VALID".equalsIgnoreCase(status) ||
                    "VALIDATED".equalsIgnoreCase(status)) {

                String validationId = value(transaction, "val_id");

                if (StringUtils.hasText(validationId)) {
                    return validateAndApply(payment, validationId);
                }

            } else if ("FAILED".equalsIgnoreCase(status)) {

                payment.setStatus(PaymentStatus.FAILED);
                paymentRepository.save(payment);

            } else if ("CANCELLED".equalsIgnoreCase(status)) {

                payment.setStatus(PaymentStatus.CANCELLED);
                paymentRepository.save(payment);
            }

            break;
        }
    }

    return callbackResult(payment);
}

private CallbackResult callbackResult(Payment payment) {
    return new CallbackResult(
            payment.getOrder().getOrderNumber(),
            payment.getStatus()
    );
}


    private String callbackUrl(String action) {
        return callbackBaseUrl.replaceAll("/+$", "")
                + "/api/payments/callback/" + action;
    }

    private boolean isTrustedGatewayUrl(String gatewayPageUrl) {
        try {
            URI gatewayUri = URI.create(gatewayPageUrl);
            URI configuredUri = URI.create(baseUrl);

            return "https".equalsIgnoreCase(gatewayUri.getScheme())
                    && configuredUri.getHost() != null
                    && configuredUri.getHost().equalsIgnoreCase(
                            gatewayUri.getHost()
                    );

        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private String value(Map<?, ?> response, String key) {
        Object result = response.get(key);
        return result == null ? "" : result.toString();
    }

    private PaymentInitiateResponse toResponse(Payment payment) {
        return new PaymentInitiateResponse(
                payment.getTransactionId(),
                payment.getAmount(),
                payment.getCurrency(),
                payment.getGatewayPageUrl(),
                payment.getStatus()
        );
    }
}