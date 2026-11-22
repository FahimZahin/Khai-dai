
import { useEffect, useState } from "react";

const API_BASE_URL =
  `${window.location.protocol}//${window.location.hostname}:8090`;

type Session = {
  status: "checking" | "valid" | "invalid";
  tableNumber?: number;
  message?: string;
};

type ValidationResponse = {
  valid: boolean;
  tableNumber: number;
  message: string;
};

export default function TableSessionBanner() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const token = new URLSearchParams(
      window.location.search
    ).get("tableToken");

    if (!token) {
      setSession(null);
      return;
    }

    const controller = new AbortController();

    const validateTable = async () => {
      setSession({ status: "checking" });

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/tables/validate/${encodeURIComponent(token)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(
            "Invalid or inactive restaurant table QR code."
          );
        }

        const data: ValidationResponse =
          await response.json();

        if (!data.valid) {
          throw new Error("Table verification failed.");
        }

        setSession({
          status: "valid",
          tableNumber: data.tableNumber,
          message: data.message,
        });

      } catch (err) {
        if (
          err instanceof Error &&
          err.name === "AbortError"
        ) {
          return;
        }

        setSession({
          status: "invalid",
          message:
            err instanceof Error
              ? err.message
              : "Unable to verify table.",
        });
      }
    };

    validateTable();

    return () => controller.abort();
  }, []);

  if (!session) return null;

  if (session.status === "checking") {
    return (
      <div className="table-session-banner checking">
        Verifying your restaurant table...
      </div>
    );
  }

  if (session.status === "invalid") {
    return (
      <div className="table-session-banner invalid">
        ⚠️ {session.message}
      </div>
    );
  }

  return (
    <div className="table-session-banner valid">
      <span>✓</span>

      <div>
        <strong>
          Welcome! You are ordering from Table{" "}
          {session.tableNumber}.
        </strong>

        <small>
          Your table has been verified successfully.
        </small>
      </div>
    </div>
  );
}
