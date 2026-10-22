import { Link } from "react-router";

export default function Logo({ to = "/", light = false, suffix }) {
  return (
    <Link to={to} className="flex items-center gap-2" aria-label="Furnifor home">
      <img src="/favicon.svg" alt="" className="h-8 w-8" />
      <span className={`font-display text-2xl leading-none font-extrabold tracking-tight ${light ? "text-white" : "text-ink"}`}>furnifor</span>
      {suffix && <span className={`ml-1 text-sm font-medium ${light ? "text-white/60" : "text-ink-soft"}`}>{suffix}</span>}
    </Link>
  );
}
