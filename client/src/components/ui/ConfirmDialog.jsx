import { useState } from "react";
import Modal from "./Modal";

/**
 * A yes/no dialog. `onConfirm` may return a promise; the dialog closes when it resolves.
 * Pass `withReason` to ask for an optional reason, which is handed to onConfirm.
 */
export default function ConfirmDialog({ open, onClose, title, children, confirmLabel, cancelLabel = "Keep it", danger = false, withReason = false, reasonLabel = "Reason", onConfirm }) {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");

  const confirm = async () => {
    setBusy(true);
    try {
      const ok = await onConfirm(reason.trim());
      if (ok !== false) {
        setReason("");
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="text-sm text-ink-soft">{children}</div>
      {withReason && (
        <>
          <label htmlFor="confirm-reason" className="mt-5 mb-1.5 block text-sm font-medium text-ink">
            {reasonLabel} <span className="font-normal text-ink-soft">(the customer will see this)</span>
          </label>
          <textarea id="confirm-reason" rows={3} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} className="input resize-none" />
        </>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <button className="btn-secondary" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </button>
        <button className={danger ? "btn-danger" : "btn-primary"} onClick={confirm} disabled={busy}>
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
