
package com.khaidai.backend.dto;

public record TableValidationResponse(
        boolean valid,
        Integer tableNumber,
        String message
) {
}
