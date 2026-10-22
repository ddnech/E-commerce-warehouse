import { Link } from "react-router";
import dayjs from "dayjs";
import { AlertTriangle, ArrowLeftRight, CircleDollarSign, PackageCheck, Truck } from "lucide-react";
import { adminApi } from "../../lib/api";
import { formatDate, rupiah } from "../../lib/format";
import { useFetch } from "../../hooks/useFetch";
import { useAdmin } from "../../auth/AdminContext";
import { PageHeader, StatCard, Table, EmptyRow } from "../../components/admin/ui";
import BarChart from "../../components/admin/BarChart";
import StatusBadge from "../../components/ui/StatusBadge";
import Skeleton from "../../components/ui/Skeleton";

export default function Dashboard() {
  const { admin, isSuper } = useAdmin();
  const { data, error } = useFetch(() => adminApi.get("/admin/dashboard").then((r) => r.data.data), []);

  const greeting = dayjs().hour() < 11 ? "Good morning" : dayjs().hour() < 16 ? "Good afternoon" : "Good evening";

  if (error) return <p className="text-clay">Couldn't load the dashboard. Is the API running?</p>;

  return (
    <div>
      <PageHeader title={`${greeting}, ${admin.first_name}`} description={isSuper ? "Here's how all warehouses are doing." : `Here's how ${admin.warehouse?.name || "your warehouse"} is doing.`} />

      {!data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Sales this month" value={rupiah(data.month.revenue)} hint={`${data.month.orders} paid orders`} icon={CircleDollarSign} />
            <Link to="/admin/orders?status=waiting_confirmation">
              <StatCard label="Payments to check" value={data.todo.to_confirm} hint="Receipts waiting for you" icon={PackageCheck} tone="sky" />
            </Link>
            <Link to="/admin/orders?status=processing">
              <StatCard label="Ready to ship" value={data.todo.to_ship} hint="Paid and being prepared" icon={Truck} tone="teak" />
            </Link>
            <Link to="/admin/transfers?status=Pending">
              <StatCard label="Transfers to approve" value={data.todo.transfers} hint="Stock coming your way" icon={ArrowLeftRight} tone="sun" />
            </Link>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <section className="panel p-6">
              <h2 className="font-bold">Sales, last 12 months</h2>
              <p className="text-xs text-ink-soft">Paid orders only, before delivery costs.</p>
              <div className="mt-4">
                <BarChart
                  data={data.series.map((s) => ({ label: dayjs(`${s.month}-01`).format("MMM"), title: dayjs(`${s.month}-01`).format("MMMM YYYY"), value: s.revenue }))}
                  format={rupiah}
                />
              </div>
            </section>

            <section className="panel p-6">
              <h2 className="font-bold">Best sellers this month</h2>
              {data.top.length === 0 ? (
                <p className="mt-4 text-sm text-ink-soft">No paid orders yet this month.</p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {data.top.map((t, i) => (
                    <li key={t.id} className="flex items-center gap-3 text-sm">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-moss-tint text-xs font-bold text-moss">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate">{t.name}</span>
                      <span className="text-ink-soft">{t.quantity} sold</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold">Latest orders</h2>
                <Link to="/admin/orders" className="text-sm font-semibold text-moss hover:underline">All orders</Link>
              </div>
              <Table>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.length === 0 && <EmptyRow colSpan={5}>No orders yet.</EmptyRow>}
                  {data.recent.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link to={`/admin/orders?open=${o.id}`} className="font-mono font-semibold hover:underline">{o.invoice}</Link>
                      </td>
                      <td>{o.customer?.name}</td>
                      <td className="whitespace-nowrap text-ink-soft">{formatDate(o.created_at)}</td>
                      <td className="whitespace-nowrap">{rupiah(o.grand_total)}</td>
                      <td><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold">Running low</h2>
                <Link to="/admin/stock?low=true" className="text-sm font-semibold text-moss hover:underline">Stock</Link>
              </div>
              <div className="panel divide-y divide-line">
                {data.low_stock.length === 0 ? (
                  <p className="p-5 text-sm text-ink-soft">Everything is well stocked.</p>
                ) : (
                  data.low_stock.map((l) => (
                    <div key={l.id} className="flex items-center gap-3 p-4 text-sm">
                      <AlertTriangle size={16} className={l.free <= 0 ? "text-clay" : "text-teak"} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{l.product}</p>
                        <p className="text-xs text-ink-soft">{l.warehouse}</p>
                      </div>
                      <span className={`font-semibold ${l.free <= 0 ? "text-clay" : "text-teak"}`}>{Math.max(0, l.free)} free</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
