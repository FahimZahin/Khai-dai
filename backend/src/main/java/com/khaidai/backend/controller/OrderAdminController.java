package com.khaidai.backend.controller;

import com.khaidai.backend.dto.AdminOrderResponse;
import com.khaidai.backend.dto.UpdateOrderStatusRequest;
import com.khaidai.backend.service.OrderAdminService;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/orders")
@CrossOrigin(
        originPatterns = {
                "http://localhost:*",
                "http://127.0.0.1:*",
                "http://192.168.*:*",
                "http://10.*:*",
                "http://172.*:*"
        }
)
public class OrderAdminController {

    private final OrderAdminService orderAdminService;

    public OrderAdminController(
            OrderAdminService orderAdminService
    ) {
        this.orderAdminService = orderAdminService;
    }

    @GetMapping
    public List<AdminOrderResponse> getAllOrders(
            @RequestHeader(
                    value = "X-Admin-Key",
                    required = false
            )
            String adminKey
    ) {
        return orderAdminService.getAllOrders(adminKey);
    }

    @PatchMapping("/{orderNumber}/status")
    public AdminOrderResponse updateOrderStatus(
            @PathVariable String orderNumber,
            @RequestHeader(
                    value = "X-Admin-Key",
                    required = false
            )
            String adminKey,
            @RequestBody(required = false)
            UpdateOrderStatusRequest request
    ) {
        return orderAdminService.updateOrderStatus(
                orderNumber,
                request == null ? null : request.status(),
                adminKey
        );
    }

    @PatchMapping("/{orderNumber}/cash-payment")
    public AdminOrderResponse markCashPaymentAsPaid(
            @PathVariable String orderNumber,
            @RequestHeader(
                    value = "X-Admin-Key",
                    required = false
            )
            String adminKey
    ) {
        return orderAdminService.markCashPaymentAsPaid(
                orderNumber,
                adminKey
        );
    }
}