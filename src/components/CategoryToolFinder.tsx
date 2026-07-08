import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { TOOLS, type ToolCategory } from "@/lib/tools-registry";
import { Reveal } from "@/components/Reveal";

const CATS: { id: "all" | ToolCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "text", label: "Text" },
  { id: "pdf", label: "PDF" },
  { id: "image", label: "Image" },
  { id: "code", label: "Code" },
  { id: "password", label: "Password" },
  { id: "color", label: "Color" },
  { id: "productivity", label: "Productivity" },
];

const PAGE = 12;

export function CategoryToolFinder() {
  const [cat, setCat] = useState<"all" | ToolCategory>("all");
  const [q, setQ] = useState("");
  const [visible, setVisible] = useState(PAGE);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return TOOLS.filter((t) => {
      if (cat !== "all" && t.category !== cat) return false;
      if (!needle) return true;
      return (
        t.name.toLowerCase().includes(needle) ||
        t.description.toLowerCase().includes(needle) ||
        t.keywords.some((k) => k.toLowerCase().includes(needle))
      );
    });
  }, [cat, q]);

  const shown = filtered.slice(0, visible);

  return (
    <Reveal>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setVisible(PAGE);
              }}
              placeholder="Search tools by name, keyword, or description…"
              aria-label="Search tools"
              title="Search tools"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Clear search"
                title="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter by category">
          {CATS.map((c) => {
            const active = cat === c.id;
            return (
              <button
                key={c.id}
                role="tab"
                aria-selected={active}
                title={`Show ${c.label} tools`}
                aria-label={`Show ${c.label} tools`}
                onClick={() => {
                  setCat(c.id);
                  setVisible(PAGE);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 min-h-[80px]">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No tools match “{q}”. Try a different keyword.
            </p>
          ) : (
            <motion.div
              layout
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              <AnimatePresence mode="popLayout">
                {shown.map((t, i) => (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.02, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link
                      to={t.route}
                      title={`${t.name} — ${t.description}`}
                      aria-label={`Open ${t.name}`}
                      className="group flex h-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-[10px] font-bold uppercase text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {t.category.slice(0, 3)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {t.name}
                        </span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                          {t.description}
                        </span>
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {filtered.length > visible && (
          <div className="mt-5 flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">
              Showing {shown.length} of {filtered.length}
            </span>
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE)}
              title="Load more tools"
              aria-label="Load more tools"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-900 transition hover:border-blue-400 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              Show more
            </button>
          </div>
        )}
      </div>
    </Reveal>
  );
}
