package com.khaidai.backend.service;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;

public final class MenuCatalog {

    private MenuCatalog() {
    }

    public record Addon(
            String id,
            String name,
            BigDecimal price
    ) {
    }

    public record FoodItem(
            Integer id,
            String name,
            BigDecimal price,
            Integer preparationTimeMinutes,
            Set<String> spiceOptions,
            Map<String, Addon> addons
    ) {
    }

    private static final Set<String> ALL_SPICE_LEVELS = Set.of(
            "Not Spicy",
            "Mild",
            "Medium",
            "Hot"
    );

    private static BigDecimal money(String value) {
        return new BigDecimal(value);
    }

    private static final Map<Integer, FoodItem> FOODS = Map.of(

        1, new FoodItem(
            1,
            "Chicken Biryani",
            money("320.00"),
            25,
            ALL_SPICE_LEVELS,
            Map.of(
                "extra-chicken", new Addon(
                    "extra-chicken", "Extra chicken", money("120")
                ),
                "boiled-egg", new Addon(
                    "boiled-egg", "Boiled egg", money("25")
                ),
                "extra-rice", new Addon(
                    "extra-rice", "Extra rice", money("60")
                ),
                "raita", new Addon(
                    "raita", "Extra raita", money("30")
                )
            )
        ),

        2, new FoodItem(
            2,
            "Beef Burger",
            money("280.00"),
            15,
            ALL_SPICE_LEVELS,
            Map.of(
                "extra-cheese", new Addon(
                    "extra-cheese", "Extra cheese", money("40")
                ),
                "extra-patty", new Addon(
                    "extra-patty", "Extra beef patty", money("120")
                ),
                "jalapenos", new Addon(
                    "jalapenos", "Jalapeños", money("25")
                ),
                "extra-sauce", new Addon(
                    "extra-sauce", "Extra sauce", money("20")
                )
            )
        ),

        3, new FoodItem(
            3,
            "Chicken Pasta",
            money("350.00"),
            20,
            ALL_SPICE_LEVELS,
            Map.of(
                "extra-chicken", new Addon(
                    "extra-chicken", "Extra chicken", money("100")
                ),
                "extra-cheese", new Addon(
                    "extra-cheese", "Extra cheese", money("40")
                ),
                "mushrooms", new Addon(
                    "mushrooms", "Mushrooms", money("50")
                ),
                "garlic-bread", new Addon(
                    "garlic-bread", "Garlic bread", money("60")
                )
            )
        ),

        4, new FoodItem(
            4,
            "Grilled Chicken",
            money("420.00"),
            30,
            ALL_SPICE_LEVELS,
            Map.of(
                "extra-chicken", new Addon(
                    "extra-chicken",
                    "Extra chicken portion",
                    money("150")
                ),
                "extra-vegetables", new Addon(
                    "extra-vegetables",
                    "Extra vegetables",
                    money("50")
                ),
                "mashed-potatoes", new Addon(
                    "mashed-potatoes",
                    "Mashed potatoes",
                    money("60")
                ),
                "extra-sauce", new Addon(
                    "extra-sauce", "Extra sauce", money("25")
                )
            )
        ),

        5, new FoodItem(
            5,
            "French Fries",
            money("150.00"),
            10,
            ALL_SPICE_LEVELS,
            Map.of(
                "extra-fries", new Addon(
                    "extra-fries", "Extra fries", money("80")
                ),
                "cheese-dip", new Addon(
                    "cheese-dip", "Cheese dip", money("30")
                ),
                "spicy-seasoning", new Addon(
                    "spicy-seasoning",
                    "Spicy seasoning",
                    money("15")
                )
            )
        ),

        6, new FoodItem(
            6,
            "Fresh Lemonade",
            money("100.00"),
            5,
            Set.of("Not Spicy"),
            Map.of(
                "extra-lemon", new Addon(
                    "extra-lemon", "Extra lemon", money("15")
                ),
                "extra-mint", new Addon(
                    "extra-mint", "Extra mint", money("10")
                ),
                "extra-sugar", new Addon(
                    "extra-sugar", "Extra sugar", money("0")
                )
            )
        )
    );

    public static java.util.List<FoodItem> all() {

        return FOODS.values().stream()
                .sorted(java.util.Comparator.comparing(FoodItem::id))
                .toList();
    }

    public static FoodItem findById(Integer foodId) {

        if (foodId == null) {
            return null;
        }

        return FOODS.get(foodId);
    }
}