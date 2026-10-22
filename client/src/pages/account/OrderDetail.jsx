import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import dayjs from "dayjs";
import { ArrowLeft, Check, Copy, PackageSearch, Truck, Upload } from "lucide-react";
import { toast } from "sonner";
import api, { assetUrl, errorMessage } from "../../lib/api";
import { formatDateTime, rupiah } from "../../lib/format";
import { useFetch } from "../../hooks/useFetch";
import { useObjectUrl } from "../../hooks/useObjectUrl";
import { useShop } from "../../auth/ShopContext";
import ProductArt from "../../components/art/ProductArt";
import StatusBadge from "../../components/ui/StatusBadge";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";

const STEPS = [
  ["placed", "Order placed"],
  ["paid", "Payment checked"],
  ["processing", "Being prepared"],
  ["shipped", "On the way"],
  ["completed", "Delivered"],
];

const REACHED = {
  waiting_payment: 0,
  payment_rejected: 0,
  waiting_confirmation: 0,
  processing: 2,
  shipped: 3,
  completed: 4,
};

function Timeline({ order }) {
  const reached = REACHED[order.status.key] ?? 0;
  const dates = { placed: order.created_at, shipped: order.shipped_at, completed: order.completed_at };
  return (
    <ol className="grid grid-cols-5 gap-2">
      {STEPS.map(([key, label], i) => {
        const done = i <= reached;
        return (
          <li key={key} className="flex flex-col items-center text-center">
            <span className="relative flex w-full items-center justify-center">
              {i > 0 && <span className={`absolute right-1/2 h-0.5 w-full ${done ? "bg-moss" : "bg-line"}`} />}
              <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${done ? "bg-moss text-white" : "border-2 border-line bg-surface text-ink-soft"}`}>
                {done ? <Check size={16} aria-hidden="true" /> : <span className="text-xs">{i + 1}</span>}
              </span>
            </span>
            <span className={`mt-2 text-xs font-medium ${done ? "text-ink" : "text-ink-soft"}`}>{label}</span>
            {dates[key] && done && <span className="text-[0.7rem] text-ink-soft">{dayjs(dates[key]).format("D MMM")}</span>}
          </li>
        );
      })}
    </ol>
  );
}

function Countdown({ deadline }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const left = dayjs(deadline).diff(now, "minute");
  if (left <= 0) return <span className="font-semibold text-clay">The payment time is up. This order will be cancelled shortly.</span>;
  const h = Math.floor(left / 60);
  const m = left % 60;
  return (
    <span>
      Pay within <strong className="text-ink">{h > 0 ? `${h} h ` : ""}{m} min</strong>, before {formatDateTime(deadline)}.
    </span>
  );
}

function PaymentBox({ order, onUpdated }) {
  const { config } = useShop();
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const preview = useObjectUrl(file);

  const copy = (text) => navigator.clipboard?.writeText(String(text)).then(() => toast.success("Copied"));

  const pick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Pick a photo or screenshot of the receipt.");
    if (f.size > 5 * 1024 * 1024) return toast.error("That image is over 5 MB.");
    setFile(f);
  };

  const upload = async () => {
    const form = new FormData();
    form.append("proof", file);
    setBusy(true);
    try {
      const { data } = await api.post(`/orders/${order.invoice}/payment`, form);
      toast.success(data.message);
      setFile(null);
      onUpdated(data.data);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel p-6">
      <h2 className="text-xl font-bold">Pay by bank transfer</h2>
      {order.status.key === "payment_rejected" && (
        <p className="mt-3 rounded-xl bg-clay-tint p-4 text-sm text-clay">
          We couldn't accept the last receipt: {order.cancel_reason}. Please upload a clearer one.
        </p>
      )}
      <p className="mt-3 text-sm text-ink-soft">
        <Countdown deadline={order.payment_deadline} />
      </p>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-canvas p-4">
          <dt className="text-xs text-ink-soft">Transfer to</dt>
          <dd className="mt-1 flex items-center justify-between gap-2 font-semibold">
            {config.bankAccount || "Ask the store for the account"}
            {config.bankAccount && (
              <button onClick={() => copy(config.bankAccount)} className="text-ink-soft hover:text-ink" aria-label="Copy account">
                <Copy size={15} />
              </button>
            )}
          </dd>
        </div>
        <div className="rounded-xl bg-canvas p-4">
          <dt className="text-xs text-ink-soft">Exact amount</dt>
          <dd className="mt-1 flex items-center justify-between gap-2">
            <span className="price text-lg">{rupiah(order.grand_total)}</span>
            <button onClick={() => copy(order.grand_total)} className="text-ink-soft hover:text-ink" aria-label="Copy amount">
              <Copy size={15} />
            </button>
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
        {preview && <img src={preview} alt="Receipt preview" className="h-24 w-24 rounded-xl object-cover" />}
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} className="hidden" />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => input.current.click()} className="btn-secondary">
            <Upload size={16} aria-hidden="true" /> {file ? "Pick another" : "Choose receipt photo"}
          </button>
          {file && (
            <button onClick={upload} disabled={busy} className="btn-primary">
              {busy ? "Uploading…" : "Send receipt"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default function OrderDetail() {
  const { invoice } = useParams();
  const location = useLocation();
  const { data: order, error, setData } = useFetch(() => api.get(`/orders/${invoice}`).then((r) => r.data.data), [invoice]);
  const [confirm, setConfirm] = useState(null); // "cancel" | "received"

  useEffect(() => {
    if (location.state?.justPlaced) toast.success("Order placed! Pay by transfer to get it moving.");
  }, []);

  if (error) {
    return <EmptyState icon={PackageSearch} title="Order not found" action={<Link to="/account/orders" className="btn-primary">All orders</Link>}>{errorMessage(error)}</EmptyState>;
  }
  if (!order) return <Skeleton className="h-96" />;

  const act = async (action) => {
    try {
      const { data } = await api.post(`/orders/${order.invoice}/${action}`);
      toast.success(data.message);
      setData(data.data);
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  };

  const canPay = ["waiting_payment", "payment_rejected"].includes(order.status.key);
  const cancelled = order.status.key === "cancelled";

  return (
    <div className="space-y-6">
      <Link to="/account/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-moss hover:underline">
        <ArrowLeft size={15} aria-hidden="true" /> All orders
      </Link>

      <section className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-mono text-xl font-bold">{order.invoice}</h2>
            <p className="mt-1 text-sm text-ink-soft">Placed {formatDateTime(order.created_at)}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="mt-8">
          {cancelled ? (
            <p className="rounded-xl bg-canvas p-4 text-sm text-ink-soft">
              This order was cancelled{order.cancel_reason ? `: ${order.cancel_reason}` : "."} Any reserved stock went back on the shelf.
            </p>
          ) : (
            <Timeline order={order} />
          )}
        </div>
        {order.status.key === "waiting_confirmation" && (
          <p className="mt-6 rounded-xl bg-sky-tint p-4 text-sm text-sky">We've got your receipt. A warehouse admin will check it, usually within a day.</p>
        )}
        {order.tracking_code && (
          <p className="mt-6 flex items-center gap-2 rounded-xl bg-moss-tint/50 p-4 text-sm">
            <Truck size={18} className="text-moss" aria-hidden="true" />
            {order.courier?.toUpperCase()} tracking number <strong className="font-mono">{order.tracking_code}</strong>
          </p>
        )}
      </section>

      {canPay && <PaymentBox order={order} onUpdated={setData} />}

      <div className="grid gap-6 md:grid-cols-[1fr_18rem]">
        <section className="panel p-6">
          <h2 className="text-xl font-bold">Items</h2>
          <ul className="mt-4 divide-y divide-line">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-center gap-4 py-3">
                <ProductArt product={i.product} className="h-16 w-16 shrink-0" rounded="rounded-xl" />
                <div className="min-w-0 flex-1 text-sm">
                  {i.product.id ? (
                    <Link to={`/products/${i.product.id}`} className="font-medium hover:underline">{i.product.name}</Link>
                  ) : (
                    <span className="font-medium">{i.product.name}</span>
                  )}
                  <p className="text-ink-soft">
                    {i.quantity} × {rupiah(i.price)}
                  </p>
                </div>
                <span className="price">{rupiah(i.subtotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Items</dt>
              <dd>{rupiah(order.total_price)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">
                Delivery ({order.courier?.toUpperCase()} {order.service})
              </dt>
              <dd>{rupiah(order.delivery_price)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd className="price">{rupiah(order.grand_total)}</dd>
            </div>
          </dl>
        </section>

        <div className="space-y-6">
          <section className="panel p-6 text-sm">
            <h2 className="text-lg font-bold">Delivery to</h2>
            {order.address ? (
              <p className="mt-3 text-ink-soft">
                <span className="font-semibold text-ink">{order.address.title}</span>
                <br />
                {order.address.details}
                <br />
                {order.address.city}, {order.address.province} {order.address.postal_code}
              </p>
            ) : (
              <p className="mt-3 text-ink-soft">Address removed.</p>
            )}
            {order.warehouse && <p className="mt-4 text-ink-soft">Ships from {order.warehouse.name}</p>}
          </section>

          {order.payment_proof && (
            <section className="panel p-6 text-sm">
              <h2 className="text-lg font-bold">Your receipt</h2>
              <a href={assetUrl(order.payment_proof)} target="_blank" rel="noreferrer">
                <img src={assetUrl(order.payment_proof)} alt="Transfer receipt" className="mt-3 max-h-56 w-full rounded-xl bg-canvas object-contain" />
              </a>
            </section>
          )}

          {(canPay || order.status.key === "shipped") && (
            <div className="flex flex-col gap-2">
              {order.status.key === "shipped" && (
                <button onClick={() => setConfirm("received")} className="btn-primary">I've received it</button>
              )}
              {canPay && (
                <button onClick={() => setConfirm("cancel")} className="btn-ghost hover:text-clay">Cancel this order</button>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirm === "cancel"}
        onClose={() => setConfirm(null)}
        title="Cancel this order?"
        confirmLabel="Yes, cancel it"
        danger
        onConfirm={() => act("cancel")}
      >
        The items go back on sale. You can't undo this, but you can always order again.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === "received"}
        onClose={() => setConfirm(null)}
        title="Got everything?"
        confirmLabel="Yes, it arrived"
        cancelLabel="Not yet"
        onConfirm={() => act("received")}
      >
        This marks the order as delivered. If you don't confirm, it's done automatically a few days after shipping.
      </ConfirmDialog>
    </div>
  );
}
