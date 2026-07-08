import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/why-choose-us")({
  head: () => ({
    meta: [
      { title: "Why Choose UniversalTools" },
      { name: "description", content: "Privacy-first, no uploads, lightning fast and free — see why UniversalTools beats single-purpose websites." },
      { property: "og:title", content: "Why Choose UniversalTools" },
      { property: "og:url", content: "/why-choose-us" },
    ],
    links: [{ rel: "canonical", href: "/why-choose-us" }],
  }),
  component: Why,
});

const POINTS = [
  { t: "Private by default", d: "All processing happens in your browser. Files never get uploaded." },
  { t: "Ready when you are", d: "Every free tool works instantly in your browser." },
  { t: "Blazing fast", d: "No round trips, no waiting in queues, no spinners." },
  { t: "Works offline-ish", d: "Once loaded, most tools keep working without internet." },
  { t: "One home for everything", d: "Stop bookmarking ten different sites." },
  { t: "Built for mobile too", d: "Every tool is fully responsive on phones and tablets." },
];

function Why() {
  return (
    <Layout>
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <Reveal>
          <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Why teams pick UniversalTools</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">Six reasons people make us their default toolbox.</p>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {POINTS.map((p, i) => (
            <Reveal key={p.t} delay={i * 0.06}>
              <article className="h-full rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-600 text-white font-bold">{i + 1}</div>
                <h2 className="mt-4 font-bold text-slate-900 dark:text-white">{p.t}</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{p.d}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    </Layout>
  );
}
