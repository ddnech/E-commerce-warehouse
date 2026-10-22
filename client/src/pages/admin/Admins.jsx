import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi, errorMessage } from "../../lib/api";
import { formatDate } from "../../lib/format";
import { useFetch } from "../../hooks/useFetch";
import { useWarehouses } from "../../components/admin/useWarehouses";
import { PageHeader, Table, EmptyRow } from "../../components/admin/ui";
import { Badge } from "../../components/ui/StatusBadge";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Field from "../../components/ui/Field";
import Modal from "../../components/ui/Modal";
import PasswordInput from "../../components/ui/PasswordInput";

function AdminForm({ admin, onSaved, onCancel }) {
  const warehouses = useWarehouses();
  const [form, setForm] = useState({
    username: admin?.username || "",
    first_name: admin?.first_name || "",
    last_name: admin?.last_name || "",
    warehouse_id: admin?.warehouse?.id ? String(admin.warehouse.id) : "",
    password: "",
  });
  const [busy, setBusy] = useState(false);
  const change = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isSuperRow = admin?.role === "super";

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = admin
        ? { first_name: form.first_name, last_name: form.last_name, password: form.password || undefined, warehouse_id: isSuperRow ? undefined : Number(form.warehouse_id) }
        : { ...form, warehouse_id: Number(form.warehouse_id) };
      const { data } = admin ? await adminApi.patch(`/admin/admins/${admin.id}`, body) : await adminApi.post("/admin/admins", body);
      toast.success(data.message);
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <Field label="First name" htmlFor="a-first">
        <input id="a-first" value={form.first_name} onChange={change("first_name")} className="input" required />
      </Field>
      <Field label="Last name" htmlFor="a-last">
        <input id="a-last" value={form.last_name} onChange={change("last_name")} className="input" required />
      </Field>
      <Field label="Username" htmlFor="a-username" hint={admin ? "Usernames can't be changed." : "Letters, numbers, dots and underscores."}>
        <input id="a-username" value={form.username} onChange={change("username")} disabled={!!admin} className="input" required />
      </Field>
      {!isSuperRow && (
        <Field label="Warehouse" htmlFor="a-warehouse">
          <select id="a-warehouse" value={form.warehouse_id} onChange={change("warehouse_id")} className="input" required>
            <option value="">Choose…</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </Field>
      )}
      <Field
        label={admin ? "New password" : "Password"}
        htmlFor="a-password"
        hint={admin ? "Leave empty to keep the current one." : "8+ characters with a capital, a number and a symbol."}
        className="sm:col-span-2"
      >
        <PasswordInput id="a-password" autoComplete="new-password" value={form.password} onChange={change("password")} required={!admin} />
      </Field>
      <div className="flex justify-end gap-3 sm:col-span-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button disabled={busy} className="btn-primary">{busy ? "Saving…" : admin ? "Save" : "Create admin"}</button>
      </div>
    </form>
  );
}

export default function Admins() {
  const { data, reload } = useFetch(() => adminApi.get("/admin/admins").then((r) => r.data.data), []);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const remove = async () => {
    try {
      const { data: res } = await adminApi.delete(`/admin/admins/${deleting.id}`);
      toast.success(res.message);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  };

  return (
    <div>
      <PageHeader title="Admins" description="Warehouse admins see and manage only their own warehouse.">
        <button onClick={() => setEditing({})} className="btn-primary">
          <Plus size={16} aria-hidden="true" /> New admin
        </button>
      </PageHeader>

      <Table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Username</th>
            <th>Role</th>
            <th>Warehouse</th>
            <th>Added</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {!data && <EmptyRow colSpan={6}>Loading…</EmptyRow>}
          {data?.map((a) => (
            <tr key={a.id}>
              <td className="font-medium">
                {a.first_name} {a.last_name}
              </td>
              <td className="font-mono text-xs">{a.username}</td>
              <td><Badge tone={a.role === "super" ? "teak" : "muted"}>{a.role === "super" ? "Super admin" : "Warehouse admin"}</Badge></td>
              <td className="text-ink-soft">{a.warehouse?.name || (a.role === "super" ? "All" : "-")}</td>
              <td className="text-ink-soft">{formatDate(a.created_at)}</td>
              <td>
                <div className="flex justify-end gap-1">
                  <button onClick={() => setEditing(a)} className="rounded-lg p-2 text-ink-soft hover:bg-canvas hover:text-ink" aria-label={`Edit ${a.username}`}>
                    <Pencil size={16} />
                  </button>
                  {a.role !== "super" && (
                    <button onClick={() => setDeleting(a)} className="rounded-lg p-2 text-ink-soft hover:bg-clay-tint hover:text-clay" aria-label={`Delete ${a.username}`}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? `Edit ${editing.username}` : "New warehouse admin"} wide>
        {editing && (
          <AdminForm
            key={editing.id || "new"}
            admin={editing.id ? editing : null}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
          />
        )}
      </Modal>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title={`Remove ${deleting?.username}?`} confirmLabel="Remove" danger onConfirm={remove}>
        They won't be able to log in any more. Their past actions stay in the stock history.
      </ConfirmDialog>
    </div>
  );
}
