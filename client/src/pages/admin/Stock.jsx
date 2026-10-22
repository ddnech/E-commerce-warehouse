import { useState } from "react";
import { useSearchParams } from "react-router";
import { Minus, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi, errorMessage } from "../../lib/api";
import { useFetch } from "../../hooks/useFetch";
import { useDebounce } from "../../hooks/useDebounce";
import { useCategories } from "../../hooks/useCategories";
import { useAdmin } from "../../auth/AdminContext";
import { useWarehouses } from "../../components/admin/useWarehouses";
import { useProductOptions } from "../../components/admin/useProductOptions";
import { PageHeader, SearchInput, Table, EmptyRow } from "../../components/admin/ui";
import ProductArt from "../../components/art/ProductArt";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Field from "../../components/ui/Field";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";

function AdjustForm({ row, onDone }) {
  const [direction, setDirection] = useState(1);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const n = Number(amount) || 0;

  const submit = async (e) => {
    e.preventDefault();
    if (n <= 0) return toast.error("Enter how many.");
    setBusy(true);
    try {
      const { data } = await adminApi.patch(`/admin/stocks/${row.id}`, { change: n * direction, note: note.trim() || undefined });
      toast.success(data.message);
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5 text-sm">
      <p className="text-ink-soft">
        <strong className="text-ink">{row.product.name}</strong> at {row.warehouse.name}. {row.quantity} on the shelf, {row.reserved} reserved for orders.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setDirection(1)} className={`btn ${direction === 1 ? "btn-primary" : "btn-secondary"}`}>
          <Plus size={16} aria-hidden="true" /> Add
        </button>
        <button type="button" onClick={() => setDirection(-1)} className={`btn ${direction === -1 ? "btn-primary" : "btn-secondary"}`}>
          <Minus size={16} aria-hidden="true" /> Remove
        </button>
      </div>
      <Field label="How many" htmlFor="amount" hint={n > 0 ? `Stock becomes ${row.quantity + n * direction}.` : direction === -1 ? `Up to ${row.free} can be removed.` : ""}>
        <input id="amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} className="input" autoFocus />
      </Field>
      <Field label="Note" htmlFor="note" hint="For the stock history, like “Delivery from supplier” or “Damaged”.">
        <input id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} className="input" />
      </Field>
      <div className="flex justify-end">
        <button disabled={busy} className="btn-primary">{busy ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

function NewStockForm({ onDone }) {
  const { admin, isSuper } = useAdmin();
  const warehouses = useWarehouses();
  const products = useProductOptions();
  const [warehouseId, setWarehouseId] = useState(isSuper ? "" : String(admin.warehouse?.id || ""));
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!warehouseId || !productId) return toast.error("Pick a warehouse and a product.");
    setBusy(true);
    try {
      const { data } = await adminApi.post("/admin/stocks", { warehouse_id: Number(warehouseId), product_id: Number(productId), quantity: Number(quantity) || 0 });
      toast.success(data.message);
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Warehouse" htmlFor="ns-warehouse">
        <select id="ns-warehouse" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} disabled={!isSuper} className="input">
          <option value="">Choose…</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Product" htmlFor="ns-product">
        <select id="ns-product" value={productId} onChange={(e) => setProductId(e.target.value)} className="input">
          <option value="">Choose…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Starting quantity" htmlFor="ns-qty">
        <input id="ns-qty" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))} className="input" />
      </Field>
      <div className="flex justify-end">
        <button disabled={busy} className="btn-primary">{busy ? "Saving…" : "Add stock"}</button>
      </div>
    </form>
  );
}

export default function Stock() {
  const { isSuper } = useAdmin();
  const warehouses = useWarehouses();
  const categories = useCategories();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const search = useDebounce(q.trim(), 350);
  const page = Number(params.get("page")) || 1;
  const warehouse = params.get("warehouse") || "";
  const category = params.get("category") || "";
  const low = params.get("low") === "true";
  const [adjusting, setAdjusting] = useState(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const { data, loading, reload } = useFetch(
    () =>
      adminApi
        .get("/admin/stocks", { params: { q: search || undefined, warehouse: warehouse || undefined, category: category || undefined, low: low || undefined, page } })
        .then((r) => r.data),
    [search, warehouse, category, low, page]
  );

  const set = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!("page" in changes)) next.delete("page");
    setParams(next);
  };

  const remove = async () => {
    try {
      const { data: res } = await adminApi.delete(`/admin/stocks/${deleting.id}`);
      toast.success(res.message);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  };

  return (
    <div>
      <PageHeader title="Stock" description="What each warehouse has. Reserved units belong to paid orders that haven't shipped yet.">
        <button onClick={() => setAdding(true)} className="btn-primary">
          <Plus size={16} aria-hidden="true" /> Stock a product
        </button>
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={(v) => (setQ(v), set({}))} placeholder="Product name" />
        {isSuper && (
          <select value={warehouse} onChange={(e) => set({ warehouse: e.target.value })} className="input w-auto" aria-label="Warehouse">
            <option value="">All warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        )}
        <select value={category} onChange={(e) => set({ category: e.target.value })} className="input w-auto" aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <label className="ml-1 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={low} onChange={(e) => set({ low: e.target.checked ? "true" : "" })} className="h-4 w-4 accent-moss" />
          5 or fewer
        </label>
      </div>

      <Table loading={loading && !!data}>
        <thead>
          <tr>
            <th>Product</th>
            <th>Warehouse</th>
            <th className="text-right">On shelf</th>
            <th className="text-right">Reserved</th>
            <th className="text-right">Free</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {!data && <EmptyRow colSpan={6}>Loading…</EmptyRow>}
          {data?.data.length === 0 && <EmptyRow colSpan={6}>No stock matches.</EmptyRow>}
          {data?.data.map((r) => (
            <tr key={r.id}>
              <td>
                <div className="flex items-center gap-3">
                  <ProductArt product={r.product} className="h-10 w-10 shrink-0" rounded="rounded-lg" />
                  <div>
                    <p className="font-medium">{r.product.name}</p>
                    <p className="text-xs text-ink-soft">
                      {r.product.category}
                      {!r.product.is_active && " · hidden"}
                    </p>
                  </div>
                </div>
              </td>
              <td className="text-ink-soft">{r.warehouse.name}</td>
              <td className="text-right">{r.quantity}</td>
              <td className="text-right text-ink-soft">{r.reserved || "-"}</td>
              <td className={`text-right font-semibold ${r.free <= 0 ? "text-clay" : r.free <= 5 ? "text-teak" : ""}`}>{r.free}</td>
              <td>
                <div className="flex justify-end gap-1">
                  <button onClick={() => setAdjusting(r)} className="btn-ghost btn-sm">
                    <SlidersHorizontal size={14} aria-hidden="true" /> Adjust
                  </button>
                  {r.quantity === 0 && (
                    <button onClick={() => setDeleting(r)} className="rounded-lg p-2 text-ink-soft hover:bg-clay-tint hover:text-clay" aria-label="Remove empty row">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {data && <Pagination page={page} totalPages={data.pagination.totalPages} onChange={(p) => set({ page: String(p) })} />}

      <Modal open={!!adjusting} onClose={() => setAdjusting(null)} title="Adjust stock">
        {adjusting && (
          <AdjustForm
            key={adjusting.id}
            row={adjusting}
            onDone={() => {
              setAdjusting(null);
              reload();
            }}
          />
        )}
      </Modal>
      <Modal open={adding} onClose={() => setAdding(false)} title="Stock a product">
        {adding && (
          <NewStockForm
            onDone={() => {
              setAdding(false);
              reload();
            }}
          />
        )}
      </Modal>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title="Remove this empty row?" confirmLabel="Remove" danger onConfirm={remove}>
        {deleting?.product.name} won't be listed for {deleting?.warehouse.name} any more. You can stock it again later.
      </ConfirmDialog>
    </div>
  );
}
