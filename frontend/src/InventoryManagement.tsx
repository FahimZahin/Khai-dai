import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import "./InventoryManagement.css";

const API_BASE_URL =
  `${window.location.protocol}//${window.location.hostname}:8090`;

type Ingredient = {
  id: number;
  name: string;
  unit: string;
  currentStock: number | string;
  reorderLevel: number | string;
  active: boolean;
  lowStock: boolean;
  updatedAt: string;
};

type Movement = {
  id: number;
  ingredientId: number;
  ingredientName: string;
  unit: string;
  movementType: string;
  quantityChange: number | string;
  balanceAfter: number | string;
  note: string | null;
  createdAt: string;
};

type InventoryData = {
  ingredients: Ingredient[];
  recentMovements: Movement[];
};

type MovementAction = {
  id: number;
  name: string;
  unit: string;
  type: "STOCK_IN" | "WASTE" | "ADJUSTMENT";
};

type Props = {
  adminKey: string;
  notificationsEnabled?: boolean;
};

function formatQuantity(value: number | string): string {
  return Number(value).toLocaleString("en-BD", {
    maximumFractionDigits: 3,
  });
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
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

export default function InventoryManagement({
  adminKey,
  notificationsEnabled = false,
}: Props) {

  const [inventory, setInventory] =
    useState<InventoryData | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("kg");
  const [openingStock, setOpeningStock] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("1");

  const [movementAction, setMovementAction] =
    useState<MovementAction | null>(null);

  const [movementQuantity, setMovementQuantity] = useState("");
  const [movementNote, setMovementNote] = useState("");

  const [reorderDrafts, setReorderDrafts] =
    useState<Record<number, string>>({});

  const knownAlertIds = useRef<Set<number> | null>(null);

  const loadInventory = useCallback(async () => {

    setLoading(true);
    setError("");

    try {

      const response = await fetch(
        `${API_BASE_URL}/api/admin/inventory`,
        {
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

      const data: InventoryData = await response.json();

      const currentAlerts = data.ingredients.filter(
        (ingredient) =>
          ingredient.active &&
          (
            ingredient.lowStock ||
            Number(ingredient.currentStock) <= 0
          )
      );

      const currentAlertIds = new Set(
        currentAlerts.map((ingredient) => ingredient.id)
      );

      const previousIds = knownAlertIds.current;

      if (previousIds === null) {

        knownAlertIds.current = currentAlertIds;

      } else {

        const newlyAlerted = currentAlerts.filter(
          (ingredient) => !previousIds.has(ingredient.id)
        );

        if (
          notificationsEnabled &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {

          newlyAlerted.forEach((ingredient) => {

            const outOfStock =
              Number(ingredient.currentStock) <= 0;

            new Notification(
              outOfStock
                ? "Khai-Dai: Out of Stock!"
                : "Khai-Dai: Low Stock Alert!",
              {
                body:
                  `${ingredient.name}: ` +
                  `${ingredient.currentStock} ${ingredient.unit} remaining. ` +
                  `Reorder level: ${ingredient.reorderLevel} ${ingredient.unit}.`,
                tag: `khaidai-inventory-${ingredient.id}`,
              }
            );

          });

        }

        knownAlertIds.current = currentAlertIds;
      }

      setInventory(data);

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load inventory."
      );

    } finally {

      setLoading(false);
    }

  }, [adminKey, notificationsEnabled]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadInventory();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [loadInventory]);

  const ingredients = inventory?.ingredients ?? [];

  const activeIngredients = ingredients.filter(
    (ingredient) => ingredient.active
  );

  const lowStockCount = activeIngredients.filter(
    (ingredient) => ingredient.lowStock
  ).length;

  const outOfStockCount = activeIngredients.filter(
    (ingredient) => Number(ingredient.currentStock) <= 0
  ).length;

  const stockAlerts = activeIngredients
    .filter(
      (ingredient) =>
        ingredient.lowStock ||
        Number(ingredient.currentStock) <= 0
    )
    .sort(
      (a, b) =>
        Number(a.currentStock) - Number(b.currentStock)
    );

  // ==========================================
  // ADD INGREDIENT
  // ==========================================

  const handleAddIngredient = async (
    event: FormEvent<HTMLFormElement>
  ) => {

    event.preventDefault();

    setSaving(true);
    setError("");

    try {

      const response = await fetch(
        `${API_BASE_URL}/api/admin/inventory/ingredients`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Key": adminKey,
          },
          body: JSON.stringify({
            name,
            unit,
            openingStock: Number(openingStock),
            reorderLevel: Number(reorderLevel),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setName("");
      setOpeningStock("0");
      setReorderLevel("1");

      await loadInventory();

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to add ingredient."
      );

    } finally {

      setSaving(false);
    }
  };

  // ==========================================
  // RECORD STOCK MOVEMENT
  // ==========================================

  const handleMovement = async (
    event: FormEvent<HTMLFormElement>
  ) => {

    event.preventDefault();

    if (!movementAction) return;

    setSaving(true);
    setError("");

    try {

      const response = await fetch(
        `${API_BASE_URL}/api/admin/inventory/ingredients/${movementAction.id}/movements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Key": adminKey,
          },
          body: JSON.stringify({
            type: movementAction.type,
            quantity: Number(movementQuantity),
            note: movementNote,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setMovementAction(null);
      setMovementQuantity("");
      setMovementNote("");

      await loadInventory();

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to record stock movement."
      );

    } finally {

      setSaving(false);
    }
  };

  // ==========================================
  // UPDATE REORDER LEVEL
  // ==========================================

  const saveReorderLevel = async (ingredient: Ingredient) => {

    const value = Number(
      reorderDrafts[ingredient.id] ??
      ingredient.reorderLevel
    );

    if (!Number.isFinite(value) || value < 0) {
      setError("Reorder level must be a non-negative number.");
      return;
    }

    setSaving(true);
    setError("");

    try {

      const response = await fetch(
        `${API_BASE_URL}/api/admin/inventory/ingredients/${ingredient.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Key": adminKey,
          },
          body: JSON.stringify({
            reorderLevel: value,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      await loadInventory();

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update reorder level."
      );

    } finally {

      setSaving(false);
    }
  };

  // ==========================================
  // ACTIVATE / DEACTIVATE
  // ==========================================

  const toggleActive = async (ingredient: Ingredient) => {

    const confirmed = window.confirm(
      ingredient.active
        ? `Deactivate ${ingredient.name}?`
        : `Reactivate ${ingredient.name}?`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {

      const response = await fetch(
        `${API_BASE_URL}/api/admin/inventory/ingredients/${ingredient.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Key": adminKey,
          },
          body: JSON.stringify({
            active: !ingredient.active,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      await loadInventory();

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update ingredient."
      );

    } finally {

      setSaving(false);
    }
  };

  const openMovement = (
    ingredient: Ingredient,
    type: MovementAction["type"]
  ) => {

    setMovementAction({
      id: ingredient.id,
      name: ingredient.name,
      unit: ingredient.unit,
      type,
    });

    setMovementQuantity("");
    setMovementNote("");
    setError("");
  };

  return (

    <section className="inventory-page">

      {/* HEADER */}

      <div className="inventory-heading">
        <div>
          <span className="manager-eyebrow">
            RESTAURANT STOCK CONTROL
          </span>

          <h2>Inventory Management</h2>

          <p>
            Manage ingredients, monitor stock and record stock movements.
          </p>
        </div>

        <button
          className="manager-refresh-button"
          onClick={() => void loadInventory()}
          disabled={loading}
        >
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </div>

      {error && (
        <div className="manager-error">
          {error}
        </div>
      )}

      {/* SUMMARY */}

      <section className="inventory-summary">

        <article className="inventory-summary-card">
          <span>Active ingredients</span>
          <strong>{activeIngredients.length}</strong>
        </article>

        <article className="inventory-summary-card inventory-warning">
          <span>Low-stock ingredients</span>
          <strong>{lowStockCount}</strong>
        </article>

        <article className="inventory-summary-card inventory-danger">
          <span>Out of stock</span>
          <strong>{outOfStockCount}</strong>
        </article>

      </section>

      {/* LOW STOCK ALERTS */}

      {stockAlerts.length > 0 && (
        <section
          className="inventory-panel inventory-alert-panel"
          aria-live="polite"
        >

          <div className="inventory-panel-heading">
            <div>
              <span className="manager-eyebrow">
                ATTENTION REQUIRED
              </span>
              <h3>Inventory alerts</h3>
              <p>
                These ingredients have reached their reorder level.
              </p>
            </div>

            <span className="inventory-count">
              {stockAlerts.length} alerts
            </span>
          </div>

          <div className="inventory-alert-list">

            {stockAlerts.map((ingredient) => {

              const outOfStock =
                Number(ingredient.currentStock) <= 0;

              return (
                <article
                  key={ingredient.id}
                  className={
                    outOfStock
                      ? "inventory-alert-item out"
                      : "inventory-alert-item"
                  }
                >

                  <div className="inventory-alert-copy">

                    <strong>{ingredient.name}</strong>

                    <small>
                      {outOfStock ? "OUT OF STOCK" : "LOW STOCK"}
                      {" · "}
                      {formatQuantity(ingredient.currentStock)}
                      {" "}{ingredient.unit} remaining
                      {" · Reorder level: "}
                      {formatQuantity(ingredient.reorderLevel)}
                      {" "}{ingredient.unit}
                    </small>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openMovement(ingredient, "STOCK_IN")
                    }
                    disabled={saving}
                  >
                    + Restock
                  </button>

                </article>
              );
            })}

          </div>

        </section>
      )}

      {/* ADD INGREDIENT */}

      <section className="inventory-panel">

        <div className="inventory-panel-heading">
          <div>
            <span className="manager-eyebrow">STOCK SETUP</span>
            <h3>Add new ingredient</h3>
          </div>
        </div>

        <form
          className="inventory-add-form"
          onSubmit={handleAddIngredient}
        >

          <div>
            <label htmlFor="ingredient-name">
              Ingredient name
            </label>

            <input
              id="ingredient-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Basmati rice"
              maxLength={100}
              required
            />
          </div>

          <div>
            <label htmlFor="ingredient-unit">Unit</label>

            <select
              id="ingredient-unit"
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
            >
              <option value="kg">Kilogram (kg)</option>
              <option value="g">Gram (g)</option>
              <option value="L">Litre (L)</option>
              <option value="ml">Millilitre (ml)</option>
              <option value="pcs">Pieces (pcs)</option>
              <option value="pack">Pack</option>
              <option value="bottle">Bottle</option>
              <option value="box">Box</option>
            </select>
          </div>

          <div>
            <label htmlFor="opening-stock">Opening stock</label>

            <input
              id="opening-stock"
              type="number"
              min="0"
              step="0.001"
              value={openingStock}
              onChange={(event) => setOpeningStock(event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="reorder-level">Reorder level</label>

            <input
              id="reorder-level"
              type="number"
              min="0"
              step="0.001"
              value={reorderLevel}
              onChange={(event) => setReorderLevel(event.target.value)}
              required
            />
          </div>

          <button
            className="manager-primary-button"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "+ Add ingredient"}
          </button>

        </form>

      </section>

      {/* INGREDIENT TABLE */}

      <section className="inventory-panel">

        <div className="inventory-panel-heading">
          <div>
            <span className="manager-eyebrow">STOCK OVERVIEW</span>
            <h3>Ingredient inventory</h3>
          </div>

          <span className="inventory-count">
            {ingredients.length} ingredients
          </span>
        </div>

        {loading && !inventory ? (

          <div className="inventory-empty">
            Loading inventory...
          </div>

        ) : ingredients.length === 0 ? (

          <div className="inventory-empty">
            <span>📦</span>
            <h4>No ingredients added yet</h4>
            <p>Add your first ingredient using the form above.</p>
          </div>

        ) : (

          <div className="inventory-table-wrapper">

            <table className="inventory-table">

              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Available stock</th>
                  <th>Reorder level</th>
                  <th>Status</th>
                  <th>Stock actions</th>
                </tr>
              </thead>

              <tbody>

                {ingredients.map((ingredient) => {

                  const outOfStock =
                    Number(ingredient.currentStock) <= 0;

                  return (

                    <tr key={ingredient.id}>

                      <td>
                        <strong>{ingredient.name}</strong>
                        <small>{ingredient.unit}</small>
                      </td>

                      <td>
                        <strong>
                          {formatQuantity(ingredient.currentStock)}
                        </strong>
                        {" "}{ingredient.unit}
                      </td>

                      <td>
                        <div className="inventory-reorder-control">

                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={
                              reorderDrafts[ingredient.id] ??
                              String(ingredient.reorderLevel)
                            }
                            onChange={(event) =>
                              setReorderDrafts((previous) => ({
                                ...previous,
                                [ingredient.id]: event.target.value,
                              }))
                            }
                            disabled={!ingredient.active || saving}
                          />

                          <button
                            type="button"
                            onClick={() =>
                              void saveReorderLevel(ingredient)
                            }
                            disabled={!ingredient.active || saving}
                          >
                            Save
                          </button>

                        </div>
                      </td>

                      <td>

                        {!ingredient.active ? (

                          <span className="inventory-status inactive">
                            INACTIVE
                          </span>

                        ) : outOfStock ? (

                          <span className="inventory-status out">
                            OUT OF STOCK
                          </span>

                        ) : ingredient.lowStock ? (

                          <span className="inventory-status low">
                            LOW STOCK
                          </span>

                        ) : (

                          <span className="inventory-status good">
                            IN STOCK
                          </span>

                        )}

                      </td>

                      <td>

                        <div className="inventory-actions">

                          <button
                            type="button"
                            onClick={() => openMovement(ingredient, "STOCK_IN")}
                            disabled={!ingredient.active || saving}
                          >
                            Stock in
                          </button>

                          <button
                            type="button"
                            onClick={() => openMovement(ingredient, "WASTE")}
                            disabled={!ingredient.active || saving}
                          >
                            Waste
                          </button>

                          <button
                            type="button"
                            onClick={() => openMovement(ingredient, "ADJUSTMENT")}
                            disabled={!ingredient.active || saving}
                          >
                            Adjust
                          </button>

                          <button
                            type="button"
                            className="inventory-deactivate"
                            onClick={() => void toggleActive(ingredient)}
                            disabled={saving}
                          >
                            {ingredient.active ? "Deactivate" : "Reactivate"}
                          </button>

                        </div>

                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>

        )}

      </section>

      {/* MOVEMENT FORM */}

      {movementAction && (

        <section className="inventory-panel inventory-movement-form">

          <div className="inventory-panel-heading">

            <div>
              <span className="manager-eyebrow">
                STOCK TRANSACTION
              </span>

              <h3>
                {movementAction.type === "STOCK_IN"
                  ? "Record stock purchase"
                  : movementAction.type === "WASTE"
                    ? "Record wasted stock"
                    : "Adjust physical stock"}
              </h3>

              <p>
                {movementAction.name}
              </p>
            </div>

            <button
              type="button"
              className="manager-refresh-button"
              onClick={() => setMovementAction(null)}
            >
              Close
            </button>

          </div>

          <form onSubmit={handleMovement}>

            <div>
              <label htmlFor="movement-quantity">
                {movementAction.type === "ADJUSTMENT"
                  ? `Actual counted stock (${movementAction.unit})`
                  : `Quantity (${movementAction.unit})`}
              </label>

              <input
                id="movement-quantity"
                type="number"
                min="0"
                step="0.001"
                value={movementQuantity}
                onChange={(event) =>
                  setMovementQuantity(event.target.value)
                }
                required
              />

              {movementAction.type === "ADJUSTMENT" && (
                <small>
                  Enter the actual physical stock count. The system
                  calculates the difference automatically.
                </small>
              )}
            </div>

            <div>
              <label htmlFor="movement-note">
                Note / Reference
              </label>

              <input
                id="movement-note"
                value={movementNote}
                onChange={(event) => setMovementNote(event.target.value)}
                maxLength={250}
                placeholder="e.g. Supplier purchase or damaged stock"
              />
            </div>

            <button
              type="submit"
              className="manager-primary-button"
              disabled={saving}
            >
              {saving ? "Recording..." : "Confirm movement"}
            </button>

          </form>

        </section>

      )}

      {/* MOVEMENT HISTORY */}

      <section className="inventory-panel">

        <div className="inventory-panel-heading">
          <div>
            <span className="manager-eyebrow">AUDIT TRAIL</span>
            <h3>Recent stock movements</h3>
          </div>
        </div>

        {(inventory?.recentMovements ?? []).length === 0 ? (

          <div className="inventory-empty">
            No stock movements recorded yet.
          </div>

        ) : (

          <div className="inventory-table-wrapper">

            <table className="inventory-table">

              <thead>
                <tr>
                  <th>Date</th>
                  <th>Ingredient</th>
                  <th>Movement</th>
                  <th>Quantity change</th>
                  <th>Balance after</th>
                  <th>Note</th>
                </tr>
              </thead>

              <tbody>

                {inventory!.recentMovements.map((movement) => (

                  <tr key={movement.id}>

                    <td>{formatDate(movement.createdAt)}</td>

                    <td>{movement.ingredientName}</td>

                    <td>
                      <span className="inventory-movement-type">
                        {movement.movementType.replaceAll("_", " ")}
                      </span>
                    </td>

                    <td className={
                      Number(movement.quantityChange) >= 0
                        ? "movement-positive"
                        : "movement-negative"
                    }>
                      {Number(movement.quantityChange) > 0 ? "+" : ""}
                      {formatQuantity(movement.quantityChange)}
                      {" "}{movement.unit}
                    </td>

                    <td>
                      {formatQuantity(movement.balanceAfter)}
                      {" "}{movement.unit}
                    </td>

                    <td>{movement.note || "—"}</td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </section>
  );
}