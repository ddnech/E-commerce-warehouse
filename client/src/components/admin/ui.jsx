import { Search } from "lucide-react";
import { TONE } from "../../lib/format";

export function PageHeader({ title, description, children }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = "moss" }) {
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-ink-soft">{label}</p>
        {Icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${TONE[tone]}`}>
            <Icon size={16} aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search", className = "sm:w-64" }) {
  return (
    <label className={`relative block ${className}`}>
      <span className="sr-only">{placeholder}</span>
      <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input" style={{ paddingLeft: "2.25rem" }} />
    </label>
  );
}

/** A scrollable table card. Pass <thead>/<tbody> as children. */
export function Table({ children, loading }) {
  return (
    <div className={`panel overflow-x-auto ${loading ? "opacity-60" : ""}`}>
      <table className="w-full text-left text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_th]:text-xs [&_th]:font-semibold [&_th]:text-ink-soft [&_thead]:border-b [&_thead]:border-line [&_tbody_tr]:border-b [&_tbody_tr]:border-line [&_tbody_tr:last-child]:border-0">
        {children}
      </table>
    </div>
  );
}

export function EmptyRow({ colSpan, children = "Nothing here yet." }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12! text-center text-ink-soft">
        {children}
      </td>
    </tr>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="scrollbar-none mb-5 flex gap-1 overflow-x-auto" role="tablist">
      {tabs.map(([key, label, count]) => (
        <button
          key={key}
          role="tab"
          aria-selected={value === key}
          onClick={() => onChange(key)}
          className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm ${value === key ? "bg-ink text-white" : "text-ink-soft hover:bg-ink/5"}`}
        >
          {label}
          {count > 0 && <span className={`rounded-full px-1.5 text-xs ${value === key ? "bg-white/20" : "bg-ink/8"}`}>{count}</span>}
        </button>
      ))}
    </div>
  );
}
