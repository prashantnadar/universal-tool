import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { getProfile } from "@/lib/profile-api";

export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { isAuthenticated, user, isAdmin, plan, signOut, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState("");

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function loadProfile() {
      try {
        const profile = await getProfile();
        setProfileAvatar(profile.avatar_url ?? "");
      } catch (err) {
        console.error(err);
      }
    }

    loadProfile();
  }, [isAuthenticated]);

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

  const name =
    (user?.user_metadata?.display_name as string | undefined) ||
    user?.email ||
    "Account";

  console.log("Auth avatar:", user?.user_metadata?.avatar_url);
  console.log("Provider:", user?.app_metadata?.provider);
  console.log("Identities:", user?.identities);

  // const avatar =
  //   (user?.user_metadata?.avatar_url as string | undefined) || "";

  const googleAvatar =
    (user?.identities?.find(
      (identity) => identity.provider === "google"
    )?.identity_data as { avatar_url?: string } | undefined)?.avatar_url ?? "";

  const avatar = profileAvatar || googleAvatar;

  console.log("Full metadata:", user?.user_metadata);

  const initial = (name[0] || "?").toUpperCase();

  return (
    <div ref={ref} className={`relative ${compact ? "" : "hidden sm:block"}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account Menu"
        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 transition-all hover:border-blue-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500 dark:hover:bg-slate-800"
      >
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded-full border border-slate-200 object-cover dark:border-slate-700"
          />
        ) : (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">
            {initial}
          </span>
        )}

        <div className="flex flex-col items-start leading-tight">
          <span className="max-w-58 truncate text-sm font-semibold">
            {name}
          </span>

          {/* <span className="max-w-[120px] truncate text-xs text-slate-500 dark:text-slate-400">
            {user?.email}
          </span> */}
        </div>

        <svg
          viewBox="0 0 24 24"
          className={`h-6 w-6 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-1 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-3 dark:border-slate-800">

            {avatar ? (
              <img
                src={avatar}
                alt={name}
                className="h-12 w-12 rounded-full border border-slate-200 object-cover dark:border-slate-700"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                {initial}
              </div>
            )}

            <div className="min-w-0 flex-1">

              <div className="truncate font-semibold text-slate-900 dark:text-white">
                {name}
              </div>

              <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                {user?.email}
              </div>

              <div className="mt-2 flex flex-wrap gap-1">

                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${plan === "premium"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                >
                  {plan.toUpperCase()}
                </span>

                {isAdmin && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    ADMIN
                  </span>
                )}

              </div>

            </div>

          </div>
          <Link to="/dashboard" onClick={() => setOpen(false)} role="menuitem" className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">📊 Dashboard</Link>
          <Link to="/profile" onClick={() => setOpen(false)} role="menuitem" className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">👤 My Profile</Link>
          {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} role="menuitem" className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">🛠 Admin Panel</Link>}
          <Link to="/pricing" onClick={() => setOpen(false)} role="menuitem" className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">💎 Pricing</Link>
          <button type="button" onClick={() => { setOpen(false); void signOut(); }} role="menuitem" className="w-full rounded-md px-3 py-2 text-left text-sm text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40">🚪 Sign Out</button>
        </div>
      )
      }
    </div >
  );
}
