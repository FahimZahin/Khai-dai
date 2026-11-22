
package com.khaidai.backend.dto;

public record TableQrAdminResponse(
        Long id,
        Integer tableNumber,
        String qrToken,
        boolean active
) {
}
