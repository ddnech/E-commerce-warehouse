/** Label + control + error message. Pass the input as children. */
export default function Field({ label, htmlFor, error, hint, children, className = "" }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-clay" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-ink-soft">{hint}</p>
      )}
    </div>
  );
}
