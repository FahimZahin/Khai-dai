
package com.khaidai.backend.controller;

import com.khaidai.backend.dto.TableResponse;
import com.khaidai.backend.dto.TableValidationResponse;
import com.khaidai.backend.service.TableService;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tables")
@CrossOrigin(origins = "http://localhost:5173")
public class TableController {

    private final TableService tableService;

    public TableController(TableService tableService) {
        this.tableService = tableService;
    }

    // GET all restaurant tables
    @GetMapping
    public List<TableResponse> getAllTables() {

        return tableService.getAllTables();
    }

    // Validate a restaurant table QR code
    @GetMapping("/validate/{token}")
    public TableValidationResponse validateQrCode(
            @PathVariable String token
    ) {

        return tableService.validateQrToken(token);
    }
}
