
import { useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import "./App.css";

type AdminTable = {
  id: number;
  tableNumber: number;
  qrToken: string;
  active: boolean;
};

const API_BASE_URL =
  `${window.location.protocol}//${window.location.hostname}:8090`;

export default function AdminQrPage() {
  const [adminKey, setAdminKey] = useState("");
  const [tables, setTables] = useState<AdminTable[]>([]);
  const [menuBaseUrl, setMenuBaseUrl] = useState(
    window.location.origin
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Load QR information from the protected backend API
  const loadQrCodes = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!adminKey.trim()) {
      setError("Please enter your administrator key.");
      return;
    }

    setLoading(true);
    setError("");
    setLoaded(false);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/tables/qr`,
        {
          method: "GET",
          headers: {
            "X-Admin-Key": adminKey.trim(),
          },
        }
      );

      if (response.status === 401) {
        throw new Error("Incorrect administrator key.");
      }

      if (response.status === 503) {
        throw new Error("Admin security is not configured.");
      }

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data: AdminTable[] = await response.json();

      if (!Array.isArray(data) || data.length !== 8) {
        throw new Error(
          `Expected 8 tables but received ${data.length}.`
        );
      }

      setTables(data);
      setLoaded(true);

    } catch (err) {
      setTables([]);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to retrieve QR codes."
      );

    } finally {
      setLoading(false);
    }
  };

  // Generate the customer menu URL for each table
  const getMenuUrl = (token: string): string => {
    try {
      const url = new URL("/", menuBaseUrl.trim());

      if (
        url.protocol !== "http:" &&
        url.protocol !== "https:"
      ) {
        return "";
      }

      url.searchParams.set("tableToken", token);

      return url.toString();

    } catch {
      return "";
    }
  };

  // Print all eight table cards
  const printQrCodes = () => {
    if (tables.length === 8) {
      window.print();
    }
  };

  // Lock the dashboard
  const logout = () => {
    setAdminKey("");
    setTables([]);
    setLoaded(false);
    setError("");
  };

  return (
    <main className="qr-admin-page">

      <header className="qr-admin-header">
        <div>
          <span className="eyebrow">
            KHAI-DAI MANAGEMENT
          </span>

          <h1>QR Code Management</h1>

          <p>
            Manage your restaurant's eight table QR codes.
          </p>
        </div>

        <a href="/" className="qr-back-link">
          ← Back to restaurant
        </a>
      </header>

      {/* ADMIN LOGIN */}

      <section className="qr-admin-access">
        <h2>Administrator access</h2>

        <p>
          Enter your private administrator key to access
          the restaurant QR codes.
        </p>

        <form
          className="qr-admin-form"
          onSubmit={loadQrCodes}
        >
          <input
            type="password"
            value={adminKey}
            onChange={(event) =>
              setAdminKey(event.target.value)
            }
            placeholder="Enter admin key"
            autoComplete="off"
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Loading..." : "Load QR Codes"}
          </button>
        </form>

        {error && (
          <div className="qr-error">
            {error}
          </div>
        )}

        {loaded && (
          <div className="qr-success">
            ✓ Authentication successful. Eight tables loaded.
          </div>
        )}
      </section>

      {/* QR MANAGEMENT */}

      {loaded && (
        <>
          <section className="qr-settings">
            <h2>Customer menu address</h2>

            <p>
              Customers will open this address after
              scanning their table QR code.
            </p>

            <input
              type="url"
              value={menuBaseUrl}
              onChange={(event) =>
                setMenuBaseUrl(event.target.value)
              }
              placeholder="http://localhost:5173"
            />

            <small>
              For phone testing, use your computer's
              local network IP instead of localhost.
            </small>
          </section>

          <section className="qr-management-heading">
            <div>
              <span className="eyebrow">
                RESTAURANT TABLES
              </span>

              <h2>Your eight QR codes</h2>

              <p>
                Each QR code identifies one specific table.
              </p>
            </div>

            <div className="qr-management-actions">
              <button
                className="qr-print-button"
                onClick={printQrCodes}
              >
                🖨 Print all QR codes
              </button>

              <button
                className="qr-logout-button"
                onClick={logout}
              >
                Lock dashboard
              </button>
            </div>
          </section>

          <div className="qr-card-grid">
            {tables.map((table) => {
              const menuUrl = getMenuUrl(table.qrToken);

              return (
                <article
                  className="qr-table-card"
                  key={table.id}
                >
                  <div className="qr-card-top">
                    <span className="qr-table-label">
                      KHAI-DAI
                    </span>

                    <span
                      className={
                        table.active
                          ? "qr-active"
                          : "qr-inactive"
                      }
                    >
                      {table.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <h3>Table {table.tableNumber}</h3>

                  <p className="qr-table-id">
                    TABLE-
                    {String(table.tableNumber).padStart(2, "0")}
                  </p>

                  <div className="qr-code-container">
                    {menuUrl ? (
                      <QRCodeSVG
                        value={menuUrl}
                        size={190}
                        level="H"
                        includeMargin
                      />
                    ) : (
                      <p className="qr-error">
                        Enter a valid menu address.
                      </p>
                    )}
                  </div>

                  <p className="qr-scan-instruction">
                    Scan to view our menu and order.
                  </p>

                  <div className="qr-card-footer">
                    Fresh food. Made for you.
                  </div>
                </article>
              );
            })}
          </div>

          <section className="qr-print-note">
            <strong>Printing instructions</strong>

            <p>
              Print on A4 paper, cut out the eight cards,
              and place one QR code on each restaurant table.
            </p>
          </section>
        </>
      )}

      <footer className="qr-admin-footer">
        Khai-Dai Restaurant Management System
      </footer>
    </main>
  );
}
