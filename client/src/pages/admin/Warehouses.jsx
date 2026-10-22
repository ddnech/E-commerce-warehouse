import { useRef, useState } from "react";
import { ImagePlus, MapPin, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi, assetUrl, errorMessage } from "../../lib/api";
import { useFetch } from "../../hooks/useFetch";
import { useObjectUrl } from "../../hooks/useObjectUrl";
import { useRegions } from "../../hooks/useRegions";
import { useAdmin } from "../../auth/AdminContext";
import { clearWarehouseCache } from "../../components/admin/useWarehouses";
import { PageHeader } from "../../components/admin/ui";
import { Drawing } from "../../components/art/ProductArt";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Field from "../../components/ui/Field";
import Modal from "../../components/ui/Modal";
import Skeleton from "../../components/ui/Skeleton";

function WarehouseForm({ warehouse, onSaved, onCancel }) {
  const [form, setForm] = useState({
    warehouse_name: warehouse?.warehouse_name || "",
    address_warehouse: warehouse?.address_warehouse || "",
    province_id: warehouse?.province_id ? String(warehouse.province_id) : "",
    city_id: warehouse?.city_id ? String(warehouse.city_id) : "",
    warehouse_contact: warehouse?.warehouse_contact || "",
  });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const preview = useObjectUrl(file);
  const { provinces, cities } = useRegions(form.province_id);
  const change = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value, ...(k === "province_id" ? { city_id: "" } : {}) }));

  const submit = async (e) => {
    e.preventDefault();
    if (Object.values(form).some((v) => !String(v).trim())) return toast.error("Fill in every field.");
    const body = new FormData();
    Object.entries(form).forEach(([k, v]) => body.append(k, String(v).trim()));
    if (file) body.append("image", file);
    setBusy(true);
    try {
      const { data } = warehouse ? await adminApi.patch(`/admin/warehouses/${warehouse.id}`, body) : await adminApi.post("/admin/warehouses", body);
      toast.success(data.message);
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const shown = preview || assetUrl(warehouse?.warehouse_img);
  return (
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <Field label="Name" htmlFor="w-name" className="sm:col-span-2">
        <input id="w-name" value={form.warehouse_name} onChange={change("warehouse_name")} className="input" placeholder="Furnifor Bandung" />
      </Field>
      <Field label="Street address" htmlFor="w-address" className="sm:col-span-2">
        <textarea id="w-address" rows={2} value={form.address_warehouse} onChange={change("address_warehouse")} className="input resize-none" />
      </Field>
      <Field label="Province" htmlFor="w-province">
        <select id="w-province" value={form.province_id} onChange={change("province_id")} className="input">
          <option value="">Choose…</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </Field>
      <Field label="City" htmlFor="w-city">
        <select id="w-city" value={form.city_id} onChange={change("city_id")} disabled={!form.province_id} className="input">
          <option value="">Choose…</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Phone" htmlFor="w-contact">
        <input id="w-contact" type="tel" value={form.warehouse_contact} onChange={change("warehouse_contact")} className="input" />
      </Field>
      <div>
        <p className="mb-1.5 text-sm font-medium">Photo</p>
        <button type="button" onClick={() => input.current.click()} className="flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-line text-sm text-ink-soft hover:border-moss">
          {shown ? <img src={shown} alt="" className="h-full w-full object-cover" /> : <><ImagePlus size={16} aria-hidden="true" /> Optional</>}
        </button>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
      </div>
      <p className="text-xs text-ink-soft sm:col-span-2">The map position comes from the address. With an OpenCage key it's exact, otherwise the city centre is used.</p>
      <div className="flex justify-end gap-3 sm:col-span-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button disabled={busy} className="btn-primary">{busy ? "Saving…" : "Save warehouse"}</button>
      </div>
    </form>
  );
}

export default function Warehouses() {
  const { isSuper } = useAdmin();
  const { data, reload } = useFetch(() => adminApi.get("/admin/warehouses").then((r) => r.data.data), []);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const saved = () => {
    setEditing(null);
    clearWarehouseCache();
    reload();
  };

  const remove = async () => {
    try {
      const { data: res } = await adminApi.delete(`/admin/warehouses/${deleting.id}`);
      toast.success(res.message);
      saved();
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  };

  return (
    <div>
      <PageHeader title="Warehouses" description="Each one is a store and a shipping point.">
        {isSuper && (
          <button onClick={() => setEditing({})} className="btn-primary">
            <Plus size={16} aria-hidden="true" /> New warehouse
          </button>
        )}
      </PageHeader>

      {!data ? (
        <Skeleton className="h-64" />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((w) => (
            <li key={w.id} className="panel overflow-hidden">
              {w.warehouse_img ? (
                <img src={assetUrl(w.warehouse_img)} alt="" className="h-36 w-full object-cover" />
              ) : (
                <div className="flex h-36 items-end justify-center bg-room-work" aria-hidden="true">
                  <Drawing kind="bookcase" fabric="#7f6a8e" className="h-32" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold">{w.warehouse_name}</h2>
                  {isSuper && (
                    <div className="-mt-1 -mr-2 flex">
                      <button onClick={() => setEditing(w)} className="rounded-lg p-2 text-ink-soft hover:bg-canvas hover:text-ink" aria-label={`Edit ${w.warehouse_name}`}>
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => setDeleting(w)} className="rounded-lg p-2 text-ink-soft hover:bg-clay-tint hover:text-clay" aria-label={`Delete ${w.warehouse_name}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-2 flex items-start gap-2 text-sm text-ink-soft">
                  <MapPin size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {w.address_warehouse}, {w.City?.name}, {w.Province?.name}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-ink-soft">
                  <Phone size={15} className="shrink-0" aria-hidden="true" /> {w.warehouse_contact}
                </p>
                <div className="mt-4 flex gap-6 border-t border-line pt-4 text-sm">
                  <p>
                    <span className="block font-display text-xl font-bold">{Number(w.total_stock)}</span>
                    <span className="text-xs text-ink-soft">units in stock</span>
                  </p>
                  <p>
                    <span className="block font-display text-xl font-bold">{Number(w.admin_count)}</span>
                    <span className="text-xs text-ink-soft">admins</span>
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit warehouse" : "New warehouse"} wide>
        {editing && <WarehouseForm key={editing.id || "new"} warehouse={editing.id ? editing : null} onSaved={saved} onCancel={() => setEditing(null)} />}
      </Modal>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title={`Delete ${deleting?.warehouse_name}?`} confirmLabel="Delete" danger onConfirm={remove}>
        A warehouse can only be deleted once it's empty, has no open orders and no admins.
      </ConfirmDialog>
    </div>
  );
}
