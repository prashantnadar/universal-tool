import { useRef, useState } from "react";
import { toast } from "sonner";
import { InlineSpinner } from "./Skeleton";

const btnBase =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-blue-500 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50";

function useAnnouncer() {
  const [msg, setMsg] = useState("");
  const t = useRef<number | null>(null);
  const announce = (m: string) => {
    setMsg("");
    if (t.current) window.clearTimeout(t.current);
    // Defer so SR notices the change even when message repeats.
    t.current = window.setTimeout(() => setMsg(m), 30);
  };
  const node = (
    <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {msg}
    </span>
  );
  return { announce, node };
}

export function CopyButton({
  getText,
  label = "Copy",
  className = "",
  busy = false,
}: {
  getText: () => string;
  label?: string;
  className?: string;
  busy?: boolean;
}) {
  const [working, setWorking] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const { announce, node } = useAnnouncer();
  const disabled = busy || working;
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        aria-busy={disabled}
        onClick={async () => {
          const t = getText();
          if (!t) {
            announce("Copy failed: nothing to copy");
            toast.error("Nothing to copy");
            return;
          }
          setWorking(true);
          announce(`Copying ${t.length} characters to clipboard…`);
          try {
            await navigator.clipboard.writeText(t);
            announce(`Copied ${t.length} characters to clipboard`);
            toast.success("Copied to clipboard");
          } catch (err) {
            const reason = (err as Error)?.message || "clipboard unavailable";
            announce(`Copy failed: ${reason}`);
            toast.error(`Copy failed: ${reason}`);
          } finally {
            setWorking(false);
            // Return focus to the trigger so keyboard users keep their place.
            requestAnimationFrame(() => btnRef.current?.focus());
          }
        }}
        className={`${btnBase} ${className}`}
        aria-label={label}
      >
        {disabled ? (
          <InlineSpinner />
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
        {disabled && working ? "Copying…" : label}
      </button>
      {node}
    </>
  );
}

export function DownloadButton({
  getText,
  filename,
  type = "text/plain",
  label = "Download",
  className = "",
  busy = false,
}: {
  getText: () => string;
  filename: string;
  type?: string;
  label?: string;
  className?: string;
  busy?: boolean;
}) {
  const [working, setWorking] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const { announce, node } = useAnnouncer();
  const disabled = busy || working;
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        aria-busy={disabled}
        onClick={() => {
          const t = getText();
          if (!t) {
            announce("Download failed: nothing to download");
            toast.error("Nothing to download");
            return;
          }
          setWorking(true);
          announce(`Preparing download: ${filename}…`);
          try {
            const blob = new Blob([t], { type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            announce(`Download in progress: ${filename}`);
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            announce(`Download completed: ${filename} (${blob.size} bytes)`);
            toast.success(`Downloaded ${filename}`);
          } catch (err) {
            const reason = (err as Error)?.message || "browser blocked the download";
            announce(`Download failed: ${reason}`);
            toast.error(`Download failed: ${reason}`);
          } finally {
            setTimeout(() => {
              setWorking(false);
              requestAnimationFrame(() => btnRef.current?.focus());
            }, 200);
          }
        }}
        className={`${btnBase} ${className}`}
        aria-label={label}
      >
        {disabled ? (
          <InlineSpinner />
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
        )}
        {disabled && working ? "Downloading…" : label}
      </button>
      {node}
    </>
  );
}
