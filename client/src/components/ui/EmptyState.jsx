export default function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="panel flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-moss-tint text-moss">
          <Icon size={22} aria-hidden="true" />
        </span>
      )}
      <p className="font-display text-lg font-bold">{title}</p>
      {children && <div className="mt-1.5 max-w-sm text-sm text-ink-soft">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
