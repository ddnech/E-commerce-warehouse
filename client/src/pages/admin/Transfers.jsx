import { useState } from "react";
import { useSearchParams } from "react-router";
import { ArrowRight, Check, Plus, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { adminApi, errorMessage } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import { useFetch } from "../../hooks/useFetch";
import { useAdmin } from "../../auth/AdminContext";
import { useWarehouses } from "../../components/admin/useWarehouses";
import { useProductOptions } from "../../components/admin/useProductOptions";
import { PageHeader, Table, EmptyRow, Tabs } from "../../components/admin/ui";
import { Badge } from "../../components/ui/StatusBadge";
import Field from "../../components/ui/Field";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";

const STATUS = { Pending: ["sun", "Waiting"], Approve: ["moss", "Done"], Reject: ["clay", "Rejected"] };

function NewTransfer({ onDone }) {
  const { admin, isSuper } = useAdmin();
  const warehouses = useWarehouses();
  const products = useProductOptions();
  const [form, setForm] = useState({ from: isSuper ? "" : String(admin.warehouse?.id || ""), to: "", product: "", quantity: "" });
  const [busy, setBusy] = useState(false);
  const change = (k) => (e) => setForm((f) => ({ ...f, [k]: k === "quantity" ? e.target.value.replace(/\D/g, "") : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.from || !form.to || !form.product || !Number(form.quantity)) return toast.error("Fill in every field.");
    setBusy(true);
    try {
      const { data } = await adminApi.post("/admin/transfers", {
        from_warehouse_id: Number(form.from),
        to_warehouse_id: Number(form.to),
        product_id: Number(form.product),
        quantity: Number(form.quantity),
      });
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Send from" htmlFor="t-from">
          <select id="t-from" value={form.from} onChange={change("from")} disabled={!isSuper} className="input">
            <option value="">Choose…</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Send to" htmlFor="t-to">
          <select id="t-to" value={form.to} onChange={change("to")} className="input">
            <option value="">Choose…</option>
            {warehouses
              .filter((w) => String(w.id) !== form.from)
              .map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
          </select>
        </Field>
      </div>
      <Field label="Product" htmlFor="t-product">
        <select id="t-product" value={form.product} onChange={change("product")} className="input">
          <option value="">Choose…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Quantity" htmlFor="t-qty">
        <input id="t-qty" inputMode="numeric" value={form.quantity} onChange={change("quantity")} className="input" />
      </Field>
      <p className="text-xs text-ink-soft">Stock moves once the receiving warehouse approves.</p>
      <div className="flex justify-end">
        <button disabled={busy} className="btn-primary">{busy ? "Sending…" : "Request transfer"}</button>
      </div>
    </form>
  );
}

export default function Transfers() {
  const { isSuper } = useAdmin();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const direction = params.get("direction") || "";
  const page = Number(params.get("page")) || 1;
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(null);

  const { data, loading, reload } = useFetch(
    () => adminApi.get("/admin/transfers", { params: { status: status || undefined, direction: direction || undefined, page } }).then((r) => r.data),
    [status, direction, page]
  );

  const set = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!("page" in changes)) next.delete("page");
    setParams(next);
  };

  const decide = async (t, action) => {
    setBusy(t.id);
    try {
      const { data: res } = await adminApi.post(`/admin/transfers/${t.id}/${action}`);
      toast.success(res.message);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader title="Transfers" description="Stock moving between warehouses. Automatic ones happen when an order needs more than its warehouse has.">
        <button onClick={() => setCreating(true)} className="btn-primary">
          <Plus size={16} aria-hidden="true" /> New transfer
        </button>
      </PageHeader>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <Tabs
          tabs={[["", "All"], ["Pending", "Waiting"], ["Approve", "Done"], ["Reject", "Rejected"]]}
          value={status}
          onChange={(k) => set({ status: k })}
        />
        {!isSuper && (
          <select value={direction} onChange={(e) => set({ direction: e.target.value })} className="input w-auto" aria-label="Direction">
            <option value="">Incoming and outgoing</option>
            <option value="in">Incoming</option>
            <option value="out">Outgoing</option>
          </select>
        )}
      </div>

      <Table loading={loading && !!data}>
        <thead>
          <tr>
            <th>Code</th>
            <th>Product</th>
            <th>Route</th>
            <th className="text-right">Qty</th>
            <th>Requested</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {!data && <EmptyRow colSpan={7}>Loading…</EmptyRow>}
          {data?.data.length === 0 && <EmptyRow colSpan={7}>No transfers here.</EmptyRow>}
          {data?.data.map((t) => {
            const [tone, label] = STATUS[t.status] || ["muted", t.status];
            return (
              <tr key={t.id}>
                <td>
                  <span className="flex items-center gap-1.5 font-mono text-xs">
                    {t.automatic && <Zap size={13} className="text-teak" aria-label="Automatic" />}
                    {t.code}
                  </span>
                </td>
                <td className="font-medium">{t.product?.name || "Removed product"}</td>
                <td>
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-ink-soft">
                    {t.from.name} <ArrowRight size={13} aria-hidden="true" /> {t.to.name}
                  </span>
                </td>
                <td className="text-right">{t.quantity}</td>
                <td className="whitespace-nowrap text-ink-soft">{formatDateTime(t.created_at)}</td>
                <td><Badge tone={tone}>{label}</Badge></td>
                <td>
                  {t.can_decide && (
                    <div className="flex justify-end gap-1">
                      <button onClick={() => decide(t, "reject")} disabled={busy === t.id} className="rounded-lg p-2 text-ink-soft hover:bg-clay-tint hover:text-clay" aria-label="Reject">
                        <X size={16} />
                      </button>
                      <button onClick={() => decide(t, "approve")} disabled={busy === t.id} className="btn-primary btn-sm">
                        <Check size={14} aria-hidden="true" /> Approve
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      {data && <Pagination page={page} totalPages={data.pagination.totalPages} onChange={(p) => set({ page: String(p) })} />}

      <Modal open={creating} onClose={() => setCreating(false)} title="New transfer">
        {creating && (
          <NewTransfer
            onDone={() => {
              setCreating(false);
              reload();
            }}
          />
        )}
      </Modal>
    </div>
  );
}
