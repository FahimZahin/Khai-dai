package com.khaidai.backend.controller;

import com.khaidai.backend.dto.PurchasingOverviewResponse;
import com.khaidai.backend.dto.PurchasingRequests;
import com.khaidai.backend.service.PurchaseOrderService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/purchasing")
@CrossOrigin(
        originPatterns = {
                "http://localhost:*",
                "http://127.0.0.1:*",
                "http://192.168.*:*",
                "http://10.*:*",
                "http://172.*:*"
        }
)
public class PurchasingController {

    private final PurchaseOrderService purchasingService;

    public PurchasingController(PurchaseOrderService purchasingService) {
        this.purchasingService = purchasingService;
    }

    @GetMapping
    public PurchasingOverviewResponse getOverview(
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey
    ) {
        return purchasingService.getOverview(adminKey);
    }

    @PostMapping("/suppliers")
    public PurchasingOverviewResponse createSupplier(
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @RequestBody PurchasingRequests.SupplierRequest request
    ) {
        purchasingService.createSupplier(request, adminKey);
        return purchasingService.getOverview(adminKey);
    }

    @PatchMapping("/suppliers/{id}")
    public PurchasingOverviewResponse updateSupplier(
            @PathVariable Long id,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @RequestBody PurchasingRequests.SupplierRequest request
    ) {
        purchasingService.updateSupplier(id, request, adminKey);
        return purchasingService.getOverview(adminKey);
    }

    @PostMapping("/purchase-orders")
    public PurchasingOverviewResponse createPurchaseOrder(
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @RequestBody PurchasingRequests.CreatePurchaseOrderRequest request
    ) {
        purchasingService.createPurchaseOrder(request, adminKey);
        return purchasingService.getOverview(adminKey);
    }

    @PostMapping("/purchase-orders/{id}/receive")
    public PurchasingOverviewResponse receivePurchaseOrder(
            @PathVariable Long id,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @RequestBody PurchasingRequests.ReceivePurchaseOrderRequest request
    ) {
        purchasingService.receivePurchaseOrder(id, request, adminKey);
        return purchasingService.getOverview(adminKey);
    }

    @PostMapping("/purchase-orders/{id}/cancel")
    public PurchasingOverviewResponse cancelPurchaseOrder(
            @PathVariable Long id,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey
    ) {
        purchasingService.cancelPurchaseOrder(id, adminKey);
        return purchasingService.getOverview(adminKey);
    }
}
