import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { isAuthenticated, user, isAdmin, plan, signOut, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (loading) {
    return <div className="h-9 w-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" aria-hidden="true" />;
  }

  if (!isAuthenticated) {
    return (
      <>
        <Link to="/auth" search={{ mode: "signin" }} className="hidden sm:inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-400" title="Log in">Log in</Link>
        <Link to="/auth" search={{ mode: "signup" }} className="hidden sm:inline-flex items-center rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-700" title="Sign up">Sign up</Link>
      </>
    );
  }

  const name = (user?.user_metadata?.display_name as string | undefined) || user?.email || "Account";
  const initial = (name[0] || "?").toUpperCase();

  return (
    <div ref={ref} className={`relative ${compact ? "" : "hidden sm:block"}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        title="Account"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-slate-700 hover:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">{initial}</span>
        <span className="max-w-[110px] truncate">{name}</span>
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
            <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{name}</div>
            <div className="mt-0.5 flex items-center gap-1 text-[11px] font-medium">
              <span className={`rounded-full px-1.5 py-0.5 ${plan === "premium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{plan.toUpperCase()}</span>
              {isAdmin && <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">ADMIN</span>}
            </div>
          </div>
          <Link to="/dashboard" onClick={() => setOpen(false)} role="menuitem" className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">Dashboard</Link>
          {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} role="menuitem" className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">Admin panel</Link>}
          <Link to="/pricing" onClick={() => setOpen(false)} role="menuitem" className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">Pricing</Link>
          <button type="button" onClick={() => { setOpen(false); void signOut(); }} role="menuitem" className="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">Sign out</button>
        </div>
      )}
    </div>
  );
}
