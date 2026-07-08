import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`} aria-label="Universal Tools home">
      <span
        aria-hidden="true"
        className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 text-white font-bold shadow-md shadow-blue-500/30"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        UT
      </span>
      <span
        className="hidden sm:inline text-lg font-bold tracking-tight text-slate-900 dark:text-white"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        Universal<span className="text-blue-600 dark:text-blue-400">Tools</span>
      </span>
    </Link>
  );
}
