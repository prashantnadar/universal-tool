import { Link } from "@tanstack/react-router";

export function NotFound() {
  return (
    <main
      role="main"
      aria-labelledby="nf-title"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 py-16 dark:from-slate-950 dark:via-slate-950 dark:to-blue-950/40"
    >
      {/* Decorative animated blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 animate-pulse rounded-full bg-blue-400/20 blur-3xl dark:bg-blue-500/20" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 animate-pulse rounded-full bg-fuchsia-400/20 blur-3xl dark:bg-fuchsia-500/20" style={{ animationDelay: "1s" }} />
        <div className="absolute left-1/2 top-1/3 h-56 w-56 -translate-x-1/2 animate-pulse rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-500/10" style={{ animationDelay: "2s" }} />
      </div>

      <section className="relative z-10 mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400">
          Error 404
        </p>

        <h1
          id="nf-title"
          className="mt-4 select-none bg-gradient-to-br from-slate-900 via-blue-600 to-fuchsia-600 bg-clip-text text-[7rem] font-black leading-none text-transparent sm:text-[10rem] dark:from-white dark:via-blue-300 dark:to-fuchsia-300"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          4<span className="inline-block animate-spin" style={{ animationDuration: "6s" }}>0</span>4
        </h1>

        <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
          This tool went exploring without us.
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-base text-slate-600 dark:text-slate-400">
          The page you’re looking for doesn’t exist, was moved, or maybe never did. Let’s get you back to something useful.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            aria-label="Return to homepage"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-transform hover:scale-[1.03] hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            ← Back to home
          </Link>
          <Link
            to="/tools/text"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          >
            Browse tools
          </Link>
        </div>

        <nav aria-label="Popular destinations" className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Popular</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {[
              { to: "/tools/text", label: "Text tools" },
              { to: "/tools/pdf", label: "PDF tools" },
              { to: "/tools/image", label: "Image tools" },
              { to: "/tools/code", label: "Code tools" },
              { to: "/tools/password", label: "Password tools" },
            ].map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-700 backdrop-blur transition hover:border-blue-400 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-300"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </section>
    </main>
  );
}
