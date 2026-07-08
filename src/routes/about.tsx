import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { Reveal } from "@/components/Reveal";
import { SITE_URL, imageMeta } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — UniversalTools" },
      { name: "description", content: "UniversalTools brings together 30+ browser-based utilities for text, PDFs and images, all built around privacy and speed." },
      { property: "og:title", content: "About UniversalTools" },
      { property: "og:description", content: "Why we built UniversalTools — one privacy-first home for everyday text, PDF and image tasks." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/about` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "About UniversalTools" },
      { name: "twitter:description", content: "Why we built UniversalTools — one privacy-first home for everyday text, PDF and image tasks." },
      ...imageMeta(),
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/about` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "About UniversalTools",
          url: `${SITE_URL}/about`,
          description: "About UniversalTools — one privacy-first home for everyday text, PDF and image tasks.",
          publisher: { "@type": "Organization", name: "UniversalTools", url: SITE_URL },
        }),
      },
    ],
  }),
  component: About,
});



function About() {
  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <Reveal>
          <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>About UniversalTools</h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            We were tired of opening five different websites just to count words, merge a PDF and crop an image. So we built one home for everything.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="mt-12 text-2xl font-bold text-slate-900 dark:text-white">Our mission</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Make everyday digital chores fast, free and private. No uploads, no ads, no learning curve.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <h2 className="mt-12 text-2xl font-bold text-slate-900 dark:text-white">How it works</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Every tool runs inside your browser using modern web APIs. That means instant results and zero file uploads.
          </p>
        </Reveal>
      </section>
    </Layout>
  );
}
