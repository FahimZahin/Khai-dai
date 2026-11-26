import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import "./SalesAnalytics.css";

const API_BASE_URL =
  `${window.location.protocol}//${window.location.hostname}:8090`;

type DateRange = {
  from: string;
  to: string;
};

type DailyRevenue = {
  date: string;
  revenue: number | string;
};

type TopSellingItem = {
  foodId: number;
  foodName: string;
  quantitySold: number;
  sales: number | string;
};

type OrderStatusCount = {
  status: string;
  count: number;
};

type AnalyticsData = {
  fromDate: string;
  toDate: string;
  totalRevenue: number | string;
  totalOrders: number;
  paidOrders: number;
  averageOrderValue: number | string;
  cashRevenue: number | string;
  onlineRevenue: number | string;
  cashPayments: number;
  onlinePayments: number;
  dailyRevenue: DailyRevenue[];
  topSellingItems: TopSellingItem[];
  orderStatusCounts: OrderStatusCount[];
};

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getInitialRange(): DateRange {
  const today = new Date();
  const firstDay = new Date();

  firstDay.setDate(today.getDate() - 6);

  return {
    from: localDateString(firstDay),
    to: localDateString(today),
  };
}

function numberValue(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}

function formatMoney(value: number | string): string {
  return `৳${numberValue(value).toFixed(2)}`;
}

function formatChartDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
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

type Props = {
  adminKey: string;
};

export default function SalesAnalytics({ adminKey }: Props) {

  const initialRange = getInitialRange();

  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);

  const [appliedRange, setAppliedRange] =
    useState<DateRange>(initialRange);

  const [analytics, setAnalytics] =
    useState<AnalyticsData | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadAnalytics = useCallback(
    async (range: DateRange) => {

      setLoading(true);
      setError("");

      try {

        const query = new URLSearchParams({
          from: range.from,
          to: range.to,
        });

        const response = await fetch(
          `${API_BASE_URL}/api/admin/analytics?${query.toString()}`,
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

        const data: AnalyticsData = await response.json();

        setAnalytics(data);
        setLastUpdated(new Date());

      } catch (err) {

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load sales analytics."
        );

      } finally {

        setLoading(false);
      }
    },
    [adminKey]
  );

  useEffect(() => {
    void loadAnalytics(appliedRange);
  }, [loadAnalytics, appliedRange]);

  const applyDateRange = (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    if (!fromDate || !toDate || fromDate > toDate) {
      setError("Please select a valid date range.");
      return;
    }

    const days =
      (
        Date.parse(`${toDate}T00:00:00Z`) -
        Date.parse(`${fromDate}T00:00:00Z`)
      ) / 86400000 + 1;

    if (days > 90) {
      setError("Please select a maximum range of 90 days.");
      return;
    }

    setAppliedRange({
      from: fromDate,
      to: toDate,
    });
  };

  const cashRevenue = numberValue(analytics?.cashRevenue);
  const onlineRevenue = numberValue(analytics?.onlineRevenue);

  const paymentTotal = cashRevenue + onlineRevenue;

  const cashPercentage = paymentTotal > 0
    ? (cashRevenue / paymentTotal) * 100
    : 0;

  const maxDailyRevenue = Math.max(
    1,
    ...(analytics?.dailyRevenue ?? []).map(
      (item) => numberValue(item.revenue)
    )
  );

  const maxItemQuantity = Math.max(
    1,
    ...(analytics?.topSellingItems ?? []).map(
      (item) => item.quantitySold
    )
  );

  return (

    <section className="sales-analytics">

      {/* DATE FILTER */}

      <form
        className="analytics-toolbar"
        onSubmit={applyDateRange}
      >

        <div className="analytics-date-field">
          <label htmlFor="analytics-from">From date</label>
          <input
            id="analytics-from"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            required
          />
        </div>

        <div className="analytics-date-field">
          <label htmlFor="analytics-to">To date</label>
          <input
            id="analytics-to"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="analytics-apply-button"
          disabled={loading}
        >
          Apply filters
        </button>

        <button
          type="button"
          className="analytics-refresh-button"
          onClick={() => void loadAnalytics(appliedRange)}
          disabled={loading}
        >
          {loading ? "Loading..." : "↻ Refresh"}
        </button>

      </form>

      {error && (
        <div className="manager-error analytics-error">
          {error}
        </div>
      )}

      {lastUpdated && (
        <p className="analytics-updated">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      {loading && !analytics ? (

        <div className="analytics-empty">
          Loading sales analytics...
        </div>

      ) : analytics ? (

        <>

          {/* KPI CARDS */}

          <section className="analytics-kpis">

            <article className="analytics-kpi analytics-revenue-kpi">
              <span>Total paid revenue</span>
              <strong>{formatMoney(analytics.totalRevenue)}</strong>
              <small>Verified payments only</small>
            </article>

            <article className="analytics-kpi">
              <span>Total orders</span>
              <strong>{analytics.totalOrders}</strong>
              <small>Orders created in selected period</small>
            </article>

            <article className="analytics-kpi">
              <span>Paid orders</span>
              <strong>{analytics.paidOrders}</strong>
              <small>Distinct orders with confirmed payments</small>
            </article>

            <article className="analytics-kpi">
              <span>Average order value</span>
              <strong>{formatMoney(analytics.averageOrderValue)}</strong>
              <small>Revenue divided by paid orders</small>
            </article>

            <article className="analytics-kpi">
              <span>Cash revenue</span>
              <strong>{formatMoney(analytics.cashRevenue)}</strong>
              <small>{analytics.cashPayments} paid transactions</small>
            </article>

            <article className="analytics-kpi">
              <span>Online revenue</span>
              <strong>{formatMoney(analytics.onlineRevenue)}</strong>
              <small>{analytics.onlinePayments} paid transactions</small>
            </article>

          </section>

          {/* DAILY REVENUE */}

          <section className="analytics-panel">

            <div className="analytics-panel-heading">
              <div>
                <span className="manager-eyebrow">
                  REVENUE PERFORMANCE
                </span>
                <h2>Daily revenue</h2>
              </div>
              <strong>
                {formatMoney(analytics.totalRevenue)}
              </strong>
            </div>

            {analytics.dailyRevenue.length === 0 ? (

              <div className="analytics-empty">
                No revenue data available.
              </div>

            ) : (

              <div className="analytics-chart">

                {analytics.dailyRevenue.map((item) => {

                  const amount = numberValue(item.revenue);

                  const height = amount > 0
                    ? Math.max(3, (amount / maxDailyRevenue) * 100)
                    : 0;

                  return (

                    <div
                      className="analytics-chart-column"
                      key={item.date}
                      title={`${item.date}: ${formatMoney(amount)}`}
                    >

                      <strong className="analytics-chart-value">
                        {amount > 0 ? formatMoney(amount) : "—"}
                      </strong>

                      <div className="analytics-bar-track">
                        <div
                          className="analytics-bar"
                          style={{ height: `${height}%` }}
                        />
                      </div>

                      <span>{formatChartDate(item.date)}</span>

                    </div>
                  );
                })}

              </div>
            )}

          </section>

          {/* PAYMENT AND ORDER STATUS */}

          <div className="analytics-two-column">

            <section className="analytics-panel">

              <div className="analytics-panel-heading">
                <div>
                  <span className="manager-eyebrow">
                    PAYMENT METHODS
                  </span>
                  <h2>Revenue breakdown</h2>
                </div>
              </div>

              <div className="analytics-breakdown-row">
                <div>
                  <strong>Cash</strong>
                  <span>{formatMoney(cashRevenue)}</span>
                </div>
              </div>

              <div className="analytics-progress-track">
                <div
                  className="analytics-progress-cash"
                  style={{ width: `${cashPercentage}%` }}
                />
              </div>

              <div className="analytics-breakdown-row">
                <div>
                  <strong>SSLCommerz</strong>
                  <span>{formatMoney(onlineRevenue)}</span>
                </div>
              </div>

              <div className="analytics-progress-track">
                <div
                  className="analytics-progress-online"
                  style={{ width: `${100 - cashPercentage}%` }}
                />
              </div>

              <p className="analytics-note">
                Based on confirmed BDT payment transactions.
              </p>

            </section>

            <section className="analytics-panel">

              <div className="analytics-panel-heading">
                <div>
                  <span className="manager-eyebrow">
                    ORDER PERFORMANCE
                  </span>
                  <h2>Order statuses</h2>
                </div>
              </div>

              <div className="analytics-status-list">

                {analytics.orderStatusCounts.map((item) => (

                  <div
                    className="analytics-status-row"
                    key={item.status}
                  >

                    <span>
                      {item.status.replaceAll("_", " ")}
                    </span>

                    <strong>{item.count}</strong>

                  </div>

                ))}

              </div>

              <p className="analytics-note">
                Based on order creation date.
              </p>

            </section>

          </div>

          {/* TOP SELLING ITEMS */}

          <section className="analytics-panel">

            <div className="analytics-panel-heading">
              <div>
                <span className="manager-eyebrow">
                  PRODUCT PERFORMANCE
                </span>
                <h2>Top selling dishes</h2>
              </div>
            </div>

            {analytics.topSellingItems.length === 0 ? (

              <div className="analytics-empty">
                No paid food orders found in this period.
              </div>

            ) : (

              <div className="analytics-top-items">

                {analytics.topSellingItems.map((item, index) => (

                  <div
                    className="analytics-top-item"
                    key={item.foodId}
                  >

                    <div className="analytics-top-item-heading">

                      <strong>
                        {index + 1}. {item.foodName}
                      </strong>

                      <span>
                        {item.quantitySold} sold
                      </span>

                    </div>

                    <div className="analytics-progress-track">
                      <div
                        className="analytics-progress-online"
                        style={{
                          width: `${(item.quantitySold / maxItemQuantity) * 100}%`,
                        }}
                      />
                    </div>

                    <small>{formatMoney(item.sales)}</small>

                  </div>

                ))}

              </div>

            )}

          </section>

        </>

      ) : (

        <div className="analytics-empty">
          No analytics data available.
        </div>

      )}

    </section>
  );
}