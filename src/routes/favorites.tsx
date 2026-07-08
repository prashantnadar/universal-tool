import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Reveal } from "@/components/Reveal";
import { TOOLS } from "@/lib/tools-registry";
import { getFavorites, subscribeFavorites, toggleFavorite } from "@/lib/favorites";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "Favorites — Your Saved Tools | UniversalTools" },
      { name: "description", content: "Quick access to the UniversalTools tools you've bookmarked." },
      { property: "og:title", content: "Your Favorite Tools — UniversalTools" },
      { property: "og:url", content: "/favorites" },
    ],
    links: [{ rel: "canonical", href: "/favorites" }],
  }),
  component: Favorites,
});

function Favorites() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    setIds(getFavorites());
    return subscribeFavorites(() => setIds(getFavorites()));
  }, []);

  const items = ids.map((id) => TOOLS.find((t) => t.id === id)).filter(Boolean) as typeof TOOLS;

  return (
    <Layout>
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <Reveal>
          <header className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-amber-600">Favorites</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Your saved tools</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Tap the ⭐ Save button on any tool to add it here.</p>
          </header>
        </Reveal>

        {items.length === 0 ? (
          <Reveal>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-900">
              <p className="text-slate-600 dark:text-slate-400">You haven't saved any tools yet.</p>
              <Link to="/tools/text" className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Browse tools</Link>
            </div>
          </Reveal>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((t, i) => (
              <Reveal key={t.id} delay={i * 0.04}>
                <div className="group h-full rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold uppercase text-blue-700 dark:bg-blue-950 dark:text-blue-300">{t.category}</span>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(t.id)}
                      aria-label={`Remove ${t.name} from favorites`}
                      className="text-slate-400 hover:text-amber-500"
                      title="Remove"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="m12 17.27 6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                    </button>
                  </div>
                  <Link to={t.route} className="mt-3 block">
                    <h2 className="font-semibold text-slate-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300">{t.name}</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t.description}</p>
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
