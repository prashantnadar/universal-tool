import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { TOOLS } from "@/lib/tools-registry";

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
        setAnnouncement("Search focused. Use arrow keys to navigate results.");
      }
    };
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, []);


  // Curated defaults: one high-usage tool from each category (text, pdf, image,
  // code, password, color, productivity) so the empty state showcases the full
  // breadth of the site instead of only text tools.
  const DEFAULT_SUGGESTION_IDS = [
    "word-count",     // text
    "pdf-merge",      // pdf
    "img-compress",   // image
    "json-format",    // code
    "pw-generate",    // password
    "color-picker",   // color
    "calculator",     // productivity
  ];

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) {
      return DEFAULT_SUGGESTION_IDS
        .map((id) => TOOLS.find((t) => t.id === id))
        .filter((t): t is (typeof TOOLS)[number] => Boolean(t));
    }
    return TOOLS.filter(
      (t) =>
        t.name.toLowerCase().includes(needle) ||
        t.description.toLowerCase().includes(needle) ||
        t.keywords.some((k) => k.includes(needle)) ||
        t.category.includes(needle),
    ).slice(0, 8);
  }, [q]);

  useEffect(() => { setActive(0); }, [q]);

  useEffect(() => {
    if (!open || !q) { setAnnouncement(""); return; }
    setAnnouncement(`${results.length} result${results.length === 1 ? "" : "s"} for ${q}`);
  }, [results.length, q, open]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) setOpen(true);
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter") {
      const t = results[active];
      if (t) {
        e.preventDefault();
        const name = t.name;
        const route = t.route;
        setOpen(false);
        setQ("");
        setAnnouncement(`Opening ${name}`);
        // Keep focus on the input so the keyboard caret stays put while the
        // route loads; do not blur or relocate focus.
        navigate({ to: route }).then(() => {
          setAnnouncement(`${name} opened`);
          inputRef.current?.focus();
        });
      }
    }
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <label htmlFor="global-search" className="sr-only">Search tools</label>
      <div className="relative">
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input
          id="global-search"
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          role="combobox"
          aria-expanded={open}
          aria-controls="global-search-listbox"
          aria-activedescendant={open && results[active] ? `gs-opt-${results[active].id}` : undefined}
          aria-autocomplete="list"
          placeholder={`Search ${TOOLS.length}+ tools... (Ctrl/⌘K)`}
          aria-label="Search all tools. Press Control or Command K to focus."
          aria-keyshortcuts="Control+K Meta+K"
          className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
        />

      </div>
      {open && results.length > 0 && (
        <div
          ref={listRef}
          id="global-search-listbox"
          role="listbox"
          aria-label="Tool suggestions"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-blue-900/10 dark:border-slate-700 dark:bg-slate-900"
        >
          {!q && <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Suggestions</div>}
          {results.map((t, i) => (
            <Link
              key={t.id}
              id={`gs-opt-${t.id}`}
              role="option"
              aria-selected={i === active}
              data-idx={i}
              to={t.route}
              onMouseEnter={() => setActive(i)}
              onClick={() => { setOpen(false); setQ(""); }}
              className={`flex items-start gap-3 rounded-xl px-3 py-2 ${i === active ? "bg-blue-50 dark:bg-slate-800" : ""} hover:bg-blue-50 dark:hover:bg-slate-800`}
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-100 text-xs font-bold uppercase text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {t.category[0]}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{t.name}</span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{t.description}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
      {open && q && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          No tools found for "{q}"
        </div>
      )}
      <div role="status" aria-live="polite" className="sr-only">{announcement}</div>
    </div>
  );
}
