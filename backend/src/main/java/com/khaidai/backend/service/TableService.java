
package com.khaidai.backend.service;

import com.khaidai.backend.dto.TableResponse;
import com.khaidai.backend.dto.TableValidationResponse;
import com.khaidai.backend.entity.RestaurantTable;
import com.khaidai.backend.repository.TableRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class TableService {

    private final TableRepository tableRepository;

    public TableService(TableRepository tableRepository) {
        this.tableRepository = tableRepository;
    }

    // Get all restaurant tables
    public List<TableResponse> getAllTables() {

        return tableRepository.findAllByOrderByTableNumberAsc()
                .stream()
                .map(table -> new TableResponse(
                        table.getId(),
                        table.getTableNumber(),
                        table.isActive()
                ))
                .toList();
    }

    // Validate QR token
    public TableValidationResponse validateQrToken(String token) {

        RestaurantTable table = tableRepository
                .findByQrTokenAndActiveTrue(token)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Invalid or inactive table QR code."
                        )
                );

        return new TableValidationResponse(
                true,
                table.getTableNumber(),
                "Table verified successfully."
        );
    }
}
