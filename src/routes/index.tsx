import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Type, FileText, Image as ImageIcon, Code2, KeyRound, Timer } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Reveal } from "@/components/Reveal";
import { CategoryToolFinder } from "@/components/CategoryToolFinder";
import { TOOLS, type ToolMeta } from "@/lib/tools-registry";
import { getRecent } from "@/lib/recently-used";
import { getTopUsed, subscribeUsage } from "@/lib/usage-tracking";
import { SITE_URL, imageMeta } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UniversalTools – Free Online PDF, Image, Text, Code & Password Tools" },
      { name: "description", content: "110+ free online tools: word counter, PDF merger, image resizer, JSON formatter, password generator and more. Runs in your browser." },
      { property: "og:title", content: "UniversalTools — Free Online Tools" },
      { property: "og:description", content: "110+ free tools for text, PDF, image, code and password work. No uploads, no sign-up." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "UniversalTools — Free Online Tools" },
      { name: "twitter:description", content: "110+ free tools for text, PDF, image, code and password work. No uploads, no sign-up." },
      ...imageMeta(),
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "UniversalTools",
          url: `${SITE_URL}/`,
          description: "110+ free online tools for text, PDF, image, code and password work.",
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "UniversalTools",
          url: SITE_URL,
          logo: `${SITE_URL}/favicon.png`,
          contactPoint: {
            "@type": "ContactPoint",
            email: "hello.pncreation@gmail.com",
            telephone: "+91-96533-86506",
            contactType: "customer support",
          },
        }),
      },
    ],
  }),
  component: Home,
});



const CATS = [
  { to: "/tools/text", title: "Text Tools", desc: "Counters, case converters, cleaners, encoders", count: TOOLS.filter(t => t.category === "text").length, accent: "from-blue-500 to-cyan-400", Icon: Type },
  { to: "/tools/pdf", title: "PDF Tools", desc: "Merge, split, password, rotate, reorder", count: TOOLS.filter(t => t.category === "pdf").length, accent: "from-blue-600 to-indigo-500", Icon: FileText },
  { to: "/tools/image", title: "Image Tools", desc: "Resize, crop, filter, convert, metadata", count: TOOLS.filter(t => t.category === "image").length, accent: "from-sky-500 to-blue-600", Icon: ImageIcon },
  { to: "/tools/code", title: "Code Tools", desc: "JSON, XML, JWT, regex, hashes, UUIDs", count: TOOLS.filter(t => t.category === "code").length, accent: "from-indigo-500 to-purple-500", Icon: Code2 },
  { to: "/tools/password", title: "Password Tools", desc: "Generator, strength meter, passphrases, PINs", count: TOOLS.filter(t => t.category === "password").length, accent: "from-emerald-500 to-teal-500", Icon: KeyRound },
  { to: "/tools/productivity", title: "Productivity Tools", desc: "Timer, to-do, calculators, unit converters", count: 20, accent: "from-amber-500 to-orange-500", Icon: Timer },
] as const;

const FALLBACK_TRENDING: ToolMeta[] = [
  TOOLS.find((t) => t.id === "pdf-merge")!,
  TOOLS.find((t) => t.id === "word-count")!,
  TOOLS.find((t) => t.id === "pw-generate")!,
];

function Home() {
  const [recent, setRecent] = useState<ToolMeta[]>([]);
  const [trending, setTrending] = useState<{ tool: ToolMeta; count: number }[]>([]);

  useEffect(() => {
    const refresh = () => {
      setRecent(getRecent().map((id) => TOOLS.find((t) => t.id === id)).filter(Boolean) as ToolMeta[]);
      const top = getTopUsed(3).map(({ id, count }) => {
        const tool = TOOLS.find((t) => t.id === id);
        return tool ? { tool, count } : null;
      }).filter(Boolean) as { tool: ToolMeta; count: number }[];
      setTrending(top);
    };
    refresh();
    return subscribeUsage(refresh);
  }, []);

  const trendingDisplay = trending.length > 0
    ? trending
    : FALLBACK_TRENDING.map((t) => ({ tool: t, count: 0 }));

  return (
    <Layout>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-linear-to-b from-blue-50/60 via-white to-white dark:border-slate-800 dark:from-blue-950/40 dark:via-slate-950 dark:to-slate-950">
        <div className="absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(closest-side,rgba(37,99,235,0.18),transparent)]" aria-hidden />
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/70 px-3 py-1 text-xs font-semibold text-blue-700 backdrop-blur dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> {TOOLS.length}+ tools · runs in your browser · no uploads
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              One toolkit for <span className="bg-linear-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">everything you write,</span> <span className="bg-linear-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">code and share.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
              Text, PDF, image, code and password utilities — all in your browser. Nothing leaves your device.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href="#find-a-tool" onClick={(e) => { e.preventDefault(); document.getElementById("find-a-tool")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700">Explore tools →</a>
              <Link to="/pricing" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-blue-500 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-white">See pricing</Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FIND A TOOL — category-filtered search */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6" aria-labelledby="find-a-tool">
        <Reveal>
          <h2 id="find-a-tool" className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Find a tool</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Search across every tool, or filter by category for instant suggestions.</p>
        </Reveal>
        <div className="mt-6">
          <CategoryToolFinder />
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Reveal>
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Browse by category</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Six focused categories covering every kind of tool you might need.</p>
        </Reveal>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CATS.map((c, i) => {
            const Icon = c.Icon;
            return (
              <Reveal key={c.to} delay={i * 0.06}>
                <Link to={c.to} title={`${c.title} — ${c.desc}`} className="group block h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 dark:border-slate-800 dark:bg-slate-900">
                  <div className={`mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${c.accent} text-white shadow-md`} aria-hidden>
                    <Icon size={24} strokeWidth={2.2} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{c.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{c.desc}</p>
                  <div className="mt-4 flex items-center justify-between text-sm font-semibold text-blue-600 dark:text-blue-400">
                    <span>{c.count > 0 ? `${c.count} tools` : "Explore"}</span>
                    <span aria-hidden className="transition group-hover:translate-x-1">→</span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* TRENDING — real usage */}
      <section className="border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <Reveal>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Trending on your device</h2>
                <p className="mt-2 text-slate-600 dark:text-slate-400">{trending.length > 0 ? "Tools you've used the most." : "Use a tool to see it ranked here."}</p>
              </div>
            </div>
          </Reveal>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {trendingDisplay.map((p, i) => (
              <Reveal key={p.tool.id} delay={i * 0.08}>
                <Link to={p.tool.route} className="group flex h-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-100 text-sm font-bold uppercase text-blue-700 dark:bg-blue-950 dark:text-blue-300">{p.tool.category.slice(0, 3)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-900 dark:text-white">{p.tool.name}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{p.count > 0 ? `${p.count} use${p.count === 1 ? "" : "s"} so far` : p.tool.description}</span>
                  </span>
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{p.count > 0 ? `#${i + 1}` : "Popular"}</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* RECENT */}
      {recent.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <Reveal>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Recently used</h2>
          </Reveal>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((t) => (
              <Link key={t.id} to={t.route} className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{t.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{t.description}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* WHY */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { t: "Private by design", d: "Everything runs in your browser. Your files never touch a server." },
            { t: "Lightning fast", d: "No uploads, no queues. Tools run instantly on your device." },
            { t: "Fair pricing", d: "Most tools are free. A few advanced tools unlock with Pro." },
          ].map((f, i) => (
            <Reveal key={f.t} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-600 text-white">✓</div>
                <h3 className="mt-4 font-bold text-slate-900 dark:text-white">{f.t}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{f.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </Layout>
  );
}
