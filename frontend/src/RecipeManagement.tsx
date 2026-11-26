import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import "./RecipeManagement.css";

const API_BASE_URL =
  `${window.location.protocol}//${window.location.hostname}:8090`;

type MenuItem = {
  id: number;
  name: string;
  price: number | string;
};

type Ingredient = {
  id: number;
  name: string;
  unit: string;
  currentStock: number | string;
};

type RecipeRow = {
  id: number;
  foodId: number;
  foodName: string;
  ingredientId: number;
  ingredientName: string;
  unit: string;
  currentStock: number | string;
  quantityPerServing: number | string;
  ingredientActive: boolean;
};

type RecipeData = {
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  recipes: RecipeRow[];
};

type Props = {
  adminKey: string;
};

function formatQuantity(value: number | string): string {
  return Number(value).toLocaleString("en-BD", {
    maximumFractionDigits: 3,
  });
}

async function getErrorMessage(response: Response): Promise<string> {
  const body = await response.text();

  if (!body) {
    return `Server error: ${response.status}`;
  }

  try {
    const data = JSON.parse(body);

    return (
      data.message ||
      data.detail ||
      data.error ||
      `Server error: ${response.status}`
    );
  } catch {
    return body;
  }
}

export default function RecipeManagement({ adminKey }: Props) {

  const [data, setData] = useState<RecipeData | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [selectedFoodId, setSelectedFoodId] = useState("");
  const [ingredientId, setIngredientId] = useState("");
  const [quantity, setQuantity] = useState("");

  const [quantityDrafts, setQuantityDrafts] =
    useState<Record<number, string>>({});

  // ==========================================
  // LOAD RECIPE DATA
  // ==========================================

  const loadRecipes = useCallback(async () => {

    setLoading(true);
    setError("");

    try {

      const response = await fetch(
        `${API_BASE_URL}/api/admin/recipes`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "X-Admin-Key": adminKey,
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const result: RecipeData = await response.json();

      if (
        !Array.isArray(result.menuItems) ||
        !Array.isArray(result.ingredients) ||
        !Array.isArray(result.recipes)
      ) {
        throw new Error("Invalid recipe data received from server.");
      }

      setData(result);

      setSelectedFoodId((current) =>
        current || String(result.menuItems[0]?.id ?? "")
      );

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load recipes."
      );

    } finally {

      setLoading(false);
    }

  }, [adminKey]);

  useEffect(() => {
    void loadRecipes();
  }, [loadRecipes]);

  // ==========================================
  // SELECTED MENU ITEM
  // ==========================================

  const selectedFood = data?.menuItems.find(
    (food) => food.id === Number(selectedFoodId)
  );

  const selectedRecipes = useMemo(
    () =>
      (data?.recipes ?? []).filter(
        (recipe) => recipe.foodId === Number(selectedFoodId)
      ),
    [data, selectedFoodId]
  );

  const availableIngredients = useMemo(
    () =>
      (data?.ingredients ?? []).filter(
        (ingredient) =>
          !selectedRecipes.some(
            (recipe) => recipe.ingredientId === ingredient.id
          )
      ),
    [data, selectedRecipes]
  );

  const configuredMenuItems = new Set(
    (data?.recipes ?? []).map((recipe) => recipe.foodId)
  ).size;

  // ==========================================
  // ADD INGREDIENT TO RECIPE
  // ==========================================

  const handleAddIngredient = async (
    event: FormEvent<HTMLFormElement>
  ) => {

    event.preventDefault();

    const amount = Number(quantity);

    if (!selectedFoodId || !ingredientId) {
      setError("Select a menu item and an ingredient.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid quantity greater than zero.");
      return;
    }

    setSaving(true);
    setError("");

    try {

      const response = await fetch(
        `${API_BASE_URL}/api/admin/recipes/foods/${selectedFoodId}/ingredients`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Key": adminKey,
          },
          body: JSON.stringify({
            ingredientId: Number(ingredientId),
            quantityPerServing: amount,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setIngredientId("");
      setQuantity("");

      await loadRecipes();

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to add recipe ingredient."
      );

    } finally {

      setSaving(false);
    }
  };

  // ==========================================
  // UPDATE RECIPE QUANTITY
  // ==========================================

  const handleUpdateQuantity = async (recipe: RecipeRow) => {

    const amount = Number(
      quantityDrafts[recipe.id] ??
      recipe.quantityPerServing
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    setSaving(true);
    setError("");

    try {

      const response = await fetch(
        `${API_BASE_URL}/api/admin/recipes/${recipe.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Key": adminKey,
          },
          body: JSON.stringify({
            quantityPerServing: amount,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      await loadRecipes();

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update recipe quantity."
      );

    } finally {

      setSaving(false);
    }
  };

  // ==========================================
  // REMOVE INGREDIENT
  // ==========================================

  const handleRemoveIngredient = async (recipe: RecipeRow) => {

    const confirmed = window.confirm(
      `Remove ${recipe.ingredientName} from ${recipe.foodName}?`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {

      const response = await fetch(
        `${API_BASE_URL}/api/admin/recipes/${recipe.id}`,
        {
          method: "DELETE",
          headers: {
            "X-Admin-Key": adminKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      await loadRecipes();

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to remove recipe ingredient."
      );

    } finally {

      setSaving(false);
    }
  };

  // ==========================================
  // USER INTERFACE
  // ==========================================

  return (

    <section className="recipe-page">

      <div className="recipe-heading">

        <div>
          <span className="manager-eyebrow">
            MENU PRODUCTION CONTROL
          </span>

          <h2>Recipe Management</h2>

          <p>
            Define the ingredients and quantities required
            to prepare each menu item.
          </p>
        </div>

        <button
          type="button"
          className="manager-refresh-button"
          onClick={() => void loadRecipes()}
          disabled={loading || saving}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>

      </div>

      {error && (
        <div className="manager-error">
          {error}
        </div>
      )}

      {/* SUMMARY */}

      <section className="recipe-summary">

        <article className="recipe-summary-card">
          <span>Menu items</span>
          <strong>{data?.menuItems.length ?? 0}</strong>
        </article>

        <article className="recipe-summary-card">
          <span>Configured recipes</span>
          <strong>{configuredMenuItems}</strong>
        </article>

        <article className="recipe-summary-card">
          <span>Recipe ingredients</span>
          <strong>{data?.recipes.length ?? 0}</strong>
        </article>

      </section>

      {/* ADD RECIPE INGREDIENT */}

      <section className="recipe-panel">

        <div className="recipe-panel-heading">
          <div>
            <span className="manager-eyebrow">
              RECIPE BUILDER
            </span>

            <h3>Add ingredients to a dish</h3>

            <p>
              Choose a dish, select an inventory ingredient
              and enter the quantity required for one serving.
            </p>
          </div>
        </div>

        <form
          className="recipe-add-form"
          onSubmit={handleAddIngredient}
        >

          <div>
            <label htmlFor="recipe-food">
              Select menu item
            </label>

            <select
              id="recipe-food"
              value={selectedFoodId}
              onChange={(event) => {
                setSelectedFoodId(event.target.value);
                setIngredientId("");
              }}
              required
            >
              <option value="">Choose a dish</option>

              {(data?.menuItems ?? []).map((food) => (
                <option key={food.id} value={food.id}>
                  {food.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="recipe-ingredient">
              Select ingredient
            </label>

            <select
              id="recipe-ingredient"
              value={ingredientId}
              onChange={(event) => setIngredientId(event.target.value)}
              disabled={!selectedFoodId || availableIngredients.length === 0}
              required
            >
              <option value="">Choose an ingredient</option>

              {availableIngredients.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name} ({ingredient.unit})
                </option>
              ))}
            </select>

            {data && data.ingredients.length === 0 && (
              <small>
                No active ingredients. Add ingredients in Inventory first.
              </small>
            )}

            {data &&
              data.ingredients.length > 0 &&
              availableIngredients.length === 0 &&
              selectedFoodId && (
                <small>
                  All available ingredients are already in this recipe.
                </small>
              )}
          </div>

          <div>
            <label htmlFor="recipe-quantity">
              Quantity per serving
            </label>

            <input
              id="recipe-quantity"
              type="number"
              min="0.001"
              step="0.001"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="e.g. 250"
              required
            />

            <small>
              Use the same unit as the inventory ingredient.
            </small>
          </div>

          <button
            type="submit"
            className="manager-primary-button"
            disabled={
              saving ||
              loading ||
              !selectedFoodId ||
              !ingredientId ||
              !quantity
            }
          >
            {saving ? "Saving..." : "+ Add ingredient"}
          </button>

        </form>

      </section>

      {/* CURRENT RECIPE */}

      <section className="recipe-panel">

        <div className="recipe-panel-heading">

          <div>
            <span className="manager-eyebrow">
              RECIPE DETAILS
            </span>

            <h3>
              {selectedFood
                ? selectedFood.name
                : "Select a menu item"}
            </h3>

            <p>
              Each quantity represents one serving.
            </p>
          </div>

          <span className="recipe-count">
            {selectedRecipes.length} ingredients
          </span>

        </div>

        {loading && !data ? (

          <div className="recipe-empty">
            Loading recipes...
          </div>

        ) : selectedRecipes.length === 0 ? (

          <div className="recipe-empty">
            <h4>No recipe ingredients yet</h4>

            <p>
              Select ingredients above to create this dish's recipe.
            </p>
          </div>

        ) : (

          <div className="recipe-table-wrapper">

            <table className="recipe-table">

              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Available stock</th>
                  <th>Quantity per serving</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {selectedRecipes.map((recipe) => (

                  <tr key={recipe.id}>

                    <td>
                      <strong>{recipe.ingredientName}</strong>

                      {!recipe.ingredientActive && (
                        <small className="recipe-inactive">
                          Inactive ingredient
                        </small>
                      )}
                    </td>

                    <td>
                      {formatQuantity(recipe.currentStock)}
                      {" "}{recipe.unit}
                    </td>

                    <td>
                      <div className="recipe-quantity-control">

                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={
                            quantityDrafts[recipe.id] ??
                            String(recipe.quantityPerServing)
                          }
                          onChange={(event) =>
                            setQuantityDrafts((previous) => ({
                              ...previous,
                              [recipe.id]: event.target.value,
                            }))
                          }
                          disabled={saving}
                        />

                        <span>{recipe.unit}</span>

                      </div>
                    </td>

                    <td>
                      <div className="recipe-actions">

                        <button
                          type="button"
                          className="recipe-save-button"
                          onClick={() => void handleUpdateQuantity(recipe)}
                          disabled={saving || !recipe.ingredientActive}
                        >
                          Save
                        </button>

                        <button
                          type="button"
                          className="recipe-remove-button"
                          onClick={() => void handleRemoveIngredient(recipe)}
                          disabled={saving}
                        >
                          Remove
                        </button>

                      </div>
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </section>

      <div className="recipe-information">
        <strong>Recipe measurement:</strong>

        <p>
          Enter quantities using the same units configured in Inventory.
          For example, if rice is measured in kilograms, enter 0.250
          for 250 grams only if you convert your inventory unit to kg.
        </p>

        <p>
          Recipe setup does not change current inventory stock.
        </p>
      </div>

    </section>
  );
}