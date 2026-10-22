import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/** Small wrapper around <dialog>: focus trapping and Esc to close come for free. */
export default function Modal({ open, onClose, title, children, wide = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto w-[calc(100%-2rem)] ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40`}
    >
      {open && (
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 className="text-xl font-bold">{title}</h2>
            <button onClick={onClose} className="rounded p-1 text-ink-soft hover:bg-canvas" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
