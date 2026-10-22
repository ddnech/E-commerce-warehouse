import { useState } from "react";
import dayjs from "dayjs";
import { CircleDollarSign, Package, ShoppingCart } from "lucide-react";
import { adminApi } from "../../lib/api";
import { MONTHS, rupiah } from "../../lib/format";
import { useFetch } from "../../hooks/useFetch";
import { useCategories } from "../../hooks/useCategories";
import { useAdmin } from "../../auth/AdminContext";
import { useWarehouses } from "../../components/admin/useWarehouses";
import { PageHeader, StatCard, Table, EmptyRow } from "../../components/admin/ui";
import BarChart from "../../components/admin/BarChart";
import Skeleton from "../../components/ui/Skeleton";

function Share({ rows, total }) {
  if (!rows.length) return <p className="p-5 text-sm text-ink-soft">No sales in this period.</p>;
  return (
    <ul className="space-y-3 p-5">
      {rows.map((r) => {
        const pct = total ? Math.round((r.revenue / total) * 100) : 0;
        return (
          <li key={r.id ?? r.name} className="text-sm">
            <div className="flex justify-between gap-2">
              <span className="truncate">{r.name || "No category"}</span>
              <span className="shrink-0 text-ink-soft">{rupiah(r.revenue)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-canvas">
              <div className="h-full rounded-full bg-moss" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function SalesReport() {
  const { isSuper } = useAdmin();
  const warehouses = useWarehouses();
  const categories = useCategories();
  const [filters, setFilters] = useState({ year: String(dayjs().year()), month: "", warehouse: "", category: "" });
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
  const { data, loading } = useFetch(() => adminApi.get("/admin/reports/sales", { params }).then((r) => r.data.data), [JSON.stringify(params)]);

  const month = Number(filters.month);
  const periodLabel = month ? `${MONTHS[month - 1]} ${filters.year}` : filters.year;

  return (
    <div>
      <PageHeader title="Sales report" description="Paid orders only. Delivery costs aren't counted as sales." />

      <div className="mb-6 flex flex-wrap gap-2">
        <select value={filters.year} onChange={set("year")} className="input w-auto" aria-label="Year">
          {(data?.years || [dayjs().year()]).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select value={filters.month} onChange={set("month")} className="input w-auto" aria-label="Month">
          <option value="">Whole year</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        {isSuper && (
          <select value={filters.warehouse} onChange={set("warehouse")} className="input w-auto" aria-label="Warehouse">
            <option value="">All warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        )}
        <select value={filters.category} onChange={set("category")} className="input w-auto" aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {!data ? (
        <Skeleton className="h-96" />
      ) : (
        <div className={loading ? "opacity-60" : ""}>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label={`Revenue, ${periodLabel}`} value={rupiah(data.summary.revenue)} icon={CircleDollarSign} />
            <StatCard label="Paid orders" value={data.summary.orders} icon={ShoppingCart} tone="sky" />
            <StatCard label="Items sold" value={data.summary.items} icon={Package} tone="teak" />
          </div>

          <section className="panel mt-6 p-6">
            <h2 className="font-bold">{month ? "Revenue per day" : "Revenue per month"}</h2>
            <div className="mt-4">
              <BarChart
                data={data.timeline.map((t) => ({
                  label: month ? String(t.bucket) : MONTHS[t.bucket - 1].slice(0, 3),
                  title: month ? `${t.bucket} ${MONTHS[month - 1]}` : `${MONTHS[t.bucket - 1]} ${filters.year}`,
                  value: t.revenue,
                }))}
                format={rupiah}
              />
            </div>
          </section>

          <div className={`mt-6 grid gap-6 ${isSuper ? "lg:grid-cols-2" : ""}`}>
            <section className="panel">
              <h2 className="border-b border-line px-5 py-4 font-bold">By category</h2>
              <Share rows={data.by_category} total={data.summary.revenue} />
            </section>
            {isSuper && (
              <section className="panel">
                <h2 className="border-b border-line px-5 py-4 font-bold">By warehouse</h2>
                <Share rows={data.by_warehouse} total={data.summary.revenue} />
              </section>
            )}
          </div>

          <h2 className="mt-8 mb-3 font-bold">Products</h2>
          <Table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th className="text-right">Sold</th>
                <th className="text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.by_product.length === 0 && <EmptyRow colSpan={4}>No sales in this period.</EmptyRow>}
              {data.by_product.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.name}</td>
                  <td className="text-ink-soft">{p.category}</td>
                  <td className="text-right">{p.quantity}</td>
                  <td className="text-right whitespace-nowrap">{rupiah(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
