import { useCallback, useEffect, useState, type FormEvent } from "react";
import "./PurchaseOrderManagement.css";

const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:8090`;

type Supplier = {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type IngredientOption = {
  id: number;
  name: string;
  unit: string;
  currentStock: number | string;
};

type PurchaseOrderItem = {
  id: number;
  ingredientId: number;
  ingredientName: string;
  unit: string;
  quantityOrdered: number | string;
  quantityReceived: number | string;
  remainingQuantity: number | string;
  unitCost: number | string;
  lineTotal: number | string;
};

type PurchaseOrder = {
  id: number;
  poNumber: string;
  supplierId: number;
  supplierName: string;
  status: "ORDERED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";
  notes: string | null;
  createdAt: string;
  orderedAt: string | null;
  receivedAt: string | null;
  totalAmount: number | string;
  items: PurchaseOrderItem[];
};

type Overview = {
  suppliers: Supplier[];
  ingredients: IngredientOption[];
  purchaseOrders: PurchaseOrder[];
};

type OrderLineDraft = {
  ingredientId: string;
  quantity: string;
  unitCost: string;
};

type SupplierDraft = {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

type Props = { adminKey: string };

const emptySupplier: SupplierDraft = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

function formatMoney(value: number | string): string {
  return `৳${Number(value).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatQuantity(value: number | string): string {
  return Number(value).toLocaleString("en-BD", { maximumFractionDigits: 3 });
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

async function getErrorMessage(response: Response): Promise<string> {
  const body = await response.text();
  if (!body) return `Server error: ${response.status}`;
  try {
    const data = JSON.parse(body);
    return data.message || data.detail || data.error || `Server error: ${response.status}`;
  } catch {
    return body;
  }
}

export default function PurchaseOrderManagement({ adminKey }: Props) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [supplierDraft, setSupplierDraft] = useState<SupplierDraft>(emptySupplier);
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);

  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [orderLines, setOrderLines] = useState<OrderLineDraft[]>([
    { ingredientId: "", quantity: "", unitCost: "" },
  ]);

  const [receivingOrderId, setReceivingOrderId] = useState<number | null>(null);
  const [receiveDrafts, setReceiveDrafts] = useState<Record<number, string>>({});
  const [receiveNote, setReceiveNote] = useState("");

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/purchasing`, {
        headers: { Accept: "application/json", "X-Admin-Key": adminKey },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      const result: Overview = await response.json();
      setOverview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load purchasing data.");
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  const suppliers = overview?.suppliers ?? [];
  const activeSuppliers = suppliers.filter((supplier) => supplier.active);
  const orders = overview?.purchaseOrders ?? [];
  const pendingOrders = orders.filter((order) => order.status === "ORDERED" || order.status === "PARTIALLY_RECEIVED");
  const receivedOrders = orders.filter((order) => order.status === "RECEIVED");

  const clearMessages = () => { setError(""); setSuccess(""); };

  const handleSupplierSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearMessages();
    setSaving(true);
    try {
      const currentSupplier = suppliers.find((supplier) => supplier.id === editingSupplierId);
      const response = await fetch(
        editingSupplierId
          ? `${API_BASE_URL}/api/admin/purchasing/suppliers/${editingSupplierId}`
          : `${API_BASE_URL}/api/admin/purchasing/suppliers`,
        {
          method: editingSupplierId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
          body: JSON.stringify({ ...supplierDraft, active: currentSupplier?.active ?? true }),
        }
      );
      if (!response.ok) throw new Error(await getErrorMessage(response));
      setSupplierDraft(emptySupplier);
      setEditingSupplierId(null);
      setSuccess(editingSupplierId ? "Supplier details updated." : "Supplier added successfully.");
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save supplier.");
    } finally {
      setSaving(false);
    }
  };

  const editSupplier = (supplier: Supplier) => {
    setEditingSupplierId(supplier.id);
    setSupplierDraft({
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      notes: supplier.notes ?? "",
    });
    clearMessages();
    document.getElementById("purchasing-supplier-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const toggleSupplier = async (supplier: Supplier) => {
    const nextActive = !supplier.active;
    if (!window.confirm(`${nextActive ? "Reactivate" : "Deactivate"} ${supplier.name}?`)) return;
    clearMessages();
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/purchasing/suppliers/${supplier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
        body: JSON.stringify({
          name: supplier.name,
          contactPerson: supplier.contactPerson,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address,
          notes: supplier.notes,
          active: nextActive,
        }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      setSuccess(`Supplier ${nextActive ? "reactivated" : "deactivated"}.`);
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update supplier.");
    } finally {
      setSaving(false);
    }
  };

  const updateOrderLine = (index: number, field: keyof OrderLineDraft, value: string) => {
    setOrderLines((previous) => previous.map((line, lineIndex) =>
      lineIndex === index ? { ...line, [field]: value } : line
    ));
  };

  const handleCreatePurchaseOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearMessages();
    if (!selectedSupplierId) { setError("Select a supplier first."); return; }
    const validLines = orderLines.filter((line) => line.ingredientId && line.quantity && line.unitCost !== "");
    if (validLines.length === 0) { setError("Add at least one complete ingredient line."); return; }
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/purchasing/purchase-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
        body: JSON.stringify({
          supplierId: Number(selectedSupplierId),
          notes: purchaseNotes,
          items: validLines.map((line) => ({
            ingredientId: Number(line.ingredientId),
            quantity: Number(line.quantity),
            unitCost: Number(line.unitCost),
          })),
        }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      setSelectedSupplierId("");
      setPurchaseNotes("");
      setOrderLines([{ ingredientId: "", quantity: "", unitCost: "" }]);
      setSuccess("Purchase order created and marked as ordered.");
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create purchase order.");
    } finally {
      setSaving(false);
    }
  };

  const handleReceive = async (event: FormEvent<HTMLFormElement>, order: PurchaseOrder) => {
    event.preventDefault();
    clearMessages();
    const items = order.items
      .map((item) => ({ purchaseOrderItemId: item.id, quantity: Number(receiveDrafts[item.id] || 0) }))
      .filter((item) => item.quantity > 0);
    if (items.length === 0) { setError("Enter at least one quantity to receive."); return; }
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/purchasing/purchase-orders/${order.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
        body: JSON.stringify({ note: receiveNote, items }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      setReceivingOrderId(null);
      setReceiveDrafts({});
      setReceiveNote("");
      setSuccess(`Stock receipt recorded for ${order.poNumber}. Inventory has been updated.`);
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to receive purchase order.");
    } finally {
      setSaving(false);
    }
  };

  const cancelPurchaseOrder = async (order: PurchaseOrder) => {
    if (!window.confirm(`Cancel ${order.poNumber}? Any quantity already received will remain in inventory; the outstanding balance will be cancelled.`)) return;
    clearMessages();
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/purchasing/purchase-orders/${order.id}/cancel`, {
        method: "POST",
        headers: { "X-Admin-Key": adminKey },
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      setSuccess(`${order.poNumber} cancelled.`);
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel purchase order.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="purchasing-page">
      <div className="purchasing-heading">
        <div>
          <span className="manager-eyebrow">SUPPLIERS & STOCK PROCUREMENT</span>
          <h2>Supplier & Purchase Orders</h2>
          <p>Create supplier records, order ingredients and receive stock into inventory.</p>
        </div>
        <button className="manager-refresh-button" onClick={() => void loadOverview()} disabled={loading || saving}>
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </div>

      {error && <div className="manager-error">{error}</div>}
      {success && <div className="purchasing-success" role="status">{success}</div>}

      <section className="purchasing-summary">
        <article><span>Suppliers</span><strong>{activeSuppliers.length}</strong></article>
        <article><span>Awaiting / partial</span><strong>{pendingOrders.length}</strong></article>
        <article><span>Fully received</span><strong>{receivedOrders.length}</strong></article>
        <article><span>Total purchase orders</span><strong>{orders.length}</strong></article>
      </section>

      <section className="purchasing-panel" id="purchasing-supplier-form">
        <div className="purchasing-panel-heading">
          <div><span className="manager-eyebrow">SUPPLIER DIRECTORY</span><h3>{editingSupplierId ? "Edit supplier" : "Add supplier"}</h3></div>
          {editingSupplierId && <button type="button" className="purchasing-text-button" onClick={() => { setEditingSupplierId(null); setSupplierDraft(emptySupplier); }}>Cancel edit</button>}
        </div>
        <form className="purchasing-form-grid" onSubmit={handleSupplierSubmit}>
          <label>Supplier name<input value={supplierDraft.name} onChange={(event) => setSupplierDraft((old) => ({ ...old, name: event.target.value }))} maxLength={120} required placeholder="e.g. Fresh Foods Ltd." /></label>
          <label>Contact person<input value={supplierDraft.contactPerson} onChange={(event) => setSupplierDraft((old) => ({ ...old, contactPerson: event.target.value }))} maxLength={100} placeholder="Contact name" /></label>
          <label>Phone<input value={supplierDraft.phone} onChange={(event) => setSupplierDraft((old) => ({ ...old, phone: event.target.value }))} maxLength={30} placeholder="01XXXXXXXXX" /></label>
          <label>Email<input type="email" value={supplierDraft.email} onChange={(event) => setSupplierDraft((old) => ({ ...old, email: event.target.value }))} maxLength={120} placeholder="supplier@example.com" /></label>
          <label className="purchasing-wide">Address<input value={supplierDraft.address} onChange={(event) => setSupplierDraft((old) => ({ ...old, address: event.target.value }))} maxLength={250} placeholder="Supplier address" /></label>
          <label className="purchasing-wide">Notes<textarea value={supplierDraft.notes} onChange={(event) => setSupplierDraft((old) => ({ ...old, notes: event.target.value }))} maxLength={500} rows={2} placeholder="Optional supplier notes" /></label>
          <div className="purchasing-form-actions purchasing-wide">
            <button className="manager-primary-button" type="submit" disabled={saving}>{saving ? "Saving..." : editingSupplierId ? "Save supplier" : "Add supplier"}</button>
          </div>
        </form>

        <div className="purchasing-supplier-list">
          {suppliers.length === 0 ? <p className="purchasing-empty">No suppliers added yet.</p> : suppliers.map((supplier) => (
            <article className={`purchasing-supplier-card ${supplier.active ? "" : "inactive"}`} key={supplier.id}>
              <div className="purchasing-supplier-main">
                <strong>{supplier.name}</strong>
                <span>{supplier.contactPerson || "No contact person"}{supplier.phone ? ` · ${supplier.phone}` : ""}</span>
                <small>{supplier.email || "No email"}{supplier.address ? ` · ${supplier.address}` : ""}</small>
              </div>
              <span className={`purchasing-active-tag ${supplier.active ? "active" : "inactive"}`}>{supplier.active ? "ACTIVE" : "INACTIVE"}</span>
              <div className="purchasing-card-actions">
                <button type="button" onClick={() => editSupplier(supplier)} disabled={saving}>Edit</button>
                <button type="button" onClick={() => void toggleSupplier(supplier)} disabled={saving}>{supplier.active ? "Deactivate" : "Reactivate"}</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="purchasing-panel">
        <div className="purchasing-panel-heading">
          <div><span className="manager-eyebrow">PROCUREMENT</span><h3>Create purchase order</h3><p>Submitting creates an ORDERED purchase order. Stock changes only when quantities are received.</p></div>
        </div>
        {activeSuppliers.length === 0 ? <div className="purchasing-empty">Add and activate at least one supplier before creating a purchase order.</div> : (overview?.ingredients.length ?? 0) === 0 ? <div className="purchasing-empty">No active inventory ingredients are available to order.</div> : (
          <form onSubmit={handleCreatePurchaseOrder}>
            <div className="purchasing-form-grid purchasing-order-meta">
              <label>Supplier<select value={selectedSupplierId} onChange={(event) => setSelectedSupplierId(event.target.value)} required><option value="">Select supplier</option>{activeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
              <label className="purchasing-wide">Purchase notes<input value={purchaseNotes} onChange={(event) => setPurchaseNotes(event.target.value)} maxLength={500} placeholder="Optional delivery or order notes" /></label>
            </div>
            <div className="purchasing-lines-heading"><strong>Order items</strong><button type="button" className="purchasing-text-button" onClick={() => setOrderLines((old) => [...old, { ingredientId: "", quantity: "", unitCost: "" }])}>+ Add ingredient</button></div>
            <div className="purchasing-line-list">
              {orderLines.map((line, index) => (
                <div className="purchasing-line" key={index}>
                  <label>Ingredient<select value={line.ingredientId} onChange={(event) => updateOrderLine(index, "ingredientId", event.target.value)} required><option value="">Choose ingredient</option>{(overview?.ingredients ?? []).map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name} ({ingredient.unit})</option>)}</select></label>
                  <label>Quantity<input type="number" min="0.001" step="0.001" value={line.quantity} onChange={(event) => updateOrderLine(index, "quantity", event.target.value)} required /></label>
                  <label>Unit cost (৳)<input type="number" min="0" step="0.01" value={line.unitCost} onChange={(event) => updateOrderLine(index, "unitCost", event.target.value)} required /></label>
                  <button type="button" className="purchasing-remove-button" onClick={() => setOrderLines((old) => old.length > 1 ? old.filter((_, lineIndex) => lineIndex !== index) : old)} disabled={orderLines.length === 1}>Remove</button>
                </div>
              ))}
            </div>
            <div className="purchasing-form-actions"><button className="manager-primary-button" type="submit" disabled={saving}>{saving ? "Creating..." : "Create purchase order"}</button></div>
          </form>
        )}
      </section>

      <section className="purchasing-panel">
        <div className="purchasing-panel-heading"><div><span className="manager-eyebrow">PURCHASE HISTORY</span><h3>Purchase orders</h3><p>Track order values, partial deliveries and stock receipts.</p></div><span className="purchasing-count">{orders.length} orders</span></div>
        {orders.length === 0 ? <div className="purchasing-empty">Purchase orders will appear here after you create one.</div> : (
          <div className="purchasing-order-list">
            {orders.map((order) => {
              const canReceive = order.status === "ORDERED" || order.status === "PARTIALLY_RECEIVED";
              const isReceiving = receivingOrderId === order.id;
              return (
                <article className="purchasing-order-card" key={order.id}>
                  <div className="purchasing-order-top">
                    <div><span className="purchasing-po-number">{order.poNumber}</span><h4>{order.supplierName}</h4><small>Created {formatDate(order.createdAt)}</small></div>
                    <span className={`purchasing-status status-${order.status.toLowerCase()}`}>{order.status.replace(/_/g, " ")}</span>
                  </div>
                  {order.notes && <p className="purchasing-order-note">{order.notes}</p>}
                  <div className="purchasing-table-wrap">
                    <table className="purchasing-table"><thead><tr><th>Ingredient</th><th>Ordered</th><th>Received</th><th>Remaining</th><th>Unit cost</th><th>Line total</th></tr></thead><tbody>
                      {order.items.map((item) => <tr key={item.id}><td><strong>{item.ingredientName}</strong><small>{item.unit}</small></td><td>{formatQuantity(item.quantityOrdered)}</td><td>{formatQuantity(item.quantityReceived)}</td><td>{formatQuantity(item.remainingQuantity)}</td><td>{formatMoney(item.unitCost)}</td><td>{formatMoney(item.lineTotal)}</td></tr>)}
                    </tbody></table>
                  </div>
                  <div className="purchasing-order-footer"><strong>Order value: {formatMoney(order.totalAmount)}</strong><div>{order.receivedAt && <small>Fully received {formatDate(order.receivedAt)}</small>}{canReceive && <><button type="button" className="purchasing-receive-button" onClick={() => { setReceivingOrderId(isReceiving ? null : order.id); setReceiveDrafts({}); setReceiveNote(""); clearMessages(); }}>{isReceiving ? "Close receipt" : "Receive stock"}</button><button type="button" className="purchasing-cancel-button" onClick={() => void cancelPurchaseOrder(order)} disabled={saving}>Cancel order</button></>}</div></div>
                  {isReceiving && canReceive && (
                    <form className="purchasing-receive-form" onSubmit={(event) => void handleReceive(event, order)}>
                      <strong>Record delivery quantities</strong>
                      <div className="purchasing-receive-lines">{order.items.filter((item) => Number(item.remainingQuantity) > 0).map((item) => <label key={item.id}>{item.ingredientName}<small>{formatQuantity(item.remainingQuantity)} {item.unit} remaining</small><input type="number" min="0" max={Number(item.remainingQuantity)} step="0.001" value={receiveDrafts[item.id] ?? ""} onChange={(event) => setReceiveDrafts((old) => ({ ...old, [item.id]: event.target.value }))} placeholder="Quantity received" /></label>)}</div>
                      <label className="purchasing-receive-note">Delivery note<input value={receiveNote} onChange={(event) => setReceiveNote(event.target.value)} maxLength={150} placeholder="Optional delivery note" /></label>
                      <button type="submit" className="manager-primary-button" disabled={saving}>{saving ? "Recording..." : "Confirm receipt & update stock"}</button>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
