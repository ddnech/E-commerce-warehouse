import { ORDER_STATUS, TONE } from "../../lib/format";

export function Badge({ tone = "muted", children }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TONE[tone]}`}>{children}</span>;
}

export default function StatusBadge({ status }) {
  const s = ORDER_STATUS[status?.key] || { label: status?.name || "Unknown", tone: "muted" };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
