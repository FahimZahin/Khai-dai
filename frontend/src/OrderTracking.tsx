
import { useEffect, useState } from "react";

type TrackedOrderItem = {
  foodId: number;
  foodName: string;
  quantity: number;
  unitPrice: number | string;
  lineTotal: number | string;
  spiceLevel: string;
  preparationTimeMinutes: number;
  selectedAddons: {
    name: string;
    price: number | string;
  }[];
};

type TrackedOrder = {
  id: number;
  orderNumber: string;
  tableNumber: number;
  status: string;
  totalAmount: number | string;
  totalPreparationWorkMinutes: number;
  createdAt: string;
  items: TrackedOrderItem[];
};

type Props = {
  orderNumber: string;
  onContinueBrowsing: () => void;
  onDone: () => void;
};

const API_BASE_URL =
  `${window.location.protocol}//${window.location.hostname}:8090`;

const TRACKING_INTERVAL = 5000;

const PAYMENT_RESULT_MESSAGES: Record<
  string,
  { title: string; description: string }
> = {
  paid: {
    title: "Payment successful!",
    description:
      "Your payment has been verified. The restaurant has received your order.",
  },
  pending: {
    title: "Payment verification pending",
    description:
      "We're still checking your payment. Your order status will continue updating.",
  },
  failed: {
    title: "Payment failed",
    description:
      "Your payment could not be completed. If money was deducted, please contact restaurant staff.",
  },
  cancelled: {
    title: "Payment cancelled",
    description:
      "You cancelled the payment. Your order has not been confirmed.",
  },
  refunded: {
    title: "Payment refunded",
    description:
      "Your payment has been refunded. Contact restaurant staff if you need assistance.",
  },
};

const TRACKING_STEPS = [
  { status: "PENDING", label: "Order received", description: "Your order has been received." },
  { status: "ACCEPTED", label: "Order accepted", description: "The restaurant accepted your order." },
  { status: "PREPARING", label: "Preparing", description: "Our kitchen is preparing your food." },
  { status: "READY", label: "Ready to serve", description: "Your food is ready!" },
  { status: "SERVED", label: "Served", description: "Enjoy your meal!" },
];

const formatMoney = (amount: number | string) =>
  `৳${Number(amount).toFixed(2)}`;

export default function OrderTracking({
  orderNumber,
  onContinueBrowsing,
  onDone,
}: Props) {

  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {

    let disposed = false;
    let requestInProgress = false;

    const loadOrder = async () => {

      if (requestInProgress) return;

      requestInProgress = true;

      try {

        const response = await fetch(
          `${API_BASE_URL}/api/orders/${encodeURIComponent(orderNumber)}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        if (!response.ok) {

          let message = `Unable to retrieve order (${response.status}).`;

          try {
            const data = await response.json();
            message = data.detail || data.message || message;
          } catch {
            // Keep the default error message.
          }

          throw new Error(message);
        }

        const data: TrackedOrder = await response.json();

        if (!data || data.orderNumber !== orderNumber) {
          throw new Error("Unexpected order information received.");
        }

        if (!disposed) {
          setOrder(data);
          setError("");
        }

      } catch (err) {

        if (!disposed) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to update order status."
          );
        }

      } finally {

        requestInProgress = false;

        if (!disposed) {
          setLoading(false);
        }
      }
    };

    void loadOrder();

    const interval = window.setInterval(
      loadOrder,
      TRACKING_INTERVAL
    );

    return () => {
      disposed = true;
      window.clearInterval(interval);
    };

  }, [orderNumber, retryKey]);

  const status = order?.status ?? "PENDING";

  const paymentMessage = paymentResult
    ? PAYMENT_RESULT_MESSAGES[paymentResult] ?? null
    : null;

  const isRejected = status === "REJECTED";
  const isCancelled = status === "CANCELLED";
  const isServed = status === "SERVED";

  const isTerminal = isRejected || isCancelled || isServed;

  const currentStep = TRACKING_STEPS.findIndex(
    (step) => step.status === status
  );

  return (

    <section className="order-tracking-card">

      <div className="order-tracking-header">

        <span className="eyebrow">
          KHAI-DAI ORDER TRACKING
        </span>

        <h2>Your order</h2>

        <strong className="order-tracking-number">
          {orderNumber}
        </strong>

        {order && (
          <span className={`order-tracking-status status-${status.toLowerCase()}`}>
            {status.replaceAll("_", " ")}
          </span>
        )}

      </div>

      {paymentMessage && (
        <div
          className={`payment-result-banner payment-result-${paymentResult}`}
          role="status"
          aria-live="polite"
        >
          <strong>{paymentMessage.title}</strong>
          <p>{paymentMessage.description}</p>
        </div>
      )}

      {loading && !order && (
        <div className="order-tracking-loading">
          <p>Loading your order information...</p>
        </div>
      )}

      {error && (
        <div className="order-tracking-error" role="alert">
          {error}
          <p>We'll automatically try again.</p>

          {!order && (
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setRetryKey((value) => value + 1);
              }}
            >
              Try again
            </button>
          )}
        </div>
      )}

      {order && (

        <>

          <div className="order-tracking-details">

            <div>
              <span>Table</span>
              <strong>{order.tableNumber}</strong>
            </div>

            <div>
              <span>Order total</span>
              <strong>
                {formatMoney(order.totalAmount)}
              </strong>
            </div>

            <div>
              <span>Estimated preparation</span>
              <strong>
                {order.totalPreparationWorkMinutes} min
              </strong>
            </div>

          </div>

          {isRejected && (
            <div className="order-tracking-terminal rejected">
              <strong>Order rejected</strong>
              <p>
                Unfortunately, the restaurant could not accept
                your order. Please contact our staff for assistance.
              </p>
            </div>
          )}

          {isCancelled && (
            <div className="order-tracking-terminal cancelled">
              <strong>Order cancelled</strong>
              <p>
                This order has been cancelled. Please contact
                our staff if you need assistance.
              </p>
            </div>
          )}

          {!isRejected && !isCancelled && (

            <div className="order-tracking-progress">

              <h3>
                {isServed
                  ? "Your order has been served!"
                  : status === "PENDING"
                    ? "Waiting for restaurant approval"
                    : status === "ACCEPTED"
                      ? "Your order has been accepted!"
                      : status === "PREPARING"
                        ? "Your food is being prepared!"
                        : status === "READY"
                          ? "Your food is ready!"
                          : "Order progress"}
              </h3>

              <ol className="order-tracking-timeline">

                {TRACKING_STEPS.map((step, index) => {

                  const completed =
                    isServed || index < currentStep;

                  const current =
                    !isServed && index === currentStep;

                  return (

                    <li
                      key={step.status}
                      className={[
                        "order-tracking-step",
                        completed ? "completed" : "",
                        current ? "current" : "",
                      ].join(" ")}
                    >

                      <span className="order-tracking-marker">
                        {completed ? "✓" : index + 1}
                      </span>

                      <div className="order-tracking-step-content">

                        <strong>{step.label}</strong>

                        <p>{step.description}</p>

                        {current && (
                          <small>Current status</small>
                        )}

                      </div>

                    </li>

                  );

                })}

              </ol>

            </div>

          )}

          <div className="order-tracking-items">

            <h3>Order summary</h3>

            {order.items?.map((item, index) => (

              <div
                className="order-tracking-item"
                key={`${item.foodId}-${index}`}
              >

                <div className="order-tracking-item-main">

                  <strong>
                    {item.foodName} × {item.quantity}
                  </strong>

                  <span>
                    {formatMoney(item.lineTotal)}
                  </span>

                </div>

                <small>
                  Spice: {item.spiceLevel}
                </small>

                {item.selectedAddons?.length > 0 && (
                  <small>
                    Add-ons:{" "}
                    {item.selectedAddons
                      .map((addon) => addon.name)
                      .join(", ")}
                  </small>
                )}

              </div>

            ))}

          </div>

          <p className="order-tracking-refresh-note">
            <span className="tracking-live-dot" />
            Order status automatically updates every 5 seconds.
          </p>

        </>

      )}

      <div className="order-tracking-actions">

        {isTerminal ? (

          <button
            type="button"
            className="order-tracking-done"
            onClick={onDone}
          >
            Done
          </button>

        ) : (

          <button
            type="button"
            className="order-tracking-continue"
            onClick={onContinueBrowsing}
          >
            Continue browsing
          </button>

        )}

      </div>

    </section>

  );
}
