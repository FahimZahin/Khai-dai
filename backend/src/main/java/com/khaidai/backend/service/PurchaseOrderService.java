package com.khaidai.backend.service;

import com.khaidai.backend.dto.PurchasingOverviewResponse;
import com.khaidai.backend.dto.PurchasingRequests;
import com.khaidai.backend.entity.*;
import com.khaidai.backend.repository.InventoryIngredientRepository;
import com.khaidai.backend.repository.PurchaseOrderRepository;
import com.khaidai.backend.repository.StockMovementRepository;
import com.khaidai.backend.repository.SupplierRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class PurchaseOrderService {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Dhaka");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final SupplierRepository supplierRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final InventoryIngredientRepository ingredientRepository;
    private final StockMovementRepository movementRepository;

    @Value("${khaidai.admin.api-key:}")
    private String configuredAdminKey;

    public PurchaseOrderService(
            SupplierRepository supplierRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            InventoryIngredientRepository ingredientRepository,
            StockMovementRepository movementRepository
    ) {
        this.supplierRepository = supplierRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.ingredientRepository = ingredientRepository;
        this.movementRepository = movementRepository;
    }

    @Transactional(readOnly = true)
    public PurchasingOverviewResponse getOverview(String adminKey) {
        validateAdminKey(adminKey);

        List<PurchasingOverviewResponse.SupplierRow> suppliers =
                supplierRepository.findAllByOrderByNameAsc().stream()
                        .map(this::toSupplierRow)
                        .toList();

        List<PurchasingOverviewResponse.IngredientOption> ingredients =
                ingredientRepository.findAllByOrderByNameAsc().stream()
                        .filter(InventoryIngredient::isActive)
                        .map(ingredient -> new PurchasingOverviewResponse.IngredientOption(
                                ingredient.getId(),
                                ingredient.getName(),
                                ingredient.getUnit(),
                                ingredient.getCurrentStock()
                        ))
                        .toList();

        List<PurchasingOverviewResponse.PurchaseOrderRow> orders =
                purchaseOrderRepository.findAllByOrderByCreatedAtDesc().stream()
                        .map(this::toPurchaseOrderRow)
                        .toList();

        return new PurchasingOverviewResponse(suppliers, ingredients, orders);
    }

    @Transactional
    public void createSupplier(PurchasingRequests.SupplierRequest request, String adminKey) {
        validateAdminKey(adminKey);
        if (request == null) throw badRequest("Supplier information is required.");

        String name = requiredText(request.name(), "Supplier name", 120);
        if (supplierRepository.findByNameIgnoreCase(name).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A supplier with this name already exists.");
        }

        Supplier supplier = new Supplier();
        applySupplierFields(supplier, request, name);
        supplier.setActive(request.active() == null || request.active());
        supplierRepository.save(supplier);
    }

    @Transactional
    public void updateSupplier(Long id, PurchasingRequests.SupplierRequest request, String adminKey) {
        validateAdminKey(adminKey);
        if (request == null) throw badRequest("Supplier update information is required.");

        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found."));

        if (request.name() != null) {
            String name = requiredText(request.name(), "Supplier name", 120);
            supplierRepository.findByNameIgnoreCase(name)
                    .filter(existing -> !existing.getId().equals(id))
                    .ifPresent(existing -> {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "Another supplier already uses this name.");
                    });
            supplier.setName(name);
        }
        if (request.contactPerson() != null) supplier.setContactPerson(optionalText(request.contactPerson(), "Contact person", 100));
        if (request.phone() != null) supplier.setPhone(optionalText(request.phone(), "Phone", 30));
        if (request.email() != null) supplier.setEmail(validateEmail(optionalText(request.email(), "Email", 120)));
        if (request.address() != null) supplier.setAddress(optionalText(request.address(), "Address", 250));
        if (request.notes() != null) supplier.setNotes(optionalText(request.notes(), "Supplier notes", 500));
        if (request.active() != null) supplier.setActive(request.active());
        supplierRepository.save(supplier);
    }

    @Transactional
    public void createPurchaseOrder(PurchasingRequests.CreatePurchaseOrderRequest request, String adminKey) {
        validateAdminKey(adminKey);
        if (request == null) throw badRequest("Purchase order information is required.");
        if (request.supplierId() == null) throw badRequest("Select a supplier.");
        if (request.items() == null || request.items().isEmpty()) throw badRequest("Add at least one ingredient to the purchase order.");
        if (request.items().size() > 50) throw badRequest("A purchase order cannot contain more than 50 lines.");

        Supplier supplier = supplierRepository.findById(request.supplierId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found."));
        if (!supplier.isActive()) throw badRequest("This supplier is inactive.");

        Set<Long> ingredientIds = new HashSet<>();
        for (PurchasingRequests.PurchaseOrderItemRequest line : request.items()) {
            if (line == null || line.ingredientId() == null) throw badRequest("Every purchase order line must have an ingredient.");
            if (!ingredientIds.add(line.ingredientId())) throw badRequest("An ingredient can only appear once in a purchase order.");
        }

        Map<Long, InventoryIngredient> lockedIngredients = new HashMap<>();
        ingredientIds.stream().sorted().forEach(id -> {
            InventoryIngredient ingredient = ingredientRepository.findByIdForUpdate(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "An ingredient in this purchase order was not found."));
            if (!ingredient.isActive()) throw badRequest("Inactive ingredients cannot be ordered.");
            lockedIngredients.put(id, ingredient);
        });

        PurchaseOrder order = new PurchaseOrder();
        order.setPoNumber(generatePurchaseOrderNumber());
        order.setSupplier(supplier);
        order.setStatus(PurchaseOrderStatus.ORDERED);
        order.setOrderedAt(Instant.now());
        order.setNotes(optionalText(request.notes(), "Purchase order notes", 500));

        for (PurchasingRequests.PurchaseOrderItemRequest line : request.items()) {
            BigDecimal quantity = positiveQuantity(line.quantity(), "Ordered quantity");
            BigDecimal unitCost = nonNegativeMoney(line.unitCost(), "Unit cost");
            order.addItem(new PurchaseOrderItem(
                    lockedIngredients.get(line.ingredientId()), quantity, unitCost
            ));
        }

        purchaseOrderRepository.saveAndFlush(order);
    }

    @Transactional
    public void receivePurchaseOrder(
            Long id,
            PurchasingRequests.ReceivePurchaseOrderRequest request,
            String adminKey
    ) {
        validateAdminKey(adminKey);
        if (request == null || request.items() == null || request.items().isEmpty()) {
            throw badRequest("Enter at least one received quantity.");
        }

        PurchaseOrder order = purchaseOrderRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase order not found."));
        if (order.getStatus() == PurchaseOrderStatus.CANCELLED) throw badRequest("A cancelled purchase order cannot receive stock.");
        if (order.getStatus() == PurchaseOrderStatus.RECEIVED) throw badRequest("This purchase order has already been fully received.");

        Map<Long, PurchaseOrderItem> orderItems = new HashMap<>();
        for (PurchaseOrderItem item : order.getItems()) orderItems.put(item.getId(), item);

        Set<Long> seenItemIds = new HashSet<>();
        List<ReceiveLine> receiveLines = new ArrayList<>();
        for (PurchasingRequests.ReceiveItemRequest line : request.items()) {
            if (line == null || line.purchaseOrderItemId() == null) throw badRequest("A purchase order item is missing.");
            if (!seenItemIds.add(line.purchaseOrderItemId())) throw badRequest("A purchase order item can only be received once per submission.");
            PurchaseOrderItem item = orderItems.get(line.purchaseOrderItemId());
            if (item == null) throw badRequest("A selected item does not belong to this purchase order.");
            BigDecimal quantity = positiveQuantity(line.quantity(), "Received quantity");
            if (quantity.compareTo(item.getRemainingQuantity()) > 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Received quantity exceeds the remaining quantity for " + item.getIngredient().getName() + ".");
            }
            receiveLines.add(new ReceiveLine(item, quantity));
        }

        receiveLines.sort(Comparator.comparing((ReceiveLine line) -> line.item().getIngredient().getId()));
        String reference = "PO-" + order.getPoNumber() + "-RCV-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String extraNote = optionalText(request.note(), "Receiving note", 150);

        for (ReceiveLine line : receiveLines) {
            PurchaseOrderItem item = line.item();
            InventoryIngredient ingredient = ingredientRepository.findByIdForUpdate(item.getIngredient().getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "An ingredient for this purchase order was not found."));

            BigDecimal newBalance = ingredient.getCurrentStock().add(line.quantity());
            ingredient.setCurrentStock(newBalance);
            ingredientRepository.save(ingredient);

            item.setQuantityReceived(item.getQuantityReceived().add(line.quantity()));
            String movementNote = "Purchase order " + order.getPoNumber() + " received";
            if (extraNote != null) movementNote += ": " + extraNote;

            movementRepository.save(new StockMovement(
                    ingredient,
                    StockMovementType.STOCK_IN,
                    line.quantity(),
                    newBalance,
                    movementNote,
                    reference
            ));
        }

        boolean fullyReceived = order.getItems().stream().allMatch(item ->
                item.getQuantityReceived().compareTo(item.getQuantityOrdered()) >= 0
        );
        order.setStatus(fullyReceived ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED);
        if (fullyReceived) order.setReceivedAt(Instant.now());
        purchaseOrderRepository.save(order);
    }

    @Transactional
    public void cancelPurchaseOrder(Long id, String adminKey) {
        validateAdminKey(adminKey);
        PurchaseOrder order = purchaseOrderRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase order not found."));
        if (order.getStatus() == PurchaseOrderStatus.RECEIVED || order.getStatus() == PurchaseOrderStatus.CANCELLED) {
            throw badRequest("This purchase order cannot be cancelled.");
        }
        order.setStatus(PurchaseOrderStatus.CANCELLED);
        purchaseOrderRepository.save(order);
    }

    private PurchasingOverviewResponse.SupplierRow toSupplierRow(Supplier supplier) {
        return new PurchasingOverviewResponse.SupplierRow(
                supplier.getId(), supplier.getName(), supplier.getContactPerson(),
                supplier.getPhone(), supplier.getEmail(), supplier.getAddress(),
                supplier.getNotes(), supplier.isActive(), supplier.getCreatedAt(), supplier.getUpdatedAt()
        );
    }

    private PurchasingOverviewResponse.PurchaseOrderRow toPurchaseOrderRow(PurchaseOrder order) {
        List<PurchasingOverviewResponse.ItemRow> items = order.getItems().stream()
                .map(item -> new PurchasingOverviewResponse.ItemRow(
                        item.getId(), item.getIngredient().getId(), item.getIngredient().getName(),
                        item.getIngredient().getUnit(), item.getQuantityOrdered(),
                        item.getQuantityReceived(), item.getRemainingQuantity(),
                        item.getUnitCost(), item.getLineTotal()
                ))
                .toList();

        return new PurchasingOverviewResponse.PurchaseOrderRow(
                order.getId(), order.getPoNumber(), order.getSupplier().getId(),
                order.getSupplier().getName(), order.getStatus().name(), order.getNotes(),
                order.getCreatedAt(), order.getOrderedAt(), order.getReceivedAt(),
                order.getTotalAmount(), items
        );
    }

    private String generatePurchaseOrderNumber() {
        String date = LocalDate.now(BUSINESS_ZONE).format(DateTimeFormatter.BASIC_ISO_DATE);
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
        return "PO-" + date + "-" + suffix;
    }

    private void applySupplierFields(Supplier supplier, PurchasingRequests.SupplierRequest request, String name) {
        supplier.setName(name);
        supplier.setContactPerson(optionalText(request.contactPerson(), "Contact person", 100));
        supplier.setPhone(optionalText(request.phone(), "Phone", 30));
        supplier.setEmail(validateEmail(optionalText(request.email(), "Email", 120)));
        supplier.setAddress(optionalText(request.address(), "Address", 250));
        supplier.setNotes(optionalText(request.notes(), "Supplier notes", 500));
    }

    private String validateEmail(String email) {
        if (email != null && !EMAIL_PATTERN.matcher(email).matches()) throw badRequest("Enter a valid supplier email address.");
        return email;
    }

    private String requiredText(String value, String field, int maxLength) {
        if (value == null || value.isBlank()) throw badRequest(field + " is required.");
        String result = value.trim();
        if (result.length() > maxLength) throw badRequest(field + " cannot exceed " + maxLength + " characters.");
        return result;
    }

    private String optionalText(String value, String field, int maxLength) {
        if (value == null || value.isBlank()) return null;
        String result = value.trim();
        if (result.length() > maxLength) throw badRequest(field + " cannot exceed " + maxLength + " characters.");
        return result;
    }

    private BigDecimal positiveQuantity(BigDecimal value, String field) {
        if (value == null || value.compareTo(BigDecimal.ZERO) <= 0) throw badRequest(field + " must be greater than zero.");
        try {
            BigDecimal normalized = value.setScale(3, RoundingMode.UNNECESSARY);
            if (normalized.precision() > 14) throw badRequest(field + " is too large.");
            return normalized;
        } catch (ArithmeticException exception) {
            throw badRequest(field + " supports a maximum of 3 decimal places.");
        }
    }

    private BigDecimal nonNegativeMoney(BigDecimal value, String field) {
        if (value == null || value.compareTo(BigDecimal.ZERO) < 0) throw badRequest(field + " cannot be negative.");
        try {
            BigDecimal normalized = value.setScale(2, RoundingMode.UNNECESSARY);
            if (normalized.precision() > 12) throw badRequest(field + " is too large.");
            return normalized;
        } catch (ArithmeticException exception) {
            throw badRequest(field + " supports a maximum of 2 decimal places.");
        }
    }

    private void validateAdminKey(String providedKey) {
        if (configuredAdminKey == null || configuredAdminKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Admin API key is not configured.");
        }
        if (providedKey == null || !MessageDigest.isEqual(
                configuredAdminKey.getBytes(StandardCharsets.UTF_8),
                providedKey.getBytes(StandardCharsets.UTF_8)
        )) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid administrator key.");
        }
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private record ReceiveLine(PurchaseOrderItem item, BigDecimal quantity) { }
}
