
package com.khaidai.backend.service;

import com.khaidai.backend.dto.TableQrAdminResponse;
import com.khaidai.backend.repository.TableRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

@Service
public class TableAdminService {

    private final TableRepository tableRepository;

    @Value("${khaidai.admin.api-key:}")
    private String configuredAdminKey;

    public TableAdminService(TableRepository tableRepository) {
        this.tableRepository = tableRepository;
    }

    public List<TableQrAdminResponse> getAllQrCodes(
            String providedAdminKey
    ) {

        validateAdminKey(providedAdminKey);

        return tableRepository
                .findAllByOrderByTableNumberAsc()
                .stream()
                .map(table -> new TableQrAdminResponse(
                        table.getId(),
                        table.getTableNumber(),
                        table.getQrToken(),
                        table.isActive()
                ))
                .toList();
    }

    private void validateAdminKey(String providedAdminKey) {

        if (configuredAdminKey == null ||
                configuredAdminKey.isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Admin API key is not configured."
            );
        }

        if (providedAdminKey == null ||
                !MessageDigest.isEqual(
                        configuredAdminKey.getBytes(
                                StandardCharsets.UTF_8
                        ),
                        providedAdminKey.getBytes(
                                StandardCharsets.UTF_8
                        )
                )) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid admin API key."
            );
        }
    }
}
