export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-pulse rounded-md bg-slate-200/70 dark:bg-slate-700/50 ${className}`}
    />
  );
}

export function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading results">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === count - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

export function InlineSpinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
