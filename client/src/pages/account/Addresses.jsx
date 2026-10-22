import { useState } from "react";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api, { errorMessage } from "../../lib/api";
import { useFetch } from "../../hooks/useFetch";
import AddressForm from "../../components/shop/AddressForm";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import Skeleton from "../../components/ui/Skeleton";

export default function Addresses() {
  const { data: addresses, reload } = useFetch(() => api.get("/account/addresses").then((r) => r.data.data), []);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, address = edit
  const [deleting, setDeleting] = useState(null);

  const save = async (values) => {
    try {
      const { data } = editing.id ? await api.patch(`/account/addresses/${editing.id}`, values) : await api.post("/account/addresses", values);
      toast.success(data.message);
      setEditing(null);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const makePrimary = async (address) => {
    try {
      const { data } = await api.patch(`/account/addresses/${address.id}/primary`);
      toast.success(data.message);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const remove = async () => {
    try {
      const { data } = await api.delete(`/account/addresses/${deleting.id}`);
      toast.success(data.message);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Addresses</h2>
        <button onClick={() => setEditing({})} className="btn-primary btn-sm">
          <Plus size={15} aria-hidden="true" /> Add address
        </button>
      </div>

      {!addresses ? (
        <Skeleton className="h-40" />
      ) : addresses.length === 0 ? (
        <EmptyState icon={MapPin} title="No addresses yet" action={<button onClick={() => setEditing({})} className="btn-primary">Add your first address</button>}>
          Add where you'd like things delivered. We use it to find the nearest warehouse.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className={`panel flex flex-col p-5 ${a.is_primary ? "ring-2 ring-moss" : ""}`}>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{a.title}</span>
                {a.is_primary && <span className="rounded-full bg-moss-tint px-2 py-0.5 text-xs font-semibold text-moss">Main address</span>}
              </div>
              <p className="mt-2 text-sm text-ink-soft">{a.details}</p>
              <p className="text-sm text-ink-soft">
                {a.city.name}, {a.province.name} {a.postal_code}
              </p>
              <div className="mt-auto flex flex-wrap gap-1 pt-4">
                <button onClick={() => setEditing(a)} className="btn-ghost btn-sm">
                  <Pencil size={14} aria-hidden="true" /> Edit
                </button>
                {!a.is_primary && (
                  <button onClick={() => makePrimary(a)} className="btn-ghost btn-sm">
                    <Star size={14} aria-hidden="true" /> Make main
                  </button>
                )}
                <button onClick={() => setDeleting(a)} className="btn-ghost btn-sm hover:text-clay">
                  <Trash2 size={14} aria-hidden="true" /> Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit address" : "New address"} wide>
        {editing && <AddressForm key={editing.id || "new"} address={editing.id ? editing : null} onSubmit={save} onCancel={() => setEditing(null)} />}
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete this address?" confirmLabel="Delete" danger onConfirm={remove}>
        {deleting && (
          <>
            <strong className="text-ink">{deleting.title}</strong>, {deleting.details}. Past orders keep their delivery details.
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
