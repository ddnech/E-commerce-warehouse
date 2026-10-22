import { Minus, Plus } from "lucide-react";

export default function QuantityStepper({ value, onChange, min = 1, max = 99, disabled = false, size = "md" }) {
  const box = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-surface">
      <button type="button" className={`${box} flex items-center justify-center rounded-full text-ink-soft hover:text-ink disabled:opacity-40`} onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label="Fewer">
        <Minus size={15} />
      </button>
      <span className="min-w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className={`${box} flex items-center justify-center rounded-full text-ink-soft hover:text-ink disabled:opacity-40`} onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="More">
        <Plus size={15} />
      </button>
    </div>
  );
}
