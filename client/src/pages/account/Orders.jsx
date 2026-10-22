import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Package, Search } from "lucide-react";
import api from "../../lib/api";
import { formatDate, plural, rupiah } from "../../lib/format";
import { useFetch } from "../../hooks/useFetch";
import { useDebounce } from "../../hooks/useDebounce";
import ProductArt from "../../components/art/ProductArt";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import Pagination from "../../components/ui/Pagination";
import Skeleton from "../../components/ui/Skeleton";

const TABS = [
  ["", "All"],
  ["waiting_payment", "To pay"],
  ["waiting_confirmation", "Checking"],
  ["processing", "Preparing"],
  ["shipped", "On the way"],
  ["completed", "Delivered"],
  ["cancelled", "Cancelled"],
];

export default function Orders() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const page = Number(params.get("page")) || 1;
  const [q, setQ] = useState(params.get("q") || "");
  const search = useDebounce(q.trim(), 350);

  const { data, loading } = useFetch(
    () => api.get("/orders", { params: { status: status || undefined, q: search || undefined, page } }).then((r) => r.data),
    [status, search, page]
  );

  const go = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!("page" in changes)) next.delete("page");
    setParams(next);
  };

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Orders</h2>
        <label className="relative sm:w-64">
          <span className="sr-only">Search by invoice number</span>
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Invoice number" className="input rounded-full" style={{ paddingLeft: "2.25rem" }} />
        </label>
      </div>

      <div className="scrollbar-none mb-6 flex gap-1 overflow-x-auto" role="tablist">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={status === key}
            onClick={() => go({ status: key })}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm ${status === key ? "bg-ink text-white" : "text-ink-soft hover:bg-ink/5"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="space-y-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : data.data.length === 0 ? (
        <EmptyState icon={Package} title={status || search ? "No orders match that" : "No orders yet"} action={<Link to="/shop" className="btn-primary">Go shopping</Link>}>
          {status || search ? "Try another tab or search." : "When you place an order it shows up here, with its delivery status."}
        </EmptyState>
      ) : (
        <>
          <ul className={`space-y-4 ${loading ? "opacity-60" : ""}`}>
            {data.data.map((o) => (
              <li key={o.id}>
                <Link to={`/account/orders/${o.invoice}`} className="panel block p-5 transition-shadow hover:shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold">{o.invoice}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <span className="text-sm text-ink-soft">{formatDate(o.created_at)}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex -space-x-3">
                      {o.items.slice(0, 3).map((i) => (
                        <ProductArt key={i.id} product={i.product} className="h-14 w-14 ring-2 ring-surface" rounded="rounded-xl" />
                      ))}
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="line-clamp-1 font-medium">{o.items[0]?.product.name}</p>
                      {o.items.length > 1 && <p className="text-ink-soft">and {plural(o.items.length - 1, "more item")}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-ink-soft">Total</p>
                      <p className="price">{rupiah(o.grand_total)}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={data.pagination.totalPages} onChange={(p) => go({ page: String(p) })} />
        </>
      )}
    </div>
  );
}
