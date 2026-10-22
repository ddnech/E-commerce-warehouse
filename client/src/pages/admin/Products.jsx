import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { adminApi, assetUrl, errorMessage } from "../../lib/api";
import { rupiah } from "../../lib/format";
import { useFetch } from "../../hooks/useFetch";
import { useDebounce } from "../../hooks/useDebounce";
import { useCategories, clearCategoryCache } from "../../hooks/useCategories";
import { useAdmin } from "../../auth/AdminContext";
import { PageHeader, SearchInput, Table, EmptyRow } from "../../components/admin/ui";
import ProductArt from "../../components/art/ProductArt";
import { Badge } from "../../components/ui/StatusBadge";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Field from "../../components/ui/Field";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";

const MAX_IMAGES = 6;
const toInt = (msg, min) => z.coerce.number({ message: msg }).int(msg).min(min, msg);

const schema = z.object({
  name: z.string().trim().min(1, "Give the product a name.").max(60, "Keep it under 60 characters."),
  category_id: z.coerce.number().min(1, "Pick a category."),
  price: toInt("Price is a whole number in rupiah, at least 1.000.", 1000),
  weight: toInt("Weight is in grams, at least 1.", 1),
  description: z.string().trim().min(10, "Write a sentence or two about it."),
});

function Thumb({ src, onRemove, label }) {
  return (
    <div className="relative h-20 w-20">
      <img src={src} alt={label} className="h-20 w-20 rounded-lg object-cover" />
      <button type="button" onClick={onRemove} className="absolute -top-2 -right-2 rounded-full bg-ink p-1 text-white" aria-label={`Remove ${label}`}>
        <X size={12} />
      </button>
    </div>
  );
}

function ProductForm({ product, onSaved, onCancel }) {
  const categories = useCategories();
  const fileInput = useRef(null);
  const [current, setCurrent] = useState(product?.images || []);
  const [files, setFiles] = useState([]);
  const previews = useMemo(() => files.map((f) => ({ f, url: URL.createObjectURL(f) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: product?.name || "",
      category_id: product?.category?.id || "",
      price: product?.price || "",
      weight: product?.weight || "",
      description: product?.description || "",
    },
  });

  const pick = (e) => {
    const chosen = [...(e.target.files || [])].filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    const room = MAX_IMAGES - current.length - files.length;
    if (chosen.length > room) toast.error(`A product can have ${MAX_IMAGES} images. Only the first ${Math.max(0, room)} were added.`);
    setFiles((list) => [...list, ...chosen.slice(0, Math.max(0, room))]);
  };

  const removeExisting = async (image) => {
    try {
      const { data } = await adminApi.delete(`/admin/products/${product.id}/images/${image.id}`);
      setCurrent(data.data.images);
      toast.success(data.message);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const onSubmit = async (values) => {
    try {
      let saved;
      if (product) {
        ({ data: saved } = await adminApi.patch(`/admin/products/${product.id}`, values));
        if (files.length) {
          const form = new FormData();
          files.forEach((f) => form.append("images", f));
          await adminApi.post(`/admin/products/${product.id}/images`, form);
        }
      } else {
        const form = new FormData();
        Object.entries(values).forEach(([k, v]) => form.append(k, v));
        files.forEach((f) => form.append("images", f));
        ({ data: saved } = await adminApi.post("/admin/products", form));
      }
      toast.success(saved.message);
      clearCategoryCache();
      onSaved();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5 sm:grid-cols-2">
      <Field label="Name" htmlFor="name" error={errors.name?.message} className="sm:col-span-2">
        <input id="name" className="input" {...register("name")} />
      </Field>
      <Field label="Category" htmlFor="category_id" error={errors.category_id?.message}>
        <select id="category_id" className="input" {...register("category_id")}>
          <option value="">Choose…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (Rp)" htmlFor="price" error={errors.price?.message}>
          <input id="price" inputMode="numeric" className="input" {...register("price")} />
        </Field>
        <Field label="Weight (g)" htmlFor="weight" error={errors.weight?.message}>
          <input id="weight" inputMode="numeric" className="input" {...register("weight")} />
        </Field>
      </div>
      <Field label="Description" htmlFor="description" error={errors.description?.message} className="sm:col-span-2">
        <textarea id="description" rows={4} className="input" {...register("description")} />
      </Field>

      <div className="sm:col-span-2">
        <p className="mb-2 text-sm font-medium">Photos</p>
        <div className="flex flex-wrap gap-3">
          {current.map((img, i) => (
            <Thumb key={img.id} src={assetUrl(img.url)} label={`photo ${i + 1}`} onRemove={() => removeExisting(img)} />
          ))}
          {previews.map(({ f, url }, i) => (
            <Thumb key={url} src={url} label={`new photo ${i + 1}`} onRemove={() => setFiles((list) => list.filter((x) => x !== f))} />
          ))}
          {current.length + files.length < MAX_IMAGES && (
            <button type="button" onClick={() => fileInput.current.click()} className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line text-xs text-ink-soft hover:border-moss hover:text-moss">
              <ImagePlus size={18} aria-hidden="true" /> Add
            </button>
          )}
        </div>
        <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={pick} className="hidden" />
        <p className="mt-2 text-xs text-ink-soft">Up to {MAX_IMAGES} photos, 5 MB each. Without photos, the shop shows a drawing instead.</p>
      </div>

      <div className="flex justify-end gap-3 sm:col-span-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button disabled={isSubmitting} className="btn-primary">{isSubmitting ? "Saving…" : product ? "Save product" : "Add product"}</button>
      </div>
    </form>
  );
}

export default function Products() {
  const { isSuper } = useAdmin();
  const categories = useCategories();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // {} for new
  const [deleting, setDeleting] = useState(null);
  const search = useDebounce(q.trim(), 350);

  const { data, loading, reload } = useFetch(
    () => adminApi.get("/admin/products", { params: { q: search || undefined, category: category || undefined, status: status || undefined, page } }).then((r) => r.data),
    [search, category, status, page]
  );

  const toggle = async (p) => {
    try {
      const { data: res } = await adminApi.patch(`/admin/products/${p.id}/status`, { is_active: !p.is_active });
      toast.success(res.message);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const remove = async () => {
    try {
      const { data: res } = await adminApi.delete(`/admin/products/${deleting.id}`);
      toast.success(res.message);
      clearCategoryCache();
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  };

  const openEdit = async (p) => {
    // The list doesn't include every image field, so load the full product.
    try {
      const { data: res } = await adminApi.get(`/admin/products/${p.id}`);
      setEditing(res.data);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div>
      <PageHeader title="Products" description={isSuper ? "Everything in the catalog." : "The catalog is managed by the super admin. You can see it here."}>
        {isSuper && (
          <button onClick={() => setEditing({})} className="btn-primary">
            <Plus size={16} aria-hidden="true" /> New product
          </button>
        )}
      </PageHeader>

      <div className="mb-5 flex flex-wrap gap-2">
        <SearchInput value={q} onChange={(v) => (setQ(v), setPage(1))} placeholder="Product name" />
        <select value={category} onChange={(e) => (setCategory(e.target.value), setPage(1))} className="input w-auto" aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => (setStatus(e.target.value), setPage(1))} className="input w-auto" aria-label="Status">
          <option value="">On sale and hidden</option>
          <option value="active">On sale</option>
          <option value="inactive">Hidden</option>
        </select>
      </div>

      <Table loading={loading && !!data}>
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Price</th>
            <th>Free stock</th>
            <th>Sold</th>
            <th>Status</th>
            {isSuper && <th className="text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {!data && <EmptyRow colSpan={7}>Loading…</EmptyRow>}
          {data?.data.length === 0 && <EmptyRow colSpan={7}>No products match.</EmptyRow>}
          {data?.data.map((p) => (
            <tr key={p.id}>
              <td>
                <div className="flex items-center gap-3">
                  <ProductArt product={p} className="h-11 w-11 shrink-0" rounded="rounded-lg" />
                  <span className="font-medium">{p.name}</span>
                </div>
              </td>
              <td className="text-ink-soft">{p.category?.name}</td>
              <td className="whitespace-nowrap">{rupiah(p.price)}</td>
              <td className={p.available <= 0 ? "font-semibold text-clay" : p.available <= 5 ? "font-semibold text-teak" : ""}>{p.available}</td>
              <td className="text-ink-soft">{p.sold}</td>
              <td>
                {isSuper ? (
                  <button onClick={() => toggle(p)} title="Click to change">
                    <Badge tone={p.is_active ? "moss" : "muted"}>{p.is_active ? "On sale" : "Hidden"}</Badge>
                  </button>
                ) : (
                  <Badge tone={p.is_active ? "moss" : "muted"}>{p.is_active ? "On sale" : "Hidden"}</Badge>
                )}
              </td>
              {isSuper && (
                <td>
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(p)} className="rounded-lg p-2 text-ink-soft hover:bg-canvas hover:text-ink" aria-label={`Edit ${p.name}`}>
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setDeleting(p)} className="rounded-lg p-2 text-ink-soft hover:bg-clay-tint hover:text-clay" aria-label={`Delete ${p.name}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </Table>
      {data && <Pagination page={page} totalPages={data.pagination.totalPages} onChange={setPage} />}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? `Edit ${editing.name}` : "New product"} wide>
        {editing && (
          <ProductForm
            key={editing.id || "new"}
            product={editing.id ? editing : null}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
          />
        )}
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title={`Delete ${deleting?.name}?`} confirmLabel="Delete" danger onConfirm={remove}>
        It disappears from the shop, carts and wishlists. Past orders still show it. If you only want to stop selling it for a while, hide it instead.
      </ConfirmDialog>
    </div>
  );
}
