import { useState } from "react";
import { useSearchParams } from "react-router";
import { Check, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { adminApi, assetUrl, errorMessage } from "../../lib/api";
import { formatDate, formatDateTime, rupiah } from "../../lib/format";
import { useFetch } from "../../hooks/useFetch";
import { useDebounce } from "../../hooks/useDebounce";
import { useAdmin } from "../../auth/AdminContext";
import { useWarehouses } from "../../components/admin/useWarehouses";
import { PageHeader, SearchInput, Table, EmptyRow, Tabs } from "../../components/admin/ui";
import ProductArt from "../../components/art/ProductArt";
import StatusBadge from "../../components/ui/StatusBadge";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import Skeleton from "../../components/ui/Skeleton";

const TABS = [
  ["", "All"],
  ["waiting_confirmation", "Check payment"],
  ["processing", "To ship"],
  ["waiting_payment", "Unpaid"],
  ["payment_rejected", "Rejected"],
  ["shipped", "Shipped"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
];

const ACTIONS = {
  accept: { title: "Accept this payment?", label: "Accept payment", body: "Stock is taken from the warehouse. If it's short, the nearest other warehouse sends the rest automatically." },
  reject: { title: "Reject this payment?", label: "Reject", danger: true, reason: true, body: "The customer gets an email and can upload a new receipt." },
  ship: { title: "Mark as shipped?", label: "Ship it", body: "A tracking number is created and the customer is told their order is on the way." },
  cancel: { title: "Cancel this order?", label: "Cancel order", danger: true, reason: true, body: "Reserved stock goes back on the shelf. The customer gets an email." },
};

function OrderDetail({ id, onChanged }) {
  const { data: order, setData } = useFetch(() => adminApi.get(`/admin/orders/${id}`).then((r) => r.data.data), [id]);
  const [action, setAction] = useState(null);

  if (!order) return <Skeleton className="h-72" />;

  const run = async (reason) => {
    try {
      const { data } = await adminApi.post(`/admin/orders/${order.id}/${action}`, { reason });
      toast.success(data.message);
      setData(data.data);
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  };

  const key = order.status.key;
  const a = action && ACTIONS[action];

  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge status={order.status} />
        <span className="text-ink-soft">{formatDateTime(order.created_at)}</span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-canvas p-4">
          <p className="text-xs text-ink-soft">Customer</p>
          <p className="mt-1 font-semibold">{order.customer?.name}</p>
          <p className="text-ink-soft">{order.customer?.email}</p>
          {order.customer?.phone && <p className="text-ink-soft">{order.customer.phone}</p>}
        </div>
        <div className="rounded-xl bg-canvas p-4">
          <p className="text-xs text-ink-soft">Deliver to</p>
          {order.address ? (
            <p className="mt-1">
              {order.address.details}, {order.address.city}, {order.address.province} {order.address.postal_code}
            </p>
          ) : (
            <p className="mt-1 text-ink-soft">Address removed</p>
          )}
          <p className="mt-1 text-ink-soft">
            {order.courier?.toUpperCase()} {order.service} from {order.warehouse?.name}
          </p>
        </div>
      </div>

      <ul className="mt-5 divide-y divide-line">
        {order.items.map((i) => (
          <li key={i.id} className="flex items-center gap-3 py-2.5">
            <ProductArt product={i.product} className="h-11 w-11 shrink-0" rounded="rounded-lg" />
            <span className="min-w-0 flex-1 truncate">{i.product.name}</span>
            <span className="text-ink-soft">
              {i.quantity} × {rupiah(i.price)}
            </span>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-1 border-t border-line pt-3">
        <div className="flex justify-between">
          <dt className="text-ink-soft">Items</dt>
          <dd>{rupiah(order.total_price)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-soft">Delivery</dt>
          <dd>{rupiah(order.delivery_price)}</dd>
        </div>
        <div className="flex justify-between font-semibold">
          <dt>Total to receive</dt>
          <dd>{rupiah(order.grand_total)}</dd>
        </div>
      </dl>

      {order.cancel_reason && (
        <p className="mt-4 rounded-lg bg-clay-tint p-3 text-clay">
          {key === "cancelled" ? "Cancelled" : "Rejected"}: {order.cancel_reason}
        </p>
      )}
      {order.tracking_code && (
        <p className="mt-4 rounded-lg bg-moss-tint/60 p-3">
          Tracking number <strong className="font-mono">{order.tracking_code}</strong>, shipped {formatDateTime(order.shipped_at)}
        </p>
      )}

      {order.payment_proof && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold text-ink-soft">Transfer receipt</p>
          <a href={assetUrl(order.payment_proof)} target="_blank" rel="noreferrer">
            <img src={assetUrl(order.payment_proof)} alt="Transfer receipt" className="max-h-72 w-full rounded-xl bg-canvas object-contain" />
          </a>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        {["waiting_payment", "waiting_confirmation", "payment_rejected"].includes(key) && (
          <button onClick={() => setAction("cancel")} className="btn-ghost hover:text-clay">Cancel order</button>
        )}
        {key === "waiting_confirmation" && (
          <>
            <button onClick={() => setAction("reject")} className="btn-secondary">
              <X size={16} aria-hidden="true" /> Reject payment
            </button>
            <button onClick={() => setAction("accept")} className="btn-primary">
              <Check size={16} aria-hidden="true" /> Accept payment
            </button>
          </>
        )}
        {key === "processing" && (
          <button onClick={() => setAction("ship")} className="btn-primary">
            <Truck size={16} aria-hidden="true" /> Mark as shipped
          </button>
        )}
      </div>

      <ConfirmDialog
        open={!!a}
        onClose={() => setAction(null)}
        title={a?.title}
        confirmLabel={a?.label}
        cancelLabel="Go back"
        danger={a?.danger}
        withReason={a?.reason}
        onConfirm={run}
      >
        {a?.body}
      </ConfirmDialog>
    </div>
  );
}

export default function Orders() {
  const { isSuper } = useAdmin();
  const warehouses = useWarehouses();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const page = Number(params.get("page")) || 1;
  const warehouse = params.get("warehouse") || "";
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const openId = params.get("open");
  const [q, setQ] = useState("");
  const search = useDebounce(q.trim(), 350);

  const { data, loading, reload } = useFetch(
    () =>
      adminApi
        .get("/admin/orders", { params: { status: status || undefined, warehouse: warehouse || undefined, q: search || undefined, from: from || undefined, to: to || undefined, page } })
        .then((r) => r.data),
    [status, warehouse, search, from, to, page]
  );

  const set = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!("page" in changes) && !("open" in changes)) next.delete("page");
    setParams(next);
  };

  const counts = data?.counts || {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader title="Orders" description="Check payments, ship paid orders and handle cancellations." />

      <Tabs tabs={TABS.map(([k, l]) => [k, l, k ? counts[k] : total])} value={status} onChange={(k) => set({ status: k })} />

      <div className="mb-5 flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Invoice number" />
        {isSuper && (
          <select value={warehouse} onChange={(e) => set({ warehouse: e.target.value })} className="input w-auto" aria-label="Warehouse">
            <option value="">All warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        )}
        <input type="date" value={from} onChange={(e) => set({ from: e.target.value })} className="input w-auto" aria-label="From date" />
        <input type="date" value={to} onChange={(e) => set({ to: e.target.value })} className="input w-auto" aria-label="To date" />
      </div>

      <Table loading={loading && !!data}>
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Customer</th>
            {isSuper && <th>Warehouse</th>}
            <th>Date</th>
            <th>Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {!data && <EmptyRow colSpan={6}>Loading…</EmptyRow>}
          {data?.data.length === 0 && <EmptyRow colSpan={6}>No orders match.</EmptyRow>}
          {data?.data.map((o) => (
            <tr key={o.id} onClick={() => set({ open: String(o.id) })} className="cursor-pointer hover:bg-canvas">
              <td className="font-mono font-semibold">{o.invoice}</td>
              <td>{o.customer?.name}</td>
              {isSuper && <td className="text-ink-soft">{o.warehouse?.name}</td>}
              <td className="whitespace-nowrap text-ink-soft">{formatDate(o.created_at)}</td>
              <td className="whitespace-nowrap">{rupiah(o.grand_total)}</td>
              <td><StatusBadge status={o.status} /></td>
            </tr>
          ))}
        </tbody>
      </Table>
      {data && <Pagination page={page} totalPages={data.pagination.totalPages} onChange={(p) => set({ page: String(p) })} />}

      <Modal open={!!openId} onClose={() => set({ open: "" })} title={data?.data.find((o) => String(o.id) === openId)?.invoice || "Order"} wide>
        {openId && <OrderDetail key={openId} id={openId} onChanged={reload} />}
      </Modal>
    </div>
  );
}
