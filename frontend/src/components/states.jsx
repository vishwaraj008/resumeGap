// Shared loading / empty / error states — design reference: stitch sheet #10.

export function Spinner({ className = "" }) {
  return (
    <span
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary ${className}`}
    />
  );
}

export function LoadingBlock({ label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <Spinner className="h-8 w-8" />
      <p className="text-sm font-medium text-ink-soft">{label}</p>
    </div>
  );
}

// Shimmer skeleton bar.
export function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-shimmer rounded-md bg-[length:200%_100%] ${className}`}
      style={{
        backgroundImage:
          "linear-gradient(90deg, #eef2f7 0%, #f8fafc 50%, #eef2f7 100%)",
      }}
    />
  );
}

export function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-danger/10 p-4 ring-1 ring-danger/20">
      <span className="ms text-[20px] text-danger">error</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-ink">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-1 text-sm font-semibold text-primary hover:underline"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

// Soft amber banner for degraded (non-fatal) states, e.g. cache unavailable.
export function DegradedBanner({ message }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-warning/10 p-4 ring-1 ring-warning/20">
      <span className="ms text-[20px] text-warning">warning</span>
      <p className="flex-1 text-sm font-medium text-ink">{message}</p>
    </div>
  );
}

export function EmptyState({ icon = "inbox", title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-surface px-6 py-16 text-center shadow-card">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light">
        <span className="ms text-[32px] text-primary">{icon}</span>
      </div>
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      {subtitle && <p className="max-w-sm text-sm text-ink-soft">{subtitle}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
