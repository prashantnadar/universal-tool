import { useRef, useState } from "react";
import { toast } from "sonner";

export function CopyInline({
  value,
  label,
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState("");
  const t = useRef<number | null>(null);
  const announce = (m: string) => {
    setMsg("");
    if (t.current) window.clearTimeout(t.current);
    t.current = window.setTimeout(() => setMsg(m), 30);
  };
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      announce(`Copied ${label || "value"} to clipboard`);
      toast.success(`Copied ${label || value}`);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      const reason = (err as Error)?.message || "clipboard unavailable";
      announce(`Copy failed: ${reason}`);
      toast.error(`Copy failed: ${reason}`);
    }
  };
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label={copied ? `Copied ${label || value}` : `Copy ${label || value} to clipboard`}
        title={copied ? "Copied" : "Copy"}
        className={`inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-1.5 text-slate-700 transition hover:border-blue-500 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 ${className}`}
      >
        {copied ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>

      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">{msg}</span>
    </>
  );
}
