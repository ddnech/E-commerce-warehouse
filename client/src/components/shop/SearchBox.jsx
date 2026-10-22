import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Search } from "lucide-react";
import api from "../../lib/api";
import { rupiah } from "../../lib/format";
import { useDebounce } from "../../hooks/useDebounce";

export default function SearchBox({ className = "" }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [text, setText] = useState(params.get("q") || "");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [active, setActive] = useState(-1);
  const term = useDebounce(text, 200);
  const box = useRef(null);

  useEffect(() => {
    if (term.trim().length < 2) return setSuggestions([]);
    let cancelled = false;
    api
      .get("/products/suggest", { params: { q: term } })
      .then(({ data }) => !cancelled && setSuggestions(data.data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [term]);

  useEffect(() => {
    const close = (e) => !box.current?.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const submit = (e) => {
    e.preventDefault();
    setOpen(false);
    if (active >= 0 && suggestions[active]) return navigate(`/products/${suggestions[active].id}`);
    navigate(text.trim() ? `/shop?q=${encodeURIComponent(text.trim())}` : "/shop");
  };

  const onKeyDown = (e) => {
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Escape") setOpen(false);
  };

  return (
    <form ref={box} onSubmit={submit} role="search" className={`relative ${className}`}>
      <Search size={17} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
      <input
        type="search"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search sofas, lamps, desks…"
        aria-label="Search products"
        aria-autocomplete="list"
        className="input rounded-full bg-canvas"
        style={{ paddingLeft: "2.6rem" }}
      />
      {open && suggestions.length > 0 && (
        <ul role="listbox" className="absolute top-full right-0 left-0 z-40 mt-2 overflow-hidden rounded-2xl border border-line bg-surface py-1 shadow-lg">
          {suggestions.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setOpen(false);
                  navigate(`/products/${s.id}`);
                }}
                className={`flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left text-sm ${i === active ? "bg-canvas" : "hover:bg-canvas"}`}
              >
                <span>
                  <span className="font-medium">{s.name}</span>
                  <span className="ml-2 text-xs text-ink-soft">{s.category}</span>
                </span>
                <span className="price shrink-0 text-ink-soft">{rupiah(s.price)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
