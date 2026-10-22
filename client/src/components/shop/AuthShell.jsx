import { Drawing } from "../art/ProductArt";

/** Two-column card used by the login, sign-up and password pages. */
export default function AuthShell({ title, subtitle, children, art = "armchair", fabric = "#4f6b5a" }) {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 sm:px-6 lg:pt-16">
      <div className="panel grid overflow-hidden md:grid-cols-[1fr_1.1fr]">
        <div className="hidden flex-col justify-end bg-room-living p-8 md:flex" aria-hidden="true">
          <Drawing kind={art} fabric={fabric} className="mx-auto w-4/5" />
          <p className="mt-6 font-display text-2xl font-bold">Good furniture, sent from close by.</p>
        </div>
        <div className="p-6 sm:p-10">
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-ink-soft">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
