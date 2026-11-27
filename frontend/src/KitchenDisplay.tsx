import { useCallback, useEffect, useRef, useState } from "react";
import "./KitchenDisplay.css";

type KitchenOrder = {
  id: number;
  orderNumber: string;
  tableNumber: number;
  status: string;
  createdAt: string;
  customerNote: string | null;
  totalPreparationWorkMinutes: number;
  items: {
    foodId: number;
    foodName: string;
    quantity: number;
    spiceLevel: string;
    preparationTimeMinutes: number;
    selectedAddons?: {
      name: string;
      price: number | string;
    }[];
  }[];
};

type LaneStatus = "ACCEPTED" | "PREPARING" | "READY";

const API =
  `${window.location.protocol}//${window.location.hostname}:8090`;

const LANES: {
  status: LaneStatus;
  title: string;
  description: string;
}[] = [
  {
    status: "ACCEPTED",
    title: "New Tickets",
    description: "Waiting for preparation",
  },
  {
    status: "PREPARING",
    title: "Preparing",
    description: "Currently being prepared",
  },
  {
    status: "READY",
    title: "Ready to Serve",
    description: "Waiting for waiter collection",
  },
];

async function errorMessage(response: Response): Promise<string> {
  const body = await response.text();

  if (!body) return `Server error: ${response.status}`;

  try {
    const data = JSON.parse(body);
    return data.message || data.error || `Server error: ${response.status}`;
  } catch {
    return body;
  }
}

function formatTime(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : date.toLocaleTimeString("en-BD", {
        hour: "2-digit",
        minute: "2-digit",
      });
}

function orderAge(value: string): string {
  const created = new Date(value).getTime();

  if (!Number.isFinite(created)) return "";

  const minutes = Math.max(
    0,
    Math.floor((Date.now() - created) / 60000)
  );

  return minutes === 0 ? "Just now" : `${minutes} min ago`;
}

export default function KitchenDisplay({
  adminKey,
}: {
  adminKey: string;
}) {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyOrder, setBusyOrder] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const requestInProgress = useRef(false);

  // ==========================================
  // FETCH ORDERS
  // ==========================================

  const loadOrders = useCallback(async () => {
    if (!adminKey || requestInProgress.current) return;

    requestInProgress.current = true;

    try {
      const response = await fetch(
        `${API}/api/admin/orders`,
        {
          method: "GET",
          headers: {
            "X-Admin-Key": adminKey,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(await errorMessage(response));
      }

      const data: KitchenOrder[] = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Invalid kitchen order response.");
      }

      setOrders(
        data.filter((order) =>
          ["ACCEPTED", "PREPARING", "READY"].includes(order.status)
        )
      );

      setLastUpdated(new Date());
      setError("");

    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load orders."
      );
    } finally {
      requestInProgress.current = false;
      setLoading(false);
    }
  }, [adminKey]);

  // ==========================================
  // AUTO REFRESH
  // ==========================================

  useEffect(() => {
    void loadOrders();

    const interval = window.setInterval(() => {
      void loadOrders();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadOrders]);

  // ==========================================
  // UPDATE ORDER STATUS
  // ==========================================

  const updateStatus = async (
    order: KitchenOrder,
    nextStatus: "PREPARING" | "READY"
  ) => {
    if (busyOrder) return;

    setBusyOrder(order.orderNumber);
    setError("");

    try {
      const response = await fetch(
        `${API}/api/admin/orders/${encodeURIComponent(order.orderNumber)}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Key": adminKey,
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await errorMessage(response));
      }

      const updated: KitchenOrder = await response.json();

      setOrders((previous) =>
        previous.map((existing) =>
          existing.orderNumber === order.orderNumber
            ? updated
            : existing
        )
      );

      setLastUpdated(new Date());

    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update order."
      );
    } finally {
      setBusyOrder("");
    }
  };

  // ==========================================
  // SUMMARY
  // ==========================================

  const accepted = orders.filter(
    (o) => o.status === "ACCEPTED"
  ).length;

  const preparing = orders.filter(
    (o) => o.status === "PREPARING"
  ).length;

  const ready = orders.filter(
    (o) => o.status === "READY"
  ).length;

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <section className="kds-page">

      <header className="kds-toolbar">
        <div>
          <span className="kds-eyebrow">
            KHAI-DAI KITCHEN OPERATIONS
          </span>
          <h2>Kitchen Display System</h2>
          <p>Live kitchen order management.</p>
        </div>

        <button
          className="kds-refresh"
          onClick={() => void loadOrders()}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </header>

      {error && (
        <div className="kds-error" role="alert">
          {error}
        </div>
      )}

      <div className="kds-summary">
        <div>
          <span>Active Orders</span>
          <strong>{orders.length}</strong>
        </div>
        <div>
          <span>Waiting</span>
          <strong>{accepted}</strong>
        </div>
        <div>
          <span>Preparing</span>
          <strong>{preparing}</strong>
        </div>
        <div>
          <span>Ready</span>
          <strong>{ready}</strong>
        </div>
      </div>

      <div className="kds-board">

        {LANES.map((lane) => {
          const laneOrders = orders
            .filter((order) => order.status === lane.status)
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            );

          return (
            <section className="kds-lane" key={lane.status}>

              <header className="kds-lane-header">
                <div>
                  <h3>{lane.title}</h3>
                  <p>{lane.description}</p>
                </div>
                <strong>{laneOrders.length}</strong>
              </header>

              <div className="kds-tickets">

                {laneOrders.map((order) => {
                  const busy = busyOrder === order.orderNumber;

                  return (
                    <article className="kds-ticket" key={order.id}>

                      <div className="kds-ticket-header">
                        <div>
                          <small>{order.orderNumber}</small>
                          <h4>Table {order.tableNumber}</h4>
                        </div>
                        <span>{formatTime(order.createdAt)}</span>
                      </div>

                      <div className="kds-age">
                        {orderAge(order.createdAt)}
                      </div>

                      <div className="kds-items">

                        {order.items.map((item, index) => (
                          <div
                            className="kds-item"
                            key={`${item.foodId}-${index}`}
                          >
                            <div className="kds-item-heading">
                              <strong>{item.foodName}</strong>
                              <strong>× {item.quantity}</strong>
                            </div>

                            <div className="kds-item-details">
                              <span>Spice: {item.spiceLevel}</span>
                              <span>
                                {item.preparationTimeMinutes} min / serving
                              </span>
                            </div>

                            {(item.selectedAddons ?? []).length > 0 && (
                              <div className="kds-addons">
                                <strong>Add-ons:</strong>
                                {item.selectedAddons!.map(
                                  (addon, i) => (
                                    <span key={i}>+ {addon.name}</span>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        ))}

                      </div>

                      {order.customerNote && (
                        <div className="kds-note">
                          <strong>Customer instructions</strong>
                          <p>{order.customerNote}</p>
                        </div>
                      )}

                      <div className="kds-workload">
                        <span>Preparation workload</span>
                        <strong>
                          {order.totalPreparationWorkMinutes} min
                        </strong>
                      </div>

                      {lane.status === "ACCEPTED" && (
                        <button
                          className="kds-start"
                          disabled={!!busyOrder}
                          onClick={() =>
                            void updateStatus(order, "PREPARING")
                          }
                        >
                          {busy ? "Starting..." : "Start Preparing →"}
                        </button>
                      )}

                      {lane.status === "PREPARING" && (
                        <button
                          className="kds-complete"
                          disabled={!!busyOrder}
                          onClick={() =>
                            void updateStatus(order, "READY")
                          }
                        >
                          {busy ? "Updating..." : "✓ Mark as Ready"}
                        </button>
                      )}

                      {lane.status === "READY" && (
                        <div className="kds-ready">
                          ✓ Preparation complete
                          <small>
                            Waiter collection pending.
                          </small>
                        </div>
                      )}

                    </article>
                  );
                })}

                {laneOrders.length === 0 && (
                  <div className="kds-empty">
                    {loading ? "Loading..." : "No orders here."}
                  </div>
                )}

              </div>
            </section>
          );
        })}

      </div>

      <footer className="kds-sync">
        {lastUpdated
          ? `Last synchronized: ${lastUpdated.toLocaleTimeString()}`
          : "Connecting..."}
        {" · "}Auto refresh: 5 seconds
      </footer>

    </section>
  );
}