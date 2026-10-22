import { useRef, useState } from "react";
import { ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi, assetUrl, errorMessage } from "../../lib/api";
import { plural } from "../../lib/format";
import { useFetch } from "../../hooks/useFetch";
import { useObjectUrl } from "../../hooks/useObjectUrl";
import { clearCategoryCache } from "../../hooks/useCategories";
import { useAdmin } from "../../auth/AdminContext";
import { PageHeader } from "../../components/admin/ui";
import { Drawing } from "../../components/art/ProductArt";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Field from "../../components/ui/Field";
import Modal from "../../components/ui/Modal";
import Skeleton from "../../components/ui/Skeleton";

function CategoryForm({ category, onSaved, onCancel }) {
  const [name, setName] = useState(category?.name || "");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const preview = useObjectUrl(file);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Give the category a name.");
    const form = new FormData();
    form.append("name", name.trim());
    if (file) form.append("image", file);
    setBusy(true);
    try {
      const { data } = category ? await adminApi.patch(`/admin/categories/${category.id}`, form) : await adminApi.post("/admin/categories", form);
      toast.success(data.message);
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const shown = preview || assetUrl(category?.category_img);
  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Name" htmlFor="cat-name">
        <input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} className="input" />
      </Field>
      <div>
        <p className="mb-2 text-sm font-medium">Picture <span className="font-normal text-ink-soft">(optional)</span></p>
        <button type="button" onClick={() => input.current.click()} className="flex h-28 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-line text-sm text-ink-soft hover:border-moss">
          {shown ? <img src={shown} alt="" className="h-full w-full object-cover" /> : <span className="flex items-center gap-2"><ImagePlus size={18} aria-hidden="true" /> Choose a picture</span>}
        </button>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button disabled={busy} className="btn-primary">{busy ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

export default function Categories() {
  const { isSuper } = useAdmin();
  const { data, reload } = useFetch(() => adminApi.get("/admin/categories").then((r) => r.data.data), []);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const saved = () => {
    setEditing(null);
    clearCategoryCache();
    reload();
  };

  const remove = async () => {
    try {
      const { data: res } = await adminApi.delete(`/admin/categories/${deleting.id}`);
      toast.success(res.message);
      saved();
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  };

  return (
    <div>
      <PageHeader title="Categories" description="The rooms customers browse by.">
        {isSuper && (
          <button onClick={() => setEditing({})} className="btn-primary">
            <Plus size={16} aria-hidden="true" /> New category
          </button>
        )}
      </PageHeader>

      {!data ? (
        <Skeleton className="h-60" />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.map((c) => (
            <li key={c.id} className="panel overflow-hidden">
              {c.category_img ? (
                <img src={assetUrl(c.category_img)} alt="" className="h-32 w-full object-cover" />
              ) : (
                <div className="flex h-32 items-end justify-center bg-room-living" aria-hidden="true">
                  <Drawing kind="sideboard" fabric="#7d8f6a" className="h-28" />
                </div>
              )}
              <div className="flex items-center justify-between gap-2 p-4">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-ink-soft">{plural(Number(c.product_count), "product")}</p>
                </div>
                {isSuper && (
                  <div className="flex">
                    <button onClick={() => setEditing(c)} className="rounded-lg p-2 text-ink-soft hover:bg-canvas hover:text-ink" aria-label={`Edit ${c.name}`}>
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setDeleting(c)} className="rounded-lg p-2 text-ink-soft hover:bg-clay-tint hover:text-clay" aria-label={`Delete ${c.name}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit category" : "New category"}>
        {editing && <CategoryForm key={editing.id || "new"} category={editing.id ? editing : null} onSaved={saved} onCancel={() => setEditing(null)} />}
      </Modal>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title={`Delete ${deleting?.name}?`} confirmLabel="Delete" danger onConfirm={remove}>
        Only empty categories can be deleted. Move its products to another category first.
      </ConfirmDialog>
    </div>
  );
}
