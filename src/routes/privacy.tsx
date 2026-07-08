import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | UniversalTools" },
      { name: "description", content: "How UniversalTools handles your data. Files never leave your device — all processing runs in your browser." },
      { property: "og:title", content: "Privacy Policy — UniversalTools" },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: Privacy,
});

function Privacy() {
  const updated = "July 1, 2026";
  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Legal</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Last updated: {updated}</p>
        </Reveal>

        <div className="prose prose-slate mt-8 max-w-none space-y-6 text-slate-700 dark:prose-invert dark:text-slate-300">
          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">1. Overview</h2>
            <p>UniversalTools ("we", "our", "us") is a free web app that provides text, PDF, image, code and password utilities. We are committed to protecting your privacy. This page explains what we collect, why, and your rights.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. Files never leave your device</h2>
            <p>All tools run entirely inside your browser using JavaScript. Your PDFs, images, and text are <strong>never uploaded to our servers</strong>. Processing happens locally on your device.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">3. Data we store locally</h2>
            <p>We use your browser's <code>localStorage</code> to remember:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>Your theme preference (light or dark).</li>
              <li>Anonymous tool-usage counts, used only to rank "trending" tools for you.</li>
              <li>Recently opened tools for quick access.</li>
            </ul>
            <p>You can clear this at any time by clearing site data in your browser.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">4. Account data</h2>
            <p>If you create an account (coming soon), we collect your email address and an encrypted password hash to authenticate you. We never sell your data.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">5. Cookies &amp; analytics</h2>
            <p>We use privacy-friendly analytics to understand aggregate traffic patterns. No personally identifying information is stored in cookies for advertising.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">6. Your rights</h2>
            <p>You have the right to access, correct, or delete any personal data we hold. Contact us via the <a href="/contact" className="text-blue-600 hover:underline">Contact page</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">7. Changes</h2>
            <p>We may update this policy. Material changes will be highlighted on this page.</p>
          </section>
        </div>
      </section>
    </Layout>
  );
}
