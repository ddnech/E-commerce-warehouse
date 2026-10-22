import { useState } from "react";
import { useSearchParams } from "react-router";
import { SearchX, SlidersHorizontal, X } from "lucide-react";
import api from "../../lib/api";
import { plural } from "../../lib/format";
import { useFetch } from "../../hooks/useFetch";
import { useCategories } from "../../hooks/useCategories";
import { useShop } from "../../auth/ShopContext";
import { ProductGrid } from "../../components/shop/ProductCard";
import Pagination from "../../components/ui/Pagination";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";

const SORTS = [
  ["newest", "Newest"],
  ["popular", "Most popular"],
  ["price_asc", "Price, low to high"],
  ["price_desc", "Price, high to low"],
  ["name", "Name, A to Z"],
];

const PRICE_PRESETS = [
  ["Under Rp 1 jt", "", "1000000"],
  ["Rp 1 – 3 jt", "1000000", "3000000"],
  ["Rp 3 – 5 jt", "3000000", "5000000"],
  ["Over Rp 5 jt", "5000000", ""],
];

function Filters({ params, set, categories, onDone }) {
  const [min, setMin] = useState(params.get("min") || "");
  const [max, setMax] = useState(params.get("max") || "");
  const category = params.get("category") || "";

  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="mb-3 text-sm font-semibold">Room</legend>
        <div className="space-y-1">
          {[{ id: "", name: "All rooms" }, ...categories].map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-ink/5">
              <span className="flex items-center gap-2.5">
                <input type="radio" name="category" checked={category === String(c.id)} onChange={() => (set({ category: c.id }), onDone?.())} className="accent-moss" />
                {c.name}
              </span>
              {c.product_count !== undefined && <span className="text-xs text-ink-soft">{c.product_count}</span>}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-semibold">Price</legend>
        <div className="flex flex-wrap gap-2">
          {PRICE_PRESETS.map(([label, lo, hi]) => {
            const on = (params.get("min") || "") === lo && (params.get("max") || "") === hi;
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setMin(on ? "" : lo);
                  setMax(on ? "" : hi);
                  set({ min: on ? "" : lo, max: on ? "" : hi });
                }}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${on ? "border-moss bg-moss-tint text-moss" : "border-line hover:border-ink-soft/40"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            set({ min, max });
            onDone?.();
          }}
        >
          <input value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} placeholder="Min" inputMode="numeric" className="input" aria-label="Minimum price" />
          <span className="text-ink-soft">–</span>
          <input value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} placeholder="Max" inputMode="numeric" className="input" aria-label="Maximum price" />
          <button className="btn-secondary btn-sm">Go</button>
        </form>
      </fieldset>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
        <input type="checkbox" checked={params.get("in_stock") === "true"} onChange={(e) => set({ in_stock: e.target.checked ? "true" : "" })} className="h-4 w-4 accent-moss" />
        Only show items in stock
      </label>
    </div>
  );
}

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const categories = useCategories();
  const { user } = useShop();
  const [showFilters, setShowFilters] = useState(false);
  const page = Number(params.get("page")) || 1;

  const set = (changes) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === "" || value === null || value === undefined) next.delete(key);
      else next.set(key, value);
    }
    if (!("page" in changes)) next.delete("page");
    setParams(next);
  };

  const query = Object.fromEntries(params);
  const { data, loading } = useFetch(() => api.get("/products", { params: { ...query, size: 12 } }).then((r) => r.data), [params.toString(), user?.id]);

  const category = categories.find((c) => String(c.id) === params.get("category"));
  const q = params.get("q");
  const title = q ? `Results for “${q}”` : category ? category.name : "All furniture";
  const activeFilters = ["category", "min", "max", "in_stock", "q"].filter((k) => params.get(k));

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-2 text-ink-soft" aria-live="polite">
            {data ? plural(data.pagination.totalItems, "product") : " "}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary lg:hidden" onClick={() => setShowFilters(true)}>
            <SlidersHorizontal size={16} aria-hidden="true" /> Filters
          </button>
          <select value={params.get("sort") || "newest"} onChange={(e) => set({ sort: e.target.value })} className="input w-auto rounded-full" aria-label="Sort by">
            {SORTS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {q && (
            <button className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-xs font-medium text-white" onClick={() => set({ q: "" })}>
              “{q}” <X size={13} aria-hidden="true" />
            </button>
          )}
          {category && (
            <button className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-xs font-medium text-white" onClick={() => set({ category: "" })}>
              {category.name} <X size={13} aria-hidden="true" />
            </button>
          )}
          <button className="text-xs font-semibold text-moss hover:underline" onClick={() => setParams(params.get("sort") ? { sort: params.get("sort") } : {})}>
            Clear all
          </button>
        </div>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[15rem_1fr]">
        <aside className="hidden lg:block">
          <Filters params={params} set={set} categories={categories} />
        </aside>

        <div>
          {loading && !data ? (
            <div className="grid grid-cols-2 gap-6 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="aspect-[4/3]" />
              ))}
            </div>
          ) : data?.data.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Nothing matches that"
              action={
                <button className="btn-secondary" onClick={() => setParams({})}>
                  Clear filters
                </button>
              }
            >
              Try a different word, or widen the price range.
            </EmptyState>
          ) : (
            <div className={loading ? "opacity-60 transition-opacity" : ""}>
              <ProductGrid products={data.data} columns="sm:grid-cols-2 xl:grid-cols-3" />
              <Pagination page={page} totalPages={data.pagination.totalPages} onChange={(p) => set({ page: p })} />
            </div>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setShowFilters(false)} />
          <div className="absolute inset-y-0 right-0 w-[min(22rem,90vw)] overflow-y-auto bg-surface p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">Filters</h2>
              <button onClick={() => setShowFilters(false)} className="rounded-full p-2 hover:bg-ink/5" aria-label="Close filters">
                <X size={18} />
              </button>
            </div>
            <Filters params={params} set={set} categories={categories} onDone={() => setShowFilters(false)} />
            <button className="btn-primary mt-8 w-full" onClick={() => setShowFilters(false)}>
              Show results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
