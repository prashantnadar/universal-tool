import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions | UniversalTools" },
      { name: "description", content: "Read the terms and conditions for using UniversalTools' free online text, PDF, image, code and password tools." },
      { property: "og:title", content: "Terms & Conditions — UniversalTools" },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: Terms,
});

function Terms() {
  const updated = "July 1, 2026";
  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Legal</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Terms &amp; Conditions</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Last updated: {updated}</p>
        </Reveal>

        <div className="prose prose-slate mt-8 max-w-none space-y-6 text-slate-700 dark:prose-invert dark:text-slate-300">
          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">1. Acceptance</h2>
            <p>By using UniversalTools you agree to these Terms &amp; Conditions. If you don't agree, please don't use the service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. Service description</h2>
            <p>UniversalTools provides free browser-based utilities for text, PDF, image, code and password work. All tools run on your device.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">3. Acceptable use</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>Do not use the tools for illegal activity or to infringe others' rights.</li>
              <li>You are responsible for the content you process.</li>
              <li>Do not attempt to reverse engineer, disrupt, or overload the service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">4. Intellectual property</h2>
            <p>The site design, code and branding are © UniversalTools. Your content stays yours — we don't claim rights over anything you process on our tools.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">5. Disclaimer</h2>
            <p>The service is provided "as is" without warranty of any kind. We don't guarantee results will be perfect and are not liable for any loss of data. Always keep original copies of important files.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">6. Limitation of liability</h2>
            <p>To the fullest extent permitted by law, UniversalTools shall not be liable for any indirect, incidental or consequential damages arising from your use of the service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">7. Changes</h2>
            <p>We may update these Terms from time to time. Continued use of the service after changes constitutes acceptance of the new Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">8. Contact</h2>
            <p>Questions? Reach us via the <a href="/contact" className="text-blue-600 hover:underline">Contact page</a>.</p>
          </section>
        </div>
      </section>
    </Layout>
  );
}
