package com.khaidai.backend.controller;

import com.khaidai.backend.dto.InventoryOverviewResponse;
import com.khaidai.backend.dto.InventoryRequests;

import com.khaidai.backend.service.InventoryService;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/inventory")
@CrossOrigin(
    originPatterns = {
        "http://localhost:*",
        "http://127.0.0.1:*",
        "http://192.168.*:*",
        "http://10.*:*",
        "http://172.*:*"
    }
)
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    public InventoryOverviewResponse getOverview(
            @RequestHeader(
                    value = "X-Admin-Key",
                    required = false
            )
            String adminKey
    ) {
        return inventoryService.getOverview(adminKey);
    }

    @PostMapping("/ingredients")
    public InventoryOverviewResponse createIngredient(
            @RequestHeader(
                    value = "X-Admin-Key",
                    required = false
            )
            String adminKey,

            @RequestBody
            InventoryRequests.CreateIngredientRequest request
    ) {

        inventoryService.createIngredient(request, adminKey);

        return inventoryService.getOverview(adminKey);
    }

    @PatchMapping("/ingredients/{id}")
    public InventoryOverviewResponse updateIngredient(
            @PathVariable Long id,

            @RequestHeader(
                    value = "X-Admin-Key",
                    required = false
            )
            String adminKey,

            @RequestBody
            InventoryRequests.UpdateIngredientRequest request
    ) {

        inventoryService.updateIngredient(id, request, adminKey);

        return inventoryService.getOverview(adminKey);
    }

    @PostMapping("/ingredients/{id}/movements")
    public InventoryOverviewResponse recordMovement(
            @PathVariable Long id,

            @RequestHeader(
                    value = "X-Admin-Key",
                    required = false
            )
            String adminKey,

            @RequestBody
            InventoryRequests.StockMovementRequest request
    ) {

        inventoryService.recordMovement(id, request, adminKey);

        return inventoryService.getOverview(adminKey);
    }
}