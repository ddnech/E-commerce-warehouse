import { useState } from "react";
import dayjs from "dayjs";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { adminApi } from "../../lib/api";
import { formatDateTime, MONTHS } from "../../lib/format";
import { useFetch } from "../../hooks/useFetch";
import { useAdmin } from "../../auth/AdminContext";
import { useWarehouses } from "../../components/admin/useWarehouses";
import { useProductOptions } from "../../components/admin/useProductOptions";
import { PageHeader, StatCard, Table, EmptyRow } from "../../components/admin/ui";
import Pagination from "../../components/ui/Pagination";

export default function StockHistory() {
  const { isSuper } = useAdmin();
  const warehouses = useWarehouses();
  const products = useProductOptions();
  const [filters, setFilters] = useState({ warehouse: "", product: "", year: String(dayjs().year()), month: "" });
  const [page, setPage] = useState(1);
  const set = (k) => (e) => {
    setFilters((f) => ({ ...f, [k]: e.target.value }));
    setPage(1);
  };

  const params = Object.fromEntries(Object.entries({ ...filters, page }).filter(([, v]) => v));
  const { data, loading } = useFetch(() => adminApi.get("/admin/stock-history", { params }).then((r) => r.data), [JSON.stringify(params)]);
  const years = Array.from({ length: 4 }, (_, i) => dayjs().year() - i);

  return (
    <div>
      <PageHeader title="Stock history" description="Every unit in and out: orders, transfers and manual changes." />

      <div className="mb-5 flex flex-wrap gap-2">
        {isSuper && (
          <select value={filters.warehouse} onChange={set("warehouse")} className="input w-auto" aria-label="Warehouse">
            <option value="">All warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        )}
        <select value={filters.product} onChange={set("product")} className="input w-auto max-w-64" aria-label="Product">
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select value={filters.year} onChange={set("year")} className="input w-auto" aria-label="Year">
          <option value="">Any year</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select value={filters.month} onChange={set("month")} disabled={!filters.year} className="input w-auto" aria-label="Month">
          <option value="">Whole year</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
      </div>

      {data && (
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <StatCard label="Units in" value={`+${data.totals.in}`} icon={ArrowUpRight} />
          <StatCard label="Units out" value={`-${data.totals.out}`} icon={ArrowDownRight} tone="teak" />
          <StatCard label="Net change" value={data.totals.in - data.totals.out} tone="sky" />
        </div>
      )}

      <Table loading={loading && !!data}>
        <thead>
          <tr>
            <th>When</th>
            <th>Product</th>
            {isSuper && <th>Warehouse</th>}
            <th className="text-right">Change</th>
            <th className="text-right">After</th>
            <th>Note</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {!data && <EmptyRow colSpan={7}>Loading…</EmptyRow>}
          {data?.data.length === 0 && <EmptyRow colSpan={7}>Nothing moved in this period.</EmptyRow>}
          {data?.data.map((h) => (
            <tr key={h.id}>
              <td className="whitespace-nowrap text-ink-soft">{formatDateTime(h.at)}</td>
              <td className="font-medium">{h.product}</td>
              {isSuper && <td className="text-ink-soft">{h.warehouse}</td>}
              <td className={`text-right font-semibold ${h.change > 0 ? "text-moss" : "text-teak"}`}>{h.change > 0 ? `+${h.change}` : h.change}</td>
              <td className="text-right text-ink-soft">{h.after}</td>
              <td className="max-w-72 truncate text-ink-soft" title={h.note}>{h.note}</td>
              <td className="text-ink-soft">{h.admin}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      {data && <Pagination page={page} totalPages={data.pagination.totalPages} onChange={setPage} />}
    </div>
  );
}
