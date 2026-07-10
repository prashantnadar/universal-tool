import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "./Logo";
import { GlobalSearch } from "./GlobalSearch";
import { AccountMenu } from "./AccountMenu";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { TOOLS, type ToolCategory } from "@/lib/tools-registry";

const PRIMARY = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/why-choose-us", label: "Why Choose Us" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact", label: "Contact" },
] as const;

const PRODUCTS: { to: string; label: string; desc: string; emoji: string; cat: ToolCategory; mega: boolean }[] = [
  { to: "/tools/text", label: "Text Tools", desc: "Words, strings & encoders", emoji: "Aa", cat: "text", mega: false },
  { to: "/tools/pdf", label: "PDF Tools", desc: "Merge, split, protect, rotate", emoji: "PDF", cat: "pdf", mega: true },
  { to: "/tools/image", label: "Image Tools", desc: "Resize, crop, filter, convert", emoji: "IMG", cat: "image", mega: true },
  { to: "/tools/code", label: "Code Tools", desc: "JSON, JWT, regex, hashes, editor", emoji: "{}", cat: "code", mega: true },
  { to: "/tools/color", label: "Color Tools", desc: "Picker, converter, contrast, gradient", emoji: "#", cat: "color", mega: true },
  { to: "/tools/password", label: "Password Tools", desc: "Generator & strength meter", emoji: "**", cat: "password", mega: true },
  { to: "/tools/productivity", label: "Productivity Tools", desc: "Timer, calculators, converters", emoji: "⚡", cat: "productivity", mega: true },
];

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openCat, setOpenCat] = useState<ToolCategory | null>(null);

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/90">
      {/* Top bar */}
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Logo />
        <nav aria-label="Primary" className="ml-auto hidden lg:flex items-center gap-1">
          {PRIMARY.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`relative rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive(l.to)
                  ? "text-blue-700 dark:text-blue-300"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              {l.label}
              {isActive(l.to) && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400"
                />
              )}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden md:block lg:ml-6 lg:w-80">
          <GlobalSearch />
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-blue-500 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-400"
          >
            {theme === "dark" ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>
            )}
          </button>
          <AccountMenu />
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 lg:hidden dark:border-slate-700"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {mobileOpen ? <path d="M18 6 6 18M6 6l12 12"/> : <path d="M3 6h18M3 12h18M3 18h18"/>}
            </svg>
          </button>
        </div>
      </div>

      {/* Products mega-menu bar (desktop) — per-category hover dropdown */}
      <div className="hidden border-t border-slate-200/70 lg:block dark:border-slate-800/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6" onMouseLeave={() => setOpenCat(null)}>
          <div className="flex items-center gap-1 py-2">
            {PRODUCTS.map((p) => {
              const tools = TOOLS.filter((t) => t.category === p.cat);
              const open = openCat === p.cat;
              if (!p.mega) {
                return (
                  <Link
                    key={p.to}
                    to={p.to}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      isActive(p.to)
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                        : "text-slate-600 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-300"
                    }`}
                  >
                    {p.label}
                  </Link>
                );
              }
              return (
                <div
                  key={p.to}
                  className="relative"
                  onMouseEnter={() => setOpenCat(p.cat)}
                >
                  <Link
                    to={p.to}
                    aria-haspopup="true"
                    aria-expanded={open}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      isActive(p.to) || open
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                        : "text-slate-600 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-300"
                    }`}
                  >
                    {p.label}
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                  </Link>
                  <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.12 }}
                        className="absolute left-0 top-full z-30 mt-1 w-[min(720px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-blue-900/10 dark:border-slate-800 dark:bg-slate-950"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-xs font-bold text-white">{p.emoji}</span>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">{p.label}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{p.desc}</div>
                            </div>
                          </div>
                          <Link
                            to={p.to}
                            onClick={() => setOpenCat(null)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            View all →
                          </Link>
                        </div>
                        <ul className="grid grid-cols-2 gap-1 md:grid-cols-3">
                          {tools.map((t) => {
                            const [path, hash] = t.route.split("#");
                            return (
                              <li key={t.id}>
                                <Link
                                  to={path}
                                  hash={hash}
                                  onClick={() => setOpenCat(null)}
                                  title={t.description}
                                  className="block truncate rounded-lg px-3 py-1.5 text-sm text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-blue-300"
                                >
                                  {t.name}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-200 lg:hidden dark:border-slate-800"
          >
            <div className="space-y-3 px-4 py-4">
              <GlobalSearch />
              <nav aria-label="Mobile" className="grid gap-1">
                {[...PRIMARY, ...PRODUCTS].map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setMobileOpen(false)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      isActive(l.to)
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"
                    }`}
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
              <MobileAuthButtons onClick={() => setMobileOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function MobileAuthButtons({ onClick }: { onClick: () => void }) {
  const { isAuthenticated, isAdmin, signOut } = useAuth();
  if (!isAuthenticated) {
    return (
      <div className="grid grid-cols-2 gap-2 pt-2">
        <Link to="/auth" search={{ mode: "signin" }} onClick={onClick} className="rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium dark:border-slate-700 dark:text-white">Log in</Link>
        <Link to="/auth" search={{ mode: "signup" }} onClick={onClick} className="rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white">Sign up</Link>
      </div>
    );
  }
  return (
    <div className="grid gap-2 pt-2">
      <Link to="/dashboard" onClick={onClick} className="rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium dark:border-slate-700 dark:text-white">Dashboard</Link>
      {isAdmin && <Link to="/admin" onClick={onClick} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-sm font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">Admin panel</Link>}
      <button type="button" onClick={() => { onClick(); void signOut(); }} className="rounded-lg bg-red-600 px-3 py-2 text-center text-sm font-semibold text-white">Sign out</button>
    </div>
  );
}


