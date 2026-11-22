
package com.khaidai.backend.controller;

import com.khaidai.backend.dto.TableQrAdminResponse;
import com.khaidai.backend.service.TableAdminService;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/tables")
@CrossOrigin(
        originPatterns = {
                "http://localhost:*",
                "http://127.0.0.1:*"
        }
)
public class TableAdminController {

    private final TableAdminService tableAdminService;

    public TableAdminController(
            TableAdminService tableAdminService
    ) {
        this.tableAdminService = tableAdminService;
    }

    @GetMapping("/qr")
    public List<TableQrAdminResponse> getQrCodes(
            @RequestHeader(
                    value = "X-Admin-Key",
                    required = false
            )
            String adminKey
    ) {

        return tableAdminService.getAllQrCodes(adminKey);
    }
}
