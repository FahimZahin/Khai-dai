import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import "./ManagerDashboard.css";
import SalesAnalytics from "./SalesAnalytics";
import InventoryManagement from "./InventoryManagement";
import RecipeManagement from "./RecipeManagement";

type OrderStatus =
  | "AWAITING_PAYMENT"
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "CANCELLED";

type ManagerOrder = {
  id: number;
  orderNumber: string;
  tableNumber: number;
  status: OrderStatus;
  totalAmount: number;
  totalPreparationWorkMinutes: number;
  customerNote: string | null;
  createdAt: string;
  updatedAt: string;
  paymentMethod: string;
  paymentStatus: string;
  transactionId: string | null;
  paymentAmount: number | string | null;
  paymentCurrency: string | null;
  paidAt: string | null;
  items: {
    foodId: number;
    foodName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    spiceLevel: string;
    preparationTimeMinutes: number;
    selectedAddons: {
      name: string;
      price: number;
    }[];
  }[];
};

type OrderFilter = "ALL" | OrderStatus;

const API_BASE_URL =
  `${window.location.protocol}//${window.location.hostname}:8090`;

const POLLING_INTERVAL = 12000;

async function getErrorMessage(response: Response): Promise<string> {
  const body = await response.text();

  if (!body) {
    return `Server error: ${response.status}`;
  }

  try {
    const data = JSON.parse(body);

    return (
      data.message ||
      data.error ||
      `Server error: ${response.status}`
    );
  } catch {
    return body;
  }
}

function formatMoney(amount: number): string {
  return `৳${Number(amount).toFixed(2)}`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getNextAction(status: OrderStatus) {
  switch (status) {
    case "PENDING":
      return {
        label: "Accept order",
        nextStatus: "ACCEPTED" as OrderStatus,
      };

    case "ACCEPTED":
      return {
        label: "Start preparing",
        nextStatus: "PREPARING" as OrderStatus,
      };

    case "PREPARING":
      return {
        label: "Mark as ready",
        nextStatus: "READY" as OrderStatus,
      };

    case "READY":
      return {
        label: "Mark as served",
        nextStatus: "SERVED" as OrderStatus,
      };

    default:
      return null;
  }
}

export default function ManagerDashboard() {
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState<"ORDERS" | "ANALYTICS" | "INVENTORY" | "RECIPES">("ORDERS");

  const [orders, setOrders] = useState<ManagerOrder[]>([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [updatingOrder, setUpdatingOrder] = useState("");

  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [notificationsEnabled, setNotificationsEnabled] =
  useState(false);

const knownOrderIds = useRef<Set<number> | null>(null);

  const [filter, setFilter] = useState<OrderFilter>("ALL");

  // ==========================================
  // LOAD ORDERS
  // ==========================================

  const fetchOrders = useCallback(async (key: string) => {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/orders`,
      {
        method: "GET",
        headers: {
          "X-Admin-Key": key,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }

    const data: ManagerOrder[] = await response.json();

if (!Array.isArray(data)) {
  throw new Error("Invalid order data received from server.");
}

// First load: remember existing orders without alerting.
if (knownOrderIds.current === null) {

  knownOrderIds.current = new Set(
    data.map((order) => order.id)
  );

} else {

  // Find newly arrived pending orders.
  const newOrders = data.filter(
    (order) =>
      order.status === "PENDING" &&
      !knownOrderIds.current!.has(order.id)
  );

  // Remember all orders to prevent duplicate notifications.
  data.forEach((order) => {
    knownOrderIds.current!.add(order.id);
  });

  // Notify manager about new orders.
  if (
    notificationsEnabled &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {

    newOrders.forEach((order) => {

      new Notification("New Khai-Dai Order!", {
        body:
          `Table ${order.tableNumber} | ` +
          `${order.orderNumber} | ` +
          `${formatMoney(order.totalAmount)}`,
        tag: `khaidai-order-${order.id}`,
      });

    });

  }
}

setOrders(data);
    setLastUpdated(new Date());
    setError("");
  }, [notificationsEnabled]);

  // ==========================================
  // ADMIN LOGIN
  // ==========================================

  const handleLogin = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const key = adminKeyInput.trim();

    if (!key) {
      setError("Please enter your administrator key.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await fetchOrders(key);

      setAdminKey(key);
      setAuthenticated(true);
      setAdminKeyInput("");

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to access manager dashboard."
      );

    } finally {
      setLoading(false);
    }
  };

  // ==========================================
// ENABLE BROWSER NOTIFICATIONS
// ==========================================

const enableNotifications = async () => {

  if (!("Notification" in window)) {
    setError(
      "Your browser does not support notifications."
    );
    return;
  }

  if (Notification.permission === "denied") {
    setError(
      "Notifications are blocked. Allow them in your browser site settings."
    );
    return;
  }

  try {

    const permission = await Notification.requestPermission();

    if (permission === "granted") {

      setNotificationsEnabled(true);
      setError("");

    } else {

      setError(
        "Please allow browser notifications to receive new-order alerts."
      );

    }

  } catch {

    setError("Unable to enable browser notifications.");

  }
};

  // ==========================================
  // AUTOMATIC ORDER REFRESH
  // ==========================================

  useEffect(() => {
    if (!authenticated || !adminKey) {
      return;
    }

    const interval = window.setInterval(() => {
      fetchOrders(adminKey).catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to refresh orders."
        );
      });
    }, POLLING_INTERVAL);

    return () => window.clearInterval(interval);

  }, [authenticated, adminKey, fetchOrders]);

  // ==========================================
  // MANUAL REFRESH
  // ==========================================

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await fetchOrders(adminKey);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to refresh orders."
      );
    } finally {
      setRefreshing(false);
    }
  };

  // ==========================================
  // UPDATE ORDER STATUS
  // ==========================================

  const updateStatus = async (
    orderNumber: string,
    status: OrderStatus
  ) => {
    setUpdatingOrder(orderNumber);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/orders/${encodeURIComponent(orderNumber)}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Key": adminKey,
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      await fetchOrders(adminKey);

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update order."
      );

    } finally {
      setUpdatingOrder("");
    }
  };

  // ==========================================
  // MARK CASH PAYMENT AS PAID
  // ==========================================

  const markCashAsPaid = async (orderNumber: string) => {

    const confirmed = window.confirm(
      "Confirm that cash payment has been received?"
    );

    if (!confirmed) return;

    setUpdatingOrder(orderNumber);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/orders/${encodeURIComponent(orderNumber)}/cash-payment`,
        {
          method: "PATCH",
          headers: {
            "X-Admin-Key": adminKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      await fetchOrders(adminKey);

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to record cash payment."
      );

    } finally {

      setUpdatingOrder("");

    }
  };

  // ==========================================
  // REJECT ORDER
  // ==========================================

  const rejectOrder = async (orderNumber: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to reject this order?"
    );

    if (!confirmed) {
      return;
    }

    await updateStatus(orderNumber, "REJECTED");
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = () => {
    setAdminKey("");
    setAdminKeyInput("");
    setAuthenticated(false);
    setActiveView("ORDERS");
    setOrders([]);
    setFilter("ALL");
    setError("");
    setLastUpdated(null);
  };

  // ==========================================
  // DASHBOARD STATISTICS
  // ==========================================

  const pendingCount = orders.filter(
    (order) => order.status === "PENDING"
  ).length;

  const preparingCount = orders.filter(
    (order) => order.status === "PREPARING"
  ).length;

  const readyCount = orders.filter(
    (order) => order.status === "READY"
  ).length;

  const totalRevenue = orders
    .filter((order) => order.paymentStatus === "PAID")
    .reduce(
      (total, order) =>
        total + Number(order.paymentAmount ?? 0),
      0
    );

  // ==========================================
  // FILTER ORDERS
  // ==========================================

  const filteredOrders = useMemo(() => {
    if (filter === "ALL") {
      return orders;
    }

    return orders.filter(
      (order) => order.status === filter
    );
  }, [orders, filter]);

  // ==========================================
  // LOGIN SCREEN
  // ==========================================

  if (!authenticated) {
    return (
      <main className="manager-login-page">

        <section className="manager-login-card">

          <div className="manager-brand">
            KHAI<span>-</span>DAI
          </div>

          <span className="manager-eyebrow">
            RESTAURANT MANAGEMENT
          </span>

          <h1>Manager Login</h1>

          <p>
            Sign in to manage incoming restaurant orders.
          </p>

          <form onSubmit={handleLogin}>

            <label htmlFor="manager-key">
              Administrator key
            </label>

            <input
              id="manager-key"
              type="password"
              value={adminKeyInput}
              onChange={(event) =>
                setAdminKeyInput(event.target.value)
              }
              placeholder="Enter your admin key"
              autoComplete="off"
              required
            />

            {error && (
              <div className="manager-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="manager-primary-button"
            >
              {loading ? "Signing in..." : "Open Dashboard"}
            </button>

          </form>

          <a href="/" className="manager-back-link">
            Back to restaurant
          </a>

        </section>

      </main>
    );
  }

  // ==========================================
  // MAIN DASHBOARD
  // ==========================================

  return (
    <main className="manager-page">

      <header className="manager-header">

        <div>
          <div className="manager-brand">
            KHAI<span>-</span>DAI
          </div>

          <span className="manager-eyebrow">
            RESTAURANT MANAGEMENT
          </span>

          <h1>
            {activeView === "ANALYTICS" ? "Sales Analytics" : activeView === "INVENTORY" ? "Inventory Management" : activeView === "RECIPES" ? "Recipe Management" : "Order Dashboard"}
          </h1>

          <p>
            {activeView === "ANALYTICS" ? "Review revenue, payments and restaurant performance." : activeView === "INVENTORY" ? "Manage ingredients, stock and reorder levels." : activeView === "RECIPES" ? "Manage menu recipes and ingredient quantities." : "Manage customer orders and kitchen preparation."}
          </p>
        </div>

        <div className="manager-header-actions">

          <button
  onClick={enableNotifications}
  disabled={notificationsEnabled}
  className="manager-refresh-button"
>
  {notificationsEnabled
    ? "✓ Alerts enabled"
    : "🔔 Enable alerts"}
</button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="manager-refresh-button"
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>

          <button
            onClick={() => setActiveView("ORDERS")}
            className="manager-link-button"
          >
            Orders
          </button>

          <button
            onClick={() => setActiveView("ANALYTICS")}
            className="manager-link-button"
          >
            Sales Analytics
          </button>

          <button
            onClick={() => setActiveView("INVENTORY")}
            className="manager-link-button"
          >
            Inventory
          </button>

          <button
            onClick={() => setActiveView("RECIPES")}
            className="manager-link-button"
          >
            Recipes
          </button>

          <a href="/admin/qr" className="manager-link-button">
            QR Management
          </a>

          <button
            onClick={logout}
            className="manager-logout-button"
          >
            Logout
          </button>

        </div>

      </header>

      {error && (
        <div className="manager-error manager-dashboard-error">
          {error}
        </div>
      )}

      {activeView === "ANALYTICS" ? (
        <SalesAnalytics adminKey={adminKey} />
      ) : activeView === "INVENTORY" ? (
        <InventoryManagement adminKey={adminKey} />
      ) : activeView === "RECIPES" ? (
        <RecipeManagement adminKey={adminKey} />
      ) : (
        <>
      {/* STATISTICS */}

      <section className="manager-stats">

        <article className="manager-stat-card">
          <span>Total orders</span>
          <strong>{orders.length}</strong>
        </article>

        <article className="manager-stat-card pending-stat">
          <span>Pending orders</span>
          <strong>{pendingCount}</strong>
        </article>

        <article className="manager-stat-card preparing-stat">
          <span>Preparing</span>
          <strong>{preparingCount}</strong>
        </article>

        <article className="manager-stat-card ready-stat">
          <span>Ready to serve</span>
          <strong>{readyCount}</strong>
        </article>

        <article className="manager-stat-card revenue-stat">
          <span>Accepted order value</span>
          <strong>{formatMoney(totalRevenue)}</strong>
        </article>

      </section>

      {/* ORDER MANAGEMENT */}

      <section className="manager-orders-section">

        <div className="manager-orders-heading">

          <div>
            <span className="manager-eyebrow">
              LIVE RESTAURANT ORDERS
            </span>

            <h2>Customer orders</h2>
          </div>

          <div className="manager-last-updated">
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString()}`
              : "Waiting for orders"}
          </div>

        </div>

        {/* FILTERS */}

        <div className="manager-filters">

          {(
            [
              "ALL",
              "PENDING",
              "ACCEPTED",
              "PREPARING",
              "READY",
              "SERVED",
              "REJECTED",
            ] as OrderFilter[]
          ).map((status) => (

            <button
              key={status}
              className={
                filter === status
                  ? "manager-filter active"
                  : "manager-filter"
              }
              onClick={() => setFilter(status)}
            >
              {status === "ALL"
                ? "All orders"
                : status.replace("_", " ")}
            </button>

          ))}

        </div>

        {/* ORDER CARDS */}

        {filteredOrders.length === 0 ? (

          <div className="manager-empty-state">
            <span>🍽️</span>

            <h3>No orders found</h3>

            <p>
              {filter === "ALL"
                ? "New customer orders will appear here automatically."
                : `There are currently no ${filter.toLowerCase()} orders.`}
            </p>
          </div>

        ) : (

          <div className="manager-order-list">

            {filteredOrders.map((order) => {

              const nextAction = getNextAction(order.status);

              const isUpdating =
                updatingOrder === order.orderNumber;

              return (

                <article
                  className="manager-order-card"
                  key={order.id}
                >

                  {/* ORDER HEADER */}

                  <div className="manager-order-top">

                    <div>
                      <span className="manager-order-number">
                        {order.orderNumber}
                      </span>

                      <h3>
                        Table {order.tableNumber}
                      </h3>

                      <span className="manager-order-date">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>

                    <span
                      className={`manager-status status-${order.status.toLowerCase()}`}
                    >
                      {order.status.replace("_", " ")}
                    </span>

                  </div>

                  {/* PAYMENT DETAILS */}

                  <div className="manager-payment-panel">

                    <div className="manager-payment-heading">
                      <strong>PAYMENT DETAILS</strong>

                      <span className={`manager-payment-badge payment-status-${order.paymentStatus.toLowerCase()}`}>
                        {order.paymentStatus === "CASH_DUE"
                          ? "CASH DUE"
                          : order.paymentStatus.replace("_", " ")}
                      </span>
                    </div>

                    <div className="manager-payment-grid">

                      <div>
                        <span>Payment method</span>
                        <strong>
                          {order.paymentMethod === "SSLCOMMERZ"
                            ? "SSLCommerz"
                            : "Cash"}
                        </strong>
                      </div>

                      <div>
                        <span>Payment amount</span>
                        <strong>
                          {order.paymentAmount != null
                            ? `${formatMoney(Number(order.paymentAmount))} ${order.paymentCurrency || "BDT"}`
                            : "Not received"}
                        </strong>
                      </div>

                      <div>
                        <span>Transaction ID</span>
                        <strong>
                          {order.transactionId || "Not applicable"}
                        </strong>
                      </div>

                      <div>
                        <span>Payment date</span>
                        <strong>
                          {order.paidAt
                            ? formatDate(order.paidAt)
                            : "Not paid yet"}
                        </strong>
                      </div>

                    </div>

                    {order.paymentMethod === "CASH" &&
                      order.paymentStatus === "CASH_DUE" && (

                      <button
                        className="manager-cash-paid-button"
                        disabled={isUpdating}
                        onClick={() => markCashAsPaid(order.orderNumber)}
                      >
                        {isUpdating
                          ? "Updating..."
                          : "Mark cash as paid"}
                      </button>

                    )}

                  </div>

                  {/* ORDER ITEMS */}

                  <div className="manager-items">

                    {order.items.map((item, index) => (

                      <div
                        className="manager-item"
                        key={`${item.foodId}-${index}`}
                      >

                        <div className="manager-item-heading">

                          <strong>
                            {item.foodName}
                          </strong>

                          <span>
                            × {item.quantity}
                          </span>

                        </div>

                        <div className="manager-item-details">

                          <span>
                            Spice: {item.spiceLevel}
                          </span>

                          <span>
                            Preparation: {item.preparationTimeMinutes} min
                          </span>

                        </div>

                        {(item.selectedAddons ?? []).length > 0 && (

                          <div className="manager-addons">

                            <span>Add-ons:</span>

                            {item.selectedAddons.map(
                              (addon, addonIndex) => (

                                <span key={addonIndex}>
                                  {addon.name} (+{formatMoney(addon.price)})
                                </span>

                              )
                            )}

                          </div>

                        )}

                        <div className="manager-item-price">
                          {formatMoney(item.lineTotal)}
                        </div>

                      </div>

                    ))}

                  </div>

                  {/* CUSTOMER NOTE */}

                  {order.customerNote && (

                    <div className="manager-customer-note">
                      <strong>Customer note:</strong>
                      <p>{order.customerNote}</p>
                    </div>

                  )}

                  {/* ORDER TOTAL */}

                  <div className="manager-order-summary">

                    <div>
                      <span>Estimated preparation time</span>
                      <strong>
                        {order.totalPreparationWorkMinutes} min
                      </strong>
                    </div>

                    <div>
                      <span>Order total</span>
                      <strong>
                        {formatMoney(order.totalAmount)}
                      </strong>
                    </div>

                  </div>

                  {/* ORDER ACTIONS */}

                  {nextAction && (

                    <div className="manager-order-actions">

                      {order.status === "PENDING" && (

                        <button
                          className="manager-reject-button"
                          disabled={isUpdating}
                          onClick={() =>
                            rejectOrder(order.orderNumber)
                          }
                        >
                          Reject
                        </button>

                      )}

                      <button
                        className="manager-primary-button"
                        disabled={isUpdating}
                        onClick={() =>
                          updateStatus(
                            order.orderNumber,
                            nextAction.nextStatus
                          )
                        }
                      >
                        {isUpdating
                          ? "Updating..."
                          : nextAction.label}
                      </button>

                    </div>

                  )}

                </article>

              );

            })}

          </div>

        )}

      </section>

        </>
      )}

      <footer className="manager-footer">
        Khai-Dai Restaurant Management System · Manager Dashboard
      </footer>

    </main>
  );
}
