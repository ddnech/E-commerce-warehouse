import { ChevronLeft, ChevronRight } from "lucide-react";

function pageList(current, total) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap-" + p);
    out.push(p);
  });
  return out;
}

export default function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const base = "inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm";
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1">
      <button
        className={`${base} text-ink-soft hover:bg-surface disabled:opacity-40`}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={18} />
      </button>
      {pageList(page, totalPages).map((p) =>
        typeof p === "string" ? (
          <span key={p} className="px-1 text-ink-soft">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={`${base} ${p === page ? "bg-moss font-semibold text-white" : "text-ink hover:bg-surface"}`}
          >
            {p}
          </button>
        )
      )}
      <button
        className={`${base} text-ink-soft hover:bg-surface disabled:opacity-40`}
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
