type SpinnerProps = {
  size?: number;
  label?: string;
  className?: string;
};

export function Spinner({ size = 28, label = "Loading", className = "" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`inline-flex items-center justify-center ${className}`}
    >
      <span
        className="animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400"
        style={{ width: size, height: size }}
      />
      <span className="sr-only">{label}…</span>
    </span>
  );
}

export function FullPageSpinner({ label = "Loading page" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 bg-white dark:bg-slate-950"
    >
      <Spinner size={44} label={label} />
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}…</p>
    </div>
  );
}
