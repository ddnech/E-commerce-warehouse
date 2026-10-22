import { useState } from "react";
import { adminApi } from "../../lib/api";
import { formatDate } from "../../lib/format";
import { useFetch } from "../../hooks/useFetch";
import { useDebounce } from "../../hooks/useDebounce";
import { PageHeader, SearchInput, Table, EmptyRow } from "../../components/admin/ui";
import { Badge } from "../../components/ui/StatusBadge";
import Pagination from "../../components/ui/Pagination";

export default function Customers() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebounce(q.trim(), 350);
  const { data, loading } = useFetch(() => adminApi.get("/admin/users", { params: { q: search || undefined, page } }).then((r) => r.data), [search, page]);

  return (
    <div>
      <PageHeader title="Customers" description="Everyone with a shop account.">
        <SearchInput value={q} onChange={(v) => (setQ(v), setPage(1))} placeholder="Username or email" />
      </PageHeader>
      <Table loading={loading && !!data}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Signed up with</th>
            <th>Email confirmed</th>
            <th className="text-right">Orders</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {!data && <EmptyRow colSpan={7}>Loading…</EmptyRow>}
          {data?.data.length === 0 && <EmptyRow colSpan={7}>No customers match.</EmptyRow>}
          {data?.data.map((u) => (
            <tr key={u.id}>
              <td>
                <p className="font-medium">{u.name || u.username}</p>
                <p className="text-xs text-ink-soft">@{u.username}</p>
              </td>
              <td className="text-ink-soft">{u.email}</td>
              <td className="text-ink-soft">{u.phone || "-"}</td>
              <td className="text-ink-soft">{u.signed_up_with === "google" ? "Google" : "Email"}</td>
              <td><Badge tone={u.verified ? "moss" : "sun"}>{u.verified ? "Yes" : "Not yet"}</Badge></td>
              <td className="text-right">{u.orders}</td>
              <td className="whitespace-nowrap text-ink-soft">{formatDate(u.joined)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      {data && <Pagination page={page} totalPages={data.pagination.totalPages} onChange={setPage} />}
    </div>
  );
}
