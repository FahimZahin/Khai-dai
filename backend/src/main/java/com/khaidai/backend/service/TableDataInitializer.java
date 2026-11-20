
package com.khaidai.backend.service;

import com.khaidai.backend.entity.RestaurantTable;
import com.khaidai.backend.repository.TableRepository;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.Base64;

@Component
public class TableDataInitializer implements ApplicationRunner {

    private final TableRepository tableRepository;

    private static final SecureRandom SECURE_RANDOM =
            new SecureRandom();

    public TableDataInitializer(
            TableRepository tableRepository
    ) {
        this.tableRepository = tableRepository;
    }

    @Override
    public void run(ApplicationArguments args) {

        System.out.println(
                "Checking Khai-Dai restaurant tables..."
        );

        for (int tableNumber = 1; tableNumber <= 8; tableNumber++) {

            if (!tableRepository.existsByTableNumber(tableNumber)) {

                String token = generateSecureToken();

                RestaurantTable table = new RestaurantTable(
                        tableNumber,
                        token
                );

                tableRepository.save(table);

                System.out.println(
                        "Created restaurant table: " + tableNumber
                );
            }
        }

        System.out.println(
                "Khai-Dai table initialization completed."
        );
    }

    // Generate a cryptographically secure random token
    private String generateSecureToken() {

        byte[] randomBytes = new byte[32];

        SECURE_RANDOM.nextBytes(randomBytes);

        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(randomBytes);
    }
}
