package com.khaidai.backend.repository;

import com.khaidai.backend.entity.MenuRecipeIngredient;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface MenuRecipeIngredientRepository
        extends JpaRepository<MenuRecipeIngredient, Long> {

    Optional<MenuRecipeIngredient> findByFoodIdAndIngredient_Id(
            Integer foodId,
            Long ingredientId
    );

    @Query("""
        select recipe
        from MenuRecipeIngredient recipe
        join fetch recipe.ingredient ingredient
        order by recipe.foodId asc, ingredient.name asc
    """)
    List<MenuRecipeIngredient> findAllWithIngredient();
}